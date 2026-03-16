import { NextResponse } from "next/server"

const NOUNS_GOVERNOR = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d"
const NOUNS_TOKEN = "0x9C8fF314C9B9B91F60f4d9A12eAf51B0C1ABc08e"

// RPC endpoints - ordered by reliability. Use env var if available.
// Remove unreliable endpoints like ethereum.publicnode.com and ethereum-rpc.publicnode.com
const RPC_URLS = [
  process.env.ETH_RPC_URL,
  "https://eth.drpc.org",
  "https://cloudflare-eth.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
  "https://endpoints.omnirpc.io/eth",
  "https://eth.meowrpc.com",
].filter(Boolean) as string[]

const PROPOSAL_STATES = [
  "Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed",
]

// In-memory cache to avoid repeated RPC calls
const cache: { 
  proposals?: { data: any; timestamp: number }
  single: Record<string, { data: any; timestamp: number }>
  quorumBPS?: { data: bigint; timestamp: number }
  nounsCount?: { data: bigint; timestamp: number }
} = { single: {} }
const CACHE_TTL_LIST = 60_000 // 1 minute for list
const CACHE_TTL_SINGLE = 120_000 // 2 minutes for single proposal
const CACHE_TTL_QUORUM = 86400_000 // 24 hours for quorum data (stable governance params)

// Nouns DAO quorum: 10% (1000 BPS) of total supply
// Current approximate Nouns in circulation: ~1100
// Therefore base quorum is approximately 110 Nouns
const NOUNS_BASE_QUORUM = 110n // Hardcoded to avoid rate limiting RPC calls

// Calculate dynamic quorum: baseQuorum + againstVotes
function calculateDynamicQuorum(againstVotes: bigint): bigint {
  return NOUNS_BASE_QUORUM + againstVotes
}

// Batch JSON-RPC: send multiple calls, chunked to respect provider limits
// drpc.org free tier: max 3 requests per batch
// llamarpc.com: max 25 requests per batch
async function batchRpcCall(calls: { method: string; params: any[] }[]): Promise<any[]> {
  const CHUNK_SIZE = 3 // Use conservative limit (drpc.org free tier)
  const allResults: any[] = []

  // Split into chunks and send each chunk
  for (let i = 0; i < calls.length; i += CHUNK_SIZE) {
    const chunk = calls.slice(i, i + CHUNK_SIZE)
    const batch = chunk.map((c, idx) => ({
      jsonrpc: "2.0",
      method: c.method,
      params: c.params,
      id: idx + 1,
    }))

    let chunkResults: any[] | null = null

    // Try batch request with each RPC provider
    for (const url of RPC_URLS) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 12000)
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        if (!res.ok) continue
        
        const results = await res.json()
        if (!Array.isArray(results)) continue
        
        results.sort((a: any, b: any) => a.id - b.id)
        const successes = results.filter((r: any) => !r.error && r.result !== undefined)
        
        // If we got most of the results, use them
        if (successes.length >= batch.length * 0.5) {
          chunkResults = results.map((r: any) => r.result || null)
          break
        }
      } catch {
        continue
      }
    }

    // If batch failed, try sequential fallback for this chunk
    if (!chunkResults) {
      chunkResults = []
      for (const call of chunk) {
        let callResult = null
        for (const url of RPC_URLS) {
          try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 6000)
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", method: call.method, params: call.params, id: 1 }),
              signal: controller.signal,
            })
            clearTimeout(timeout)
            if (res.ok) {
              const json = await res.json()
              if (!json.error) {
                callResult = json.result
                break
              }
            }
          } catch {
            continue
          }
        }
        chunkResults.push(callResult)
      }
    }

    allResults.push(...chunkResults)
  }

  if (allResults.length !== calls.length) {
    throw new Error(`Failed to get results for all calls (got ${allResults.length}/${calls.length})`)
  }

  return allResults
}

