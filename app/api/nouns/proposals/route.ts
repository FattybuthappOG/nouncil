import { NextResponse } from "next/server"

// Multiple subgraph endpoints with fallback
const SUBGRAPH_URLS = [
  "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
  "https://api.thegraph.com/subgraphs/name/nounsdao/nouns-subgraph",
]

const NOUNS_GOVERNOR = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d"

const RPC_URLS = [
  "https://ethereum-rpc.publicnode.com",
  "https://cloudflare-eth.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
]

const PROPOSAL_STATES = [
  "Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed",
]

// Query subgraph with automatic fallback across endpoints
async function querySubgraph(query: string): Promise<any> {
  for (const url of SUBGRAPH_URLS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!response.ok) continue
      const json = await response.json()
      if (json.errors || !json.data) continue
      return json.data
    } catch {
      continue
    }
  }
  return null
}

// Single RPC call with fallback (only used for individual proposal lookups)
async function rpcCall(method: string, params: any[]): Promise<any> {
  for (const url of RPC_URLS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) continue
      const json = await res.json()
      if (json.error) continue
      return json.result
    } catch {
      continue
    }
  }
  throw new Error("All RPC endpoints failed")
}

function encodeFunctionCall(selector: string, ...args: bigint[]): string {
  let data = selector
  for (const arg of args) {
    data += arg.toString(16).padStart(64, "0")
  }
  return data
}

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

// Fetch proposal list via subgraph (efficient single query)
async function fetchProposalsFromSubgraph(limit: number, statusFilter: string) {
  // Build filter
  let statusWhere = ""
  if (statusFilter === "active") statusWhere = ', where: { status_in: ["ACTIVE", "PENDING", "QUEUED"] }'
  else if (statusFilter === "executed") statusWhere = ', where: { status: "EXECUTED" }'
  else if (statusFilter === "defeated") statusWhere = ', where: { status: "DEFEATED" }'
  else if (statusFilter === "vetoed") statusWhere = ', where: { status: "VETOED" }'
  else if (statusFilter === "canceled") statusWhere = ', where: { status: "CANCELLED" }'

  const data = await querySubgraph(`{
    proposals(first: ${limit}, orderBy: createdTimestamp, orderDirection: desc${statusWhere}) {
      id
      description
      proposer { id }
      signers { id }
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      status
      createdTimestamp
      createdBlock
      startBlock
      endBlock
      createdTransactionHash
      targets
      values
      signatures
      calldatas
    }
  }`)

  if (!data?.proposals) return null

  const totalData = await querySubgraph(`{
    proposals(first: 1000${statusWhere}) { id }
  }`)
  const totalCount = totalData?.proposals?.length || data.proposals.length

  return {
    proposals: data.proposals.map((p: any) => ({
      id: Number(p.id),
      proposer: p.proposer?.id || "0x0",
      signers: p.signers?.map((s: any) => s.id) || [],
      description: p.description || `Proposal ${p.id}`,
      forVotes: p.forVotes || "0",
      againstVotes: p.againstVotes || "0",
      abstainVotes: p.abstainVotes || "0",
      quorumVotes: p.quorumVotes || "0",
      status: p.status || "UNKNOWN",
      stateNumber: statusToStateNumber(p.status),
      startBlock: p.startBlock || "0",
      endBlock: p.endBlock || "0",
      createdTimestamp: p.createdTimestamp,
      createdBlock: p.createdBlock,
      createdTransactionHash: p.createdTransactionHash,
      targets: p.targets || [],
      values: p.values || [],
      signatures: p.signatures || [],
      calldatas: p.calldatas || [],
    })),
    totalCount,
  }
}

// Fetch single proposal via subgraph
async function fetchSingleProposalFromSubgraph(id: number) {
  const data = await querySubgraph(`{
    proposal(id: "${id}") {
      id
      description
      proposer { id }
      signers { id }
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      status
      createdTimestamp
      createdBlock
      startBlock
      endBlock
      createdTransactionHash
      targets
      values
      signatures
      calldatas
    }
  }`)

  if (!data?.proposal) return null

  const p = data.proposal
  return {
    id: Number(p.id),
    proposer: p.proposer?.id || "0x0",
    signers: p.signers?.map((s: any) => s.id) || [],
    description: p.description || `Proposal ${p.id}`,
    forVotes: p.forVotes || "0",
    againstVotes: p.againstVotes || "0",
    abstainVotes: p.abstainVotes || "0",
    quorumVotes: p.quorumVotes || "0",
    status: p.status || "UNKNOWN",
    stateNumber: statusToStateNumber(p.status),
    startBlock: p.startBlock || "0",
    endBlock: p.endBlock || "0",
    createdTimestamp: p.createdTimestamp,
    createdBlock: p.createdBlock,
    createdTransactionHash: p.createdTransactionHash,
    targets: p.targets || [],
    values: p.values || [],
    signatures: p.signatures || [],
    calldatas: p.calldatas || [],
  }
}

