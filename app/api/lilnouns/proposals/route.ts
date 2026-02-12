import { NextResponse } from "next/server"

const LILNOUNS_GOVERNOR = "0x5d2C31ce16924C2a71D317e5BbFd5ce387854039"

// Subgraph endpoints for Lil Nouns
const SUBGRAPH_URLS = [
  "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/lil-nouns/prod/gn",
  "https://api.thegraph.com/subgraphs/name/lilnounsdao/lil-nouns-subgraph",
]

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

// ---- Subgraph approach ----
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

async function fetchProposalListFromSubgraph(limit: number) {
  const data = await fetchFromSubgraph(`{
    proposals(first: ${limit}, orderBy: createdTimestamp, orderDirection: desc) {
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
    }
  }`)

  if (!data?.proposals) return null

  return {
    proposals: data.proposals.map((p: any) => ({
      id: Number(p.id),
      proposer: p.proposer?.id || "",
      quorumVotes: p.quorumVotes || "0",
      startBlock: p.startBlock || "0",
      endBlock: p.endBlock || "0",
      forVotes: p.forVotes || "0",
      againstVotes: p.againstVotes || "0",
      abstainVotes: p.abstainVotes || "0",
      state: p.status ? p.status.charAt(0) + p.status.slice(1).toLowerCase() : "Unknown",
      stateNumber: PROPOSAL_STATES.indexOf(
        p.status ? p.status.charAt(0) + p.status.slice(1).toLowerCase() : ""
      ) || 0,
      description: p.description || `Lil Nouns Proposal ${p.id}`,
    })),
    totalCount: data.proposals.length,
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
    description: p.description || `Lil Nouns Proposal ${id}`,
  }
}

// ---- Batch RPC approach (fallback) ----
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
      const results = Array.isArray(json) ? json : [json]
      const hasErrors = results.some((r: any) => r.error)
      if (hasErrors) continue
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
    description: `Lil Nouns Proposal ${id}`,
  }
}

async function fetchProposalListFromContract(limit: number) {
  const [countResult] = await batchRpcCall([{
    method: "eth_call",
    params: [{ to: LILNOUNS_GOVERNOR, data: PROPOSAL_COUNT_SEL }, "latest"],
  }])
  const totalCount = Number(BigInt(countResult))
  if (totalCount === 0) return { proposals: [], totalCount: 0 }

  const ids: number[] = []
  for (let i = totalCount; i >= 1 && ids.length < limit; i--) {
    ids.push(i)
  }

  const calls = ids.flatMap((id) => [
    { method: "eth_call", params: [{ to: LILNOUNS_GOVERNOR, data: encodeFunctionCall(PROPOSALS_SEL, BigInt(id)) }, "latest"] },
    { method: "eth_call", params: [{ to: LILNOUNS_GOVERNOR, data: encodeFunctionCall(STATE_SEL, BigInt(id)) }, "latest"] },
  ])

  const results = await batchRpcCall(calls)
  const proposals = ids.map((id, i) => parseProposalResult(id, results[i * 2], results[i * 2 + 1]))

  return { proposals, totalCount }
}

async function fetchSingleProposalFromContract(id: number) {
  const results = await batchRpcCall([
    { method: "eth_call", params: [{ to: LILNOUNS_GOVERNOR, data: encodeFunctionCall(PROPOSALS_SEL, BigInt(id)) }, "latest"] },
    { method: "eth_call", params: [{ to: LILNOUNS_GOVERNOR, data: encodeFunctionCall(STATE_SEL, BigInt(id)) }, "latest"] },
  ])
  return parseProposalResult(id, results[0], results[1])
}

// ---- Route handler ----
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proposalId = searchParams.get("id")
  const limit = parseInt(searchParams.get("limit") || "20")

  try {
    if (proposalId) {
      let proposal = await fetchSingleProposalFromSubgraph(parseInt(proposalId))
      if (!proposal) {
        proposal = await fetchSingleProposalFromContract(parseInt(proposalId))
      }
      return NextResponse.json(proposal)
    } else {
      let result = await fetchProposalListFromSubgraph(limit)
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
