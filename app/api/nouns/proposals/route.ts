import { NextResponse } from "next/server"

const NOUNS_GOVERNOR = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d"

const RPC_URLS = [
  process.env.ALCHEMY_API_KEY
    ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : null,
  "https://eth.llamarpc.com",
  "https://cloudflare-eth.com",
  "https://rpc.ankr.com/eth",
  "https://ethereum-rpc.publicnode.com",
  "https://1rpc.io/eth",
].filter(Boolean) as string[]

const PROPOSAL_STATES = [
  "Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed",
]

// Raw RPC call with fallback across multiple endpoints
async function rpcCall(method: string, params: any[]): Promise<any> {
  let lastError: Error | null = null
  for (const url of RPC_URLS) {
    try {
      console.log("[v0] Trying RPC:", url, "method:", method)
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
      })
      if (!res.ok) {
        console.log("[v0] RPC returned non-ok status:", res.status, "from", url)
        continue
      }
      const json = await res.json()
      if (json.error) {
        console.log("[v0] RPC returned error:", json.error.message, "from", url)
        lastError = new Error(json.error.message)
        continue
      }
      console.log("[v0] RPC success from:", url)
      return json.result
    } catch (e: any) {
      console.log("[v0] RPC fetch failed:", e.message, "from", url)
      lastError = e
      continue
    }
  }
  throw lastError || new Error("All RPC endpoints failed")
}

// ABI-encode a function call
function encodeFunctionCall(selector: string, ...args: bigint[]): string {
  let data = selector
  for (const arg of args) {
    data += arg.toString(16).padStart(64, "0")
  }
  return data
}

// Decode hex to BigInt at a specific 32-byte slot
function decodeSlot(hex: string, slot: number): bigint {
  const start = 2 + slot * 64
  return BigInt("0x" + hex.slice(start, start + 64))
}

function decodeAddress(hex: string, slot: number): string {
  const start = 2 + slot * 64
  return "0x" + hex.slice(start + 24, start + 64)
}

function decodeBool(hex: string, slot: number): boolean {
  return decodeSlot(hex, slot) !== 0n
}

// Function selectors
const PROPOSAL_COUNT_SEL = "0xda35c664"
const PROPOSALS_SEL = "0x013cf08b"
const STATE_SEL = "0x3e4f49e6"

// Fetch proposal description from event logs
async function getProposalDescription(proposalId: number, creationBlock: bigint): Promise<string> {
  try {
    // ProposalCreated event topic
    const eventTopic = "0x7d84a6263ae0d98d3329bd7b46bb4e8d6f98cd35a7adb45c274c8b7fd5ebd5e0"
    const blockHex = "0x" + creationBlock.toString(16)

    const logs = await rpcCall("eth_getLogs", [{
      address: NOUNS_GOVERNOR,
      topics: [eventTopic],
      fromBlock: blockHex,
      toBlock: blockHex,
    }])

    if (logs && logs.length > 0) {
      for (const log of logs) {
        // The proposal ID is the first indexed topic (but in Nouns it's in data)
        // ProposalCreated event has the description as the last dynamic parameter in data
        // Let's decode the data to find the right proposal
        const data = log.data as string
        if (!data || data.length < 66) continue

        // First 32 bytes of data is the proposal ID
        const logProposalId = Number(BigInt("0x" + data.slice(2, 66)))
        if (logProposalId !== proposalId) continue

        // The data contains ABI-encoded: id, proposer, targets, values, signatures, calldatas, startBlock, endBlock, description
        // Description is a dynamic type, its offset is at slot 8 (9th parameter, index 8)
        // Each slot is 32 bytes = 64 hex chars
        try {
          // Slot 8 contains the offset to the description data
          const descOffset = Number(BigInt("0x" + data.slice(2 + 8 * 64, 2 + 9 * 64)))
          const descLenStart = 2 + descOffset * 2
          const descLen = Number(BigInt("0x" + data.slice(descLenStart, descLenStart + 64)))
          const descHex = data.slice(descLenStart + 64, descLenStart + 64 + descLen * 2)

          // Decode hex to UTF-8 string
          const bytes = new Uint8Array(descLen)
          for (let i = 0; i < descLen; i++) {
            bytes[i] = parseInt(descHex.slice(i * 2, i * 2 + 2), 16)
          }
          const description = new TextDecoder().decode(bytes)
          if (description.length > 0) return description
        } catch {
          // Failed to decode, continue
        }
      }
    }
  } catch {
    // Silently fail
  }
  return ""
}