function statusToStateNumber(status: string): number {
  const map: Record<string, number> = {
    PENDING: 0, ACTIVE: 1, CANCELLED: 2, DEFEATED: 3,
    SUCCEEDED: 4, QUEUED: 5, EXPIRED: 6, EXECUTED: 7, VETOED: 8,
  }
  return map[status] ?? 1
}

// Fetch single proposal from RPC (last resort fallback - only 2-3 calls)
async function fetchSingleProposalFromRPC(id: number) {
  const PROPOSALS_SEL = "0x013cf08b"
  const STATE_SEL = "0x3e4f49e6"

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
  const startBlock = decodeSlot(proposalResult, 5)
  const endBlock = decodeSlot(proposalResult, 6)
  const forVotes = decodeSlot(proposalResult, 7)
  const againstVotes = decodeSlot(proposalResult, 8)
  const abstainVotes = decodeSlot(proposalResult, 9)
  const creationBlock = decodeSlot(proposalResult, 14)
  const stateNumber = Number(BigInt(stateResult))

  // Try to get description from event logs (single RPC call)
  let description = `Nouns DAO Proposal ${id}`
  try {
    const eventTopic = "0x7d84a6263ae0d98d3329bd7b46bb4e8d6f98cd35a7adb45c274c8b7fd5ebd5e0"
    const blockHex = "0x" + creationBlock.toString(16)
    const logs = await rpcCall("eth_getLogs", [{
      address: NOUNS_GOVERNOR,
      topics: [eventTopic],
      fromBlock: blockHex,
      toBlock: blockHex,
    }])
    if (logs?.length > 0) {
      for (const log of logs) {
        const data = log.data as string
        if (!data || data.length < 66) continue
        const logId = Number(BigInt("0x" + data.slice(2, 66)))
        if (logId !== id) continue
        try {
          const descOffset = Number(BigInt("0x" + data.slice(2 + 8 * 64, 2 + 9 * 64)))
          const descLenStart = 2 + descOffset * 2
          const descLen = Number(BigInt("0x" + data.slice(descLenStart, descLenStart + 64)))
          const descHex = data.slice(descLenStart + 64, descLenStart + 64 + descLen * 2)
          const bytes = new Uint8Array(descLen)
          for (let i = 0; i < descLen; i++) {
            bytes[i] = parseInt(descHex.slice(i * 2, i * 2 + 2), 16)
          }
          const decoded = new TextDecoder().decode(bytes)
          if (decoded.length > 0) description = decoded
        } catch { /* skip */ }
      }
    }
  } catch { /* description stays as fallback */ }

  return {
    id,
    proposer,
    signers: [],
    description,
    forVotes: forVotes.toString(),
    againstVotes: againstVotes.toString(),
    abstainVotes: abstainVotes.toString(),
    quorumVotes: "0",
    status: PROPOSAL_STATES[stateNumber] || "Unknown",
    stateNumber,
    startBlock: startBlock.toString(),
    endBlock: endBlock.toString(),
    creationBlock: creationBlock.toString(),
    createdTransactionHash: "",
    targets: [],
    values: [],
    signatures: [],
    calldatas: [],
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proposalId = searchParams.get("id")
  const limit = parseInt(searchParams.get("limit") || "20")
  const statusFilter = searchParams.get("status") || "all"

  try {
    if (proposalId) {
      // Single proposal - try subgraph first, then RPC
      const subgraphResult = await fetchSingleProposalFromSubgraph(parseInt(proposalId))
      if (subgraphResult) {
        return NextResponse.json(subgraphResult)
      }
      // RPC fallback (only 2-3 calls for a single proposal)
      const rpcResult = await fetchSingleProposalFromRPC(parseInt(proposalId))
      return NextResponse.json(rpcResult)
    } else {
      // Proposal list - try subgraph first
      const subgraphResult = await fetchProposalsFromSubgraph(limit, statusFilter)
      if (subgraphResult) {
        return NextResponse.json(subgraphResult)
      }

      // RPC fallback - only get IDs and basic state (minimal calls)
      const PROPOSAL_COUNT_SEL = "0xda35c664"
      const countResult = await rpcCall("eth_call", [
        { to: NOUNS_GOVERNOR, data: PROPOSAL_COUNT_SEL },
        "latest",
      ])
      const totalCount = Number(BigInt(countResult))

      // Just return IDs without full data to avoid rate limiting
      const ids: number[] = []
      for (let i = totalCount; i >= 1 && ids.length < limit; i--) {
        ids.push(i)
      }

      return NextResponse.json({
        proposals: ids.map(id => ({
          id,
          description: `Proposal ${id}`,
          proposer: "0x0",
          forVotes: "0",
          againstVotes: "0",
          abstainVotes: "0",
          quorumVotes: "0",
          status: "UNKNOWN",
          stateNumber: 1,
          startBlock: "0",
          endBlock: "0",
        })),
        totalCount,
      })
    }
  } catch (error: any) {
    console.error("Error fetching Nouns proposals:", error?.message || error)
    return NextResponse.json(
      { error: "Failed to fetch proposals", details: error?.message },
      { status: 500 },
    )
  }
}