// Single RPC call
async function rpcCall(method: string, params: any[]): Promise<any> {
  for (const url of RPC_URLS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)
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

// Fetch proposal list using subgraph (fast, no rate limits)
async function fetchProposalList(limit: number, statusFilter: string) {
  // Check cache
  if (cache.proposals && Date.now() - cache.proposals.timestamp < CACHE_TTL_LIST) {
    const cached = cache.proposals.data
    if (statusFilter === "all") {
      return { proposals: cached.proposals.slice(0, limit), totalCount: cached.totalCount }
    }
    const filtered = cached.proposals.filter((p: any) => {
      if (statusFilter === "active") return [0, 1, 5].includes(p.stateNumber)
      if (statusFilter === "executed") return p.stateNumber === 7
      if (statusFilter === "defeated") return p.stateNumber === 3
      if (statusFilter === "canceled") return p.stateNumber === 2
      return true
    })
    return { proposals: filtered.slice(0, limit), totalCount: filtered.length }
  }

  // Fetch from subgraph - much faster and no rate limits
  try {
    const subgraphUrl = "https://api.studio.thegraph.com/query/94029/nouns-subgraph/version/latest"
    const query = `{
      proposals(first: 100, orderBy: createdBlock, orderDirection: desc) {
        id
        proposer { id }
        startBlock
        endBlock
        forVotes
        againstVotes
        abstainVotes
        state
        createdBlock
        description
      }
    }`
    
    const response = await fetch(subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000),
    })
    
    if (!response.ok) throw new Error(`Subgraph HTTP ${response.status}`)
    
    const json = await response.json()
    if (!json.data?.proposals) throw new Error("Invalid subgraph response")
    
    const proposals = json.data.proposals.map((p: any) => ({
      id: Number(p.id),
      description: p.description || `# Proposal ${p.id}`,
      proposer: p.proposer?.id || "0x0",
      forVotes: p.forVotes || "0",
      againstVotes: p.againstVotes || "0",
      abstainVotes: p.abstainVotes || "0",
      quorumVotes: calculateDynamicQuorum(BigInt(p.againstVotes || "0")).toString(),
      status: (PROPOSAL_STATES[Number(p.state)] || "Unknown").toUpperCase(),
      stateNumber: Number(p.state),
      startBlock: p.startBlock || "0",
      endBlock: p.endBlock || "0",
    }))
    
    // Cache all proposals
    cache.proposals = { data: { proposals, totalCount: proposals.length }, timestamp: Date.now() }

    // Filter if needed
    if (statusFilter !== "all") {
      const filtered = proposals.filter((p: any) => {
        if (statusFilter === "active") return [0, 1, 5].includes(p.stateNumber)
        if (statusFilter === "executed") return p.stateNumber === 7
        if (statusFilter === "defeated") return p.stateNumber === 3
        if (statusFilter === "vetoed") return p.stateNumber === 8
        if (statusFilter === "canceled") return p.stateNumber === 2
        return true
      })
      return { proposals: filtered.slice(0, limit), totalCount: filtered.length }
    }

    return { proposals: proposals.slice(0, limit), totalCount: proposals.length }
  } catch (err) {
    console.error("[proposals] Subgraph fetch failed:", err)
    throw err
  }
}

// Fetch a single proposal - prefer subgraph, minimal RPC use
async function fetchSingleProposal(id: number) {
  // Check cache
  const cacheKey = String(id)
  if (cache.single[cacheKey] && Date.now() - cache.single[cacheKey].timestamp < CACHE_TTL_SINGLE) {
    return cache.single[cacheKey].data
  }

  // Try subgraph first - fast and reliable
  try {
    const subgraphUrl = "https://api.studio.thegraph.com/query/94029/nouns-subgraph/version/latest"
    const query = `{
      proposal(id: "${id}") {
        id
        proposer { id }
        startBlock
        endBlock
        forVotes
        againstVotes
        abstainVotes
        state
        createdBlock
        description
      }
    }`
    
    const response = await fetch(subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000),
    })
    
    if (response.ok) {
      const json = await response.json()
      if (json.data?.proposal) {
        const p = json.data.proposal
        const result = {
          id: Number(p.id),
          proposer: p.proposer?.id || "0x0",
          signers: [],
          description: p.description || `# Proposal ${id}`,
          forVotes: p.forVotes || "0",
          againstVotes: p.againstVotes || "0",
          abstainVotes: p.abstainVotes || "0",
          quorumVotes: calculateDynamicQuorum(BigInt(p.againstVotes || "0")).toString(),
          status: (PROPOSAL_STATES[Number(p.state)] || "Unknown").toUpperCase(),
          stateNumber: Number(p.state) || 0,
          startBlock: p.startBlock || "0",
          endBlock: p.endBlock || "0",
          creationBlock: p.createdBlock || "0",
          createdTransactionHash: "",
        }
        cache.single[cacheKey] = { data: result, timestamp: Date.now() }
        return result
      }
    }
  } catch (err) {
    console.error("[proposals] Subgraph fetch failed for proposal", id, ":", err)
  }

  // If we have stale cache, use it
  if (cache.single[cacheKey]) {
    console.warn(`[proposals] Using stale cache for proposal ${id}`)
    return { ...cache.single[cacheKey].data, stale: true, error: "Using cached data" }
  }

  throw new Error(`Failed to fetch proposal ${id} from subgraph`)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proposalId = searchParams.get("id")
  const limit = parseInt(searchParams.get("limit") || "20")
  const statusFilter = searchParams.get("status") || "all"

  try {
    if (proposalId) {
      const result = await fetchSingleProposal(parseInt(proposalId))
      return NextResponse.json(result)
    } else {
      const result = await fetchProposalList(limit, statusFilter)
      return NextResponse.json(result)
    }
  } catch (error: any) {
    console.error("Error fetching Nouns proposals:", error?.message || error)
    // Return 200 with error object for graceful client handling instead of 500
    return NextResponse.json(
      {
        error: "Failed to fetch proposals",
        details: error?.message,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  }
}
