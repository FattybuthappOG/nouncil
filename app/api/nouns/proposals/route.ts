import { NextResponse } from "next/server"

const NOUNS_GOVERNOR = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d"

// Subgraph endpoints to try (primary data source)
const SUBGRAPH_URLS = [
  "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
  "https://api.thegraph.com/subgraphs/name/nounsdao/nouns-subgraph",
]

// RPC endpoints for contract fallback (use batch requests to minimize calls)
const RPC_URLS = [
  process.env.ALCHEMY_API_KEY
    ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : null,
  "https://eth.llamarpc.com",
  "https://cloudflare-eth.com",
  "https://ethereum-rpc.publicnode.com",
  "https://1rpc.io/eth",
].filter(Boolean) as string[]

const PROPOSAL_STATES = [
  "Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed",
]

// ---- Subgraph approach (primary) ----
async function fetchFromSubgraph(query: string): Promise<any> {
  for (const url of SUBGRAPH_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      if (!res.ok) continue
      const json = await res.json()
      if (json.errors || !json.data) continue
      return json.data
    } catch {
      continue
    }
  }
  return null
}

async function fetchProposalListFromSubgraph(limit: number, statusFilter: string) {
  const data = await fetchFromSubgraph(`{
    proposals(first: 1000, orderBy: createdTimestamp, orderDirection: desc) {
      id
      status
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      endBlock
      startBlock
      createdBlock
      proposer { id }
      description
      signers { id }
      createdTransactionHash
      targets
      values
      signatures
      calldatas
    }
  }`)
  
  if (!data?.proposals) return null

  let filtered = data.proposals
  if (statusFilter === "active") {
    filtered = filtered.filter((p: any) => p.status === "ACTIVE" || p.status === "PENDING" || p.status === "QUEUED")
  } else if (statusFilter === "executed") {
    filtered = filtered.filter((p: any) => p.status === "EXECUTED")
  } else if (statusFilter === "defeated") {
    filtered = filtered.filter((p: any) => p.status === "DEFEATED")
  } else if (statusFilter === "vetoed") {
    filtered = filtered.filter((p: any) => p.status === "VETOED")
  } else if (statusFilter === "canceled") {
    filtered = filtered.filter((p: any) => p.status === "CANCELLED")
  }

  return {
    proposals: filtered.slice(0, limit).map((p: any) => ({
      id: Number(p.id),
      proposer: p.proposer?.id || "",
      quorumVotes: p.quorumVotes || "0",
      startBlock: p.startBlock || "0",
      endBlock: p.endBlock || "0",
      forVotes: p.forVotes || "0",
      againstVotes: p.againstVotes || "0",
      abstainVotes: p.abstainVotes || "0",
      state: p.status ? p.status.charAt(0) + p.status.slice(1).toLowerCase() : "Unknown",
      stateNumber: PROPOSAL_STATES.indexOf(p.status ? p.status.charAt(0) + p.status.slice(1).toLowerCase() : "") || 0,
      description: p.description || `Nouns DAO Proposal ${p.id}`,
      createdTransactionHash: p.createdTransactionHash || "",
      targets: p.targets || [],
      values: p.values || [],
      signatures: p.signatures || [],
      calldatas: p.calldatas || [],
      sponsors: p.signers?.map((s: any) => s.id) || [],
    })),
    totalCount: filtered.length,
  }
}

async function fetchSingleProposalFromSubgraph(id: number) {
  const data = await fetchFromSubgraph(`{
    proposal(id: "${id}") {
      id
      status
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      endBlock
      startBlock
      createdBlock
      proposer { id }
      description
      signers { id }
      createdTransactionHash
      targets
      values
      signatures
      calldatas
    }
  }`)

  if (!data?.proposal) return null
  const p = data.proposal
  const statusName = p.status ? p.status.charAt(0) + p.status.slice(1).toLowerCase() : "Unknown"

  return {
    id: Number(p.id),
    proposer: p.proposer?.id || "",
    quorumVotes: p.quorumVotes || "0",
    startBlock: p.startBlock || "0",
    endBlock: p.endBlock || "0",
    forVotes: p.forVotes || "0",
    againstVotes: p.againstVotes || "0",
    abstainVotes: p.abstainVotes || "0",
    state: statusName,
    stateNumber: PROPOSAL_STATES.indexOf(statusName) >= 0 ? PROPOSAL_STATES.indexOf(statusName) : 0,
    description: p.description || `Nouns DAO Proposal ${id}`,
    createdTransactionHash: p.createdTransactionHash || "",
    targets: p.targets || [],
    values: p.values || [],
    signatures: p.signatures || [],
    calldatas: p.calldatas || [],
    sponsors: p.signers?.map((s: any) => s.id) || [],
  }
}