async function fetchSingleProposal(id: number) {
  const [proposalResult, stateResult] = await Promise.all([
    rpcCall("eth_call", [
      { to: NOUNS_GOVERNOR, data: encodeFunctionCall(PROPOSALS_SEL, BigInt(id)) },
      "latest",
    ]),
    rpcCall("eth_call", [
      { to: NOUNS_GOVERNOR, data: encodeFunctionCall(STATE_SEL, BigInt(id)) },
      "latest",
    ]),
  ])

  const proposer = decodeAddress(proposalResult, 1)
  const quorumVotes = decodeSlot(proposalResult, 3)
  const eta = decodeSlot(proposalResult, 4)
  const startBlock = decodeSlot(proposalResult, 5)
  const endBlock = decodeSlot(proposalResult, 6)
  const forVotes = decodeSlot(proposalResult, 7)
  const againstVotes = decodeSlot(proposalResult, 8)
  const abstainVotes = decodeSlot(proposalResult, 9)
  const canceled = decodeBool(proposalResult, 10)
  const vetoed = decodeBool(proposalResult, 11)
  const executed = decodeBool(proposalResult, 12)
  const creationBlock = decodeSlot(proposalResult, 14)
  const stateNumber = Number(BigInt(stateResult))

  // Try to get description from event logs
  const description = await getProposalDescription(id, creationBlock)

  return {
    id,
    proposer,
    quorumVotes: quorumVotes.toString(),
    eta: eta.toString(),
    startBlock: startBlock.toString(),
    endBlock: endBlock.toString(),
    forVotes: forVotes.toString(),
    againstVotes: againstVotes.toString(),
    abstainVotes: abstainVotes.toString(),
    canceled,
    vetoed,
    executed,
    creationBlock: creationBlock.toString(),
    state: PROPOSAL_STATES[stateNumber] || "Unknown",
    stateNumber,
    description: description || `Nouns DAO Proposal ${id}`,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proposalId = searchParams.get("id")
  const limit = parseInt(searchParams.get("limit") || "20")
  const statusFilter = searchParams.get("status") || "all"

  try {
    if (proposalId) {
      const proposal = await fetchSingleProposal(parseInt(proposalId))
      return NextResponse.json(proposal)
    } else {
      // Get total proposal count
      const countResult = await rpcCall("eth_call", [
        { to: NOUNS_GOVERNOR, data: PROPOSAL_COUNT_SEL },
        "latest",
      ])
      const totalCount = Number(BigInt(countResult))

      const proposals = []
      const batchSize = 5
      let fetched = 0

      for (let i = totalCount; i >= 1 && fetched < limit; i -= batchSize) {
        const batch = []
        for (let j = 0; j < batchSize && (i - j) >= 1 && fetched + batch.length < limit; j++) {
          batch.push(fetchSingleProposal(i - j))
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
          const filtered = results.filter((p) => allowed.includes(p.state))
          proposals.push(...filtered)
          fetched += filtered.length
        } else {
          proposals.push(...results)
          fetched += results.length
        }
      }

      return NextResponse.json({ proposals, totalCount })
    }
  } catch (error: any) {
    console.error("Error fetching Nouns proposals:", error?.message || error)
    return NextResponse.json(
      { error: "Failed to fetch proposals", details: error?.message },
      { status: 500 },
    )
  }
}
