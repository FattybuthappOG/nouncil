import { NextResponse } from "next/server"
import { createPublicClient, http, parseAbiItem } from "viem"
import { mainnet } from "viem/chains"

const NOUNS_GOVERNOR = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" as const
const DEPLOYMENT_BLOCK = 12985453n

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY
const RPC_URL = ALCHEMY_KEY 
  ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : "https://eth.llamarpc.com"

const client = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL),
})

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

const descriptionCache = new Map<number, string>()

const PROPOSAL_CREATED_EVENT = parseAbiItem(
  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)"
)

async function getProposalDescription(proposalId: number, creationBlock: bigint): Promise<string> {
  if (descriptionCache.has(proposalId)) {
    return descriptionCache.get(proposalId)!
  }

  try {
    const logs = await client.getLogs({
      address: NOUNS_GOVERNOR,
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
    // Silently fail
  }

  return `Nouns DAO Proposal ${proposalId}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proposalId = searchParams.get("id")
  const limit = parseInt(searchParams.get("limit") || "20")
  const statusFilter = searchParams.get("status") || "all"

  try {
    if (proposalId) {
      const id = parseInt(proposalId)
      
      const [proposalData, stateNumber] = await Promise.all([
        client.readContract({
          address: NOUNS_GOVERNOR,
          abi: GOVERNOR_ABI,
          functionName: "proposals",
          args: [BigInt(id)],
        }),
        client.readContract({
          address: NOUNS_GOVERNOR,
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
      const count = await client.readContract({
        address: NOUNS_GOVERNOR,
        abi: GOVERNOR_ABI,
        functionName: "proposalCount",
      }) as bigint

      const totalCount = Number(count)
      const proposals = []
      
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
                  address: NOUNS_GOVERNOR,
                  abi: GOVERNOR_ABI,
                  functionName: "proposals",
                  args: [BigInt(propId)],
                }),
                client.readContract({
                  address: NOUNS_GOVERNOR,
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
        
        if (statusFilter !== "all") {
          const statusMap: Record<string, string[]> = {
            active: ["Pending", "Active", "Queued"],
            executed: ["Executed"],
            defeated: ["Defeated"],
            vetoed: ["Vetoed"],
            canceled: ["Canceled"],
          }
          const allowed = statusMap[statusFilter] || []
          proposals.push(...results.filter(p => allowed.includes(p.state)))
        } else {
          proposals.push(...results)
        }
      }

      return NextResponse.json({
        proposals,
        totalCount,
      })
    }
  } catch (error) {
    console.error("Error fetching Nouns proposals:", error)
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 })
  }
}