// ---- RPC batch approach (fallback) ----
// Uses JSON-RPC batch to send multiple calls in a single HTTP request
async function batchRpcCall(calls: Array<{ method: string; params: any[] }>): Promise<any[]> {
  const batch = calls.map((call, i) => ({
    jsonrpc: "2.0",
    method: call.method,
    params: call.params,
    id: i + 1,
  }))

  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      })
      if (!res.ok) continue
      const json = await res.json()
      // Some RPCs return array, some return single for batch of 1
      const results = Array.isArray(json) ? json : [json]
      // Check if any have errors
      const hasErrors = results.some((r: any) => r.error)
      if (hasErrors) continue
      // Sort by id to maintain order
      results.sort((a: any, b: any) => a.id - b.id)
      return results.map((r: any) => r.result)
    } catch {
      continue
    }
  }
  throw new Error("All RPC endpoints failed for batch request")
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

const PROPOSAL_COUNT_SEL = "0xda35c664"
const PROPOSALS_SEL = "0x013cf08b"
const STATE_SEL = "0x3e4f49e6"

function parseProposalResult(id: number, proposalResult: string, stateResult: string) {
  const proposer = decodeAddress(proposalResult, 1)
  const quorumVotes = decodeSlot(proposalResult, 3)
  const startBlock = decodeSlot(proposalResult, 5)
  const endBlock = decodeSlot(proposalResult, 6)
  const forVotes = decodeSlot(proposalResult, 7)
  const againstVotes = decodeSlot(proposalResult, 8)
  const abstainVotes = decodeSlot(proposalResult, 9)
  const stateNumber = Number(BigInt(stateResult))

  return {
    id,
    proposer,
    quorumVotes: quorumVotes.toString(),
    startBlock: startBlock.toString(),
    endBlock: endBlock.toString(),
    forVotes: forVotes.toString(),
    againstVotes: againstVotes.toString(),
    abstainVotes: abstainVotes.toString(),
    state: PROPOSAL_STATES[stateNumber] || "Unknown",
    stateNumber,
    description: `Nouns DAO Proposal ${id}`,
  }
}

async function fetchProposalListFromContract(limit: number) {
  // Step 1: Get proposal count (single call)
  const [countResult] = await batchRpcCall([{
    method: "eth_call",
    params: [{ to: NOUNS_GOVERNOR, data: PROPOSAL_COUNT_SEL }, "latest"],
  }])
  const totalCount = Number(BigInt(countResult))
  if (totalCount === 0) return { proposals: [], totalCount: 0 }

  // Step 2: Batch fetch proposals + states (2 calls per proposal, all in one batch request)
  const ids: number[] = []
  for (let i = totalCount; i >= 1 && ids.length < limit; i--) {
    ids.push(i)
  }

  const calls = ids.flatMap((id) => [
    { method: "eth_call", params: [{ to: NOUNS_GOVERNOR, data: encodeFunctionCall(PROPOSALS_SEL, BigInt(id)) }, "latest"] },
    { method: "eth_call", params: [{ to: NOUNS_GOVERNOR, data: encodeFunctionCall(STATE_SEL, BigInt(id)) }, "latest"] },
  ])

  const results = await batchRpcCall(calls)

  const proposals = ids.map((id, i) => {
    return parseProposalResult(id, results[i * 2], results[i * 2 + 1])
  })

  return { proposals, totalCount }
}

async function fetchSingleProposalFromContract(id: number) {
  const results = await batchRpcCall([
    { method: "eth_call", params: [{ to: NOUNS_GOVERNOR, data: encodeFunctionCall(PROPOSALS_SEL, BigInt(id)) }, "latest"] },
    { method: "eth_call", params: [{ to: NOUNS_GOVERNOR, data: encodeFunctionCall(STATE_SEL, BigInt(id)) }, "latest"] },
  ])

  return parseProposalResult(id, results[0], results[1])
}

// ---- Route handler ----
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proposalId = searchParams.get("id")
  const limit = parseInt(searchParams.get("limit") || "20")
  const statusFilter = searchParams.get("status") || "all"

  try {
    if (proposalId) {
      // Single proposal - try subgraph first, then contract
      let proposal = await fetchSingleProposalFromSubgraph(parseInt(proposalId))
      if (!proposal) {
        proposal = await fetchSingleProposalFromContract(parseInt(proposalId))
      }
      return NextResponse.json(proposal)
    } else {
      // Proposal list - try subgraph first, then contract
      let result = await fetchProposalListFromSubgraph(limit, statusFilter)
      if (!result) {
        result = await fetchProposalListFromContract(limit)
      }
      return NextResponse.json(result)
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch proposals", details: error?.message },
      { status: 500 },
    )
  }
}
