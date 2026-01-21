import { NextResponse } from "next/server"
import { createPublicClient, http, parseAbiItem } from "viem"
import { mainnet } from "viem/chains"

const LILNOUNS_GOVERNOR = "0x5d2C31ce16924C2a71D317e5BbFd5ce387854039" as const

// Lil Nouns Governor deployment block (approx)
const DEPLOYMENT_BLOCK = 15133985n

// Use Alchemy with API key from environment, fallback to public RPC
const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
const RPC_URL = ALCHEMY_KEY 
  ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : "https://eth.llamarpc.com"

const client = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL),
})

// Governor ABI for reading
const GOVERNOR_ABI = [
  {
    inputs: [],
    name: "proposalCount",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "proposalId", type: "uint256" }],
    name: "proposals",
    outputs: [
      { name: "id", type: "uint256" },
      { name: "proposer", type: "address" },
      { name: "proposalThreshold", type: "uint256" },
      { name: "quorumVotes", type: "uint256" },
      { name: "eta", type: "uint256" },
      { name: "startBlock", type: "uint256" },
      { name: "endBlock", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "againstVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
      { name: "canceled", type: "bool" },
      { name: "vetoed", type: "bool" },
      { name: "executed", type: "bool" },
      { name: "totalSupply", type: "uint256" },
      { name: "creationBlock", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "proposalId", type: "uint256" }],
    name: "state",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const PROPOSAL_STATES = [
  "Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed"
]

// Cache for proposal descriptions (in-memory for this session)
const descriptionCache = new Map<number, string>()

// ProposalCreated event signature
const PROPOSAL_CREATED_EVENT = parseAbiItem(
  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)"
)

async function getProposalDescription(proposalId: number, creationBlock: bigint): Promise<string> {
  // Check cache first
  if (descriptionCache.has(proposalId)) {
    return descriptionCache.get(proposalId)!
  }

  try {
    // Search in a very small range (same block only) to avoid RPC limits
    const logs = await client.getLogs({
      address: LILNOUNS_GOVERNOR,
      event: PROPOSAL_CREATED_EVENT,
      fromBlock: creationBlock,
      toBlock: creationBlock,
    })

    for (const log of logs) {
      if (log.args.id === BigInt(proposalId)) {
        const description = log.args.description || ""
        descriptionCache.set(proposalId, description)
        return description
      }
    }
  } catch (error) {
    // Silently fail and return default description
  }

  return `Lil Nouns Proposal ${proposalId}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proposalId = searchParams.get("id")
  const limit = parseInt(searchParams.get("limit") || "20")

  try {
    if (proposalId) {
      // Fetch single proposal
      const id = parseInt(proposalId)
      
      const [proposalData, stateNumber] = await Promise.all([
        client.readContract({
          address: LILNOUNS_GOVERNOR,
          abi: GOVERNOR_ABI,
          functionName: "proposals",
          args: [BigInt(id)],
        }),
        client.readContract({
          address: LILNOUNS_GOVERNOR,
          abi: GOVERNOR_ABI,
          functionName: "state",
          args: [BigInt(id)],
        }),
      ])

      const description = await getProposalDescription(id, proposalData[14])

      return NextResponse.json({
        id,
        proposer: proposalData[1],
        quorumVotes: proposalData[3].toString(),
        eta: proposalData[4].toString(),
        startBlock: proposalData[5].toString(),
        endBlock: proposalData[6].toString(),
        forVotes: proposalData[7].toString(),
        againstVotes: proposalData[8].toString(),
        abstainVotes: proposalData[9].toString(),
        canceled: proposalData[10],
        vetoed: proposalData[11],
        executed: proposalData[12],
        creationBlock: proposalData[14].toString(),
        state: PROPOSAL_STATES[stateNumber] || "Unknown",
        stateNumber,
        description,
      })
    } else {
      // Fetch list of proposals
      const count = await client.readContract({
        address: LILNOUNS_GOVERNOR,
        abi: GOVERNOR_ABI,
        functionName: "proposalCount",
      }) as bigint

      const totalCount = Number(count)
      const proposals = []
      
      // Fetch proposals in parallel batches
      const batchSize = 5
      const startId = totalCount
      const endId = Math.max(1, totalCount - limit + 1)

      for (let i = startId; i >= endId; i -= batchSize) {
        const batch = []
        for (let j = 0; j < batchSize && (i - j) >= endId; j++) {
          const propId = i - j
          batch.push(
            (async () => {
              const [proposalData, stateNumber] = await Promise.all([
                client.readContract({
                  address: LILNOUNS_GOVERNOR,
                  abi: GOVERNOR_ABI,
                  functionName: "proposals",
                  args: [BigInt(propId)],
                }),
                client.readContract({
                  address: LILNOUNS_GOVERNOR,
                  abi: GOVERNOR_ABI,
                  functionName: "state",
                  args: [BigInt(propId)],
                }),
              ])

              const description = await getProposalDescription(propId, proposalData[14])

              return {
                id: propId,
                proposer: proposalData[1],
                quorumVotes: proposalData[3].toString(),
                forVotes: proposalData[7].toString(),
                againstVotes: proposalData[8].toString(),
                abstainVotes: proposalData[9].toString(),
                state: PROPOSAL_STATES[stateNumber] || "Unknown",
                stateNumber,
                description,
                startBlock: proposalData[5].toString(),
                endBlock: proposalData[6].toString(),
              }
            })()
          )
        }

        const results = await Promise.all(batch)
        proposals.push(...results)
      }

      return NextResponse.json({
        proposals,
        totalCount,
      })
    }
  } catch (error) {
    console.error("Error fetching Lil Nouns proposals:", error)
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 })
  }
}
