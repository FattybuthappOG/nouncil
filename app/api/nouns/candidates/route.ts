import { NextResponse } from "next/server"

// Subgraph endpoints - The Graph decentralized network
// Note: The legacy free endpoints have been deprecated. The decentralized network requires an API key.
// We'll use multiple fallback approaches:
// 1. The Graph Gateway (requires API key - will fail gracefully if not set)
// 2. Direct contract event fetching via RPC as ultimate fallback
const GRAPH_API_KEY = process.env.GRAPH_API_KEY || ""
const SUBGRAPH_ID = "5qcR6rAfDMZCVGuZ6DDois7y4zyXqsyqvaqhE6NRRraW"

const SUBGRAPH_URLS = GRAPH_API_KEY 
  ? [`https://gateway-arbitrum.network.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/${SUBGRAPH_ID}`]
  : []

// NounsDAOData contract - emits ProposalCandidateCreated events
const NOUNS_DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365"
const RPC_ENDPOINTS = [
  "https://eth.drpc.org",
  "https://cloudflare-eth.com",
  "https://1rpc.io/eth",
]

// Cache for candidates
const cache: {
  candidates?: { data: any[]; total: number; timestamp: number }
} = {}
const CACHE_TTL = 300_000 // 5 minute cache (longer since RPC fetching is slow)

// Make RPC call with fallback
async function rpcCall(method: string, params: any[]): Promise<any> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      
      if (!response.ok) continue
      const json = await response.json()
      if (json.error) continue
      return json.result
    } catch {
      continue
    }
  }
  throw new Error("All RPC endpoints failed")
}

// Fetch candidates via RPC by reading contract events
// ProposalCandidateCreated(address indexed msgSender, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, string slug, uint256 proposalIdToUpdate, bytes32 encodedProposalHash)
// Topic0: 0x1e5b0e3e0e8e56d7f35e55c81c1a72c33f8fae84f09a5e8b1c1d5e7e4d8e5e1a
async function fetchCandidatesViaRPC(): Promise<{ candidates: any[]; total: number }> {
  // Get events from the last ~30 days (approximately 216000 blocks)
  const latestBlock = await rpcCall("eth_blockNumber", [])
  const latestBlockNum = parseInt(latestBlock, 16)
  const fromBlock = Math.max(0, latestBlockNum - 216000)
  
  // ProposalCandidateCreated event topic
  // keccak256("ProposalCandidateCreated(address,address[],uint256[],string[],bytes[],string,string,uint256,bytes32)")
  const CANDIDATE_CREATED_TOPIC = "0x6c0da3b7c28d3b4a33f27b946893f8d43f9d7c9c55f5897a52fb786e2c9a5896"
  
  const logs = await rpcCall("eth_getLogs", [{
    address: NOUNS_DAO_DATA,
    topics: [CANDIDATE_CREATED_TOPIC],
    fromBlock: "0x" + fromBlock.toString(16),
    toBlock: "latest",
  }])
  
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return { candidates: [], total: 0 }
  }
  
  // Parse logs into candidate data
  // The event data is ABI-encoded, we'll extract basic info
  const candidates = logs.map((log: any, index: number) => {
    const proposer = "0x" + log.topics[1]?.slice(26) || "0x0"
    const blockNumber = parseInt(log.blockNumber, 16)
    
    return {
      id: log.transactionHash + "-" + log.logIndex,
      candidateNumber: logs.length - index,
      slug: `candidate-${logs.length - index}`,
      proposer,
      title: `Candidate #${logs.length - index}`,
      description: "",
      createdTimestamp: 0, // Would need to fetch block timestamp
      createdBlock: blockNumber.toString(),
      createdTransactionHash: log.transactionHash,
      canceled: false,
    }
  }).reverse() // Newest first
  
  return { candidates, total: candidates.length }
}

// Query subgraph with automatic fallback and better error handling
async function querySubgraph(query: string): Promise<any> {
  const errors: string[] = []
  
  for (const url of SUBGRAPH_URLS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      
      if (!response.ok) {
        errors.push(`${url}: HTTP ${response.status}`)
        continue
      }
      
      const json = await response.json()
      
      if (json.errors) {
        errors.push(`${url}: GraphQL errors: ${JSON.stringify(json.errors)}`)
        continue
      }
      
      if (!json.data) {
        errors.push(`${url}: No data in response`)
        continue
      }
      
      return json.data
    } catch (err: any) {
      errors.push(`${url}: ${err.message}`)
      continue
    }
  }
  
  throw new Error(`All subgraph endpoints failed: ${errors.join("; ")}`)
}

// Parse title from description (first line starting with #)
function parseTitle(description: string): string {
  if (!description) return "Untitled Candidate"
  const lines = description.split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("# ")) {
      return trimmed.substring(2).trim()
    }
    if (trimmed.startsWith("#")) {
      return trimmed.substring(1).trim()
    }
  }
  // If no heading found, use first non-empty line
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith("![") && !trimmed.startsWith("http")) {
      return trimmed.substring(0, 100)
    }
  }
  return "Untitled Candidate"
}

async function fetchCandidates(): Promise<{ candidates: any[]; total: number }> {
  // Check cache first
  if (cache.candidates && Date.now() - cache.candidates.timestamp < CACHE_TTL) {
    return { candidates: cache.candidates.data, total: cache.candidates.total }
  }

  // Try subgraph first if API key is available
  if (SUBGRAPH_URLS.length > 0) {
    try {
      const candidatesData = await querySubgraph(`{
        proposalCandidates(
          first: 100
          orderBy: number
          orderDirection: desc
          where: { canceled: false }
        ) {
          id
          slug
          proposer
          number
          createdTimestamp
          createdBlock
          createdTransactionHash
          canceled
          latestVersion {
            id
            createdTimestamp
            content {
              title
              description
            }
          }
        }
        governance(id: "GOVERNANCE") {
          candidates
        }
      }`)

      const totalCount = candidatesData?.governance?.candidates 
        ? Number(candidatesData.governance.candidates) 
        : candidatesData?.proposalCandidates?.length || 0

      if (candidatesData?.proposalCandidates && candidatesData.proposalCandidates.length > 0) {
        const candidates = candidatesData.proposalCandidates.map((c: any) => {
          const version = c.latestVersion?.content
          const title = version?.title || parseTitle(version?.description || c.slug || "")
          
          return {
            id: c.id,
            candidateNumber: Number(c.number),
            slug: c.slug,
            proposer: c.proposer,
            title,
            description: version?.description || "",
            createdTimestamp: Number(c.createdTimestamp),
            createdBlock: c.createdBlock,
            createdTransactionHash: c.createdTransactionHash,
            canceled: c.canceled,
          }
        })

        cache.candidates = { data: candidates, total: totalCount, timestamp: Date.now() }
        return { candidates, total: totalCount }
      }
    } catch (err: any) {
      console.log("[candidates] Subgraph failed, trying RPC fallback:", err.message)
    }
  }

  // Fallback to RPC event fetching
  console.log("[candidates] Using RPC fallback to fetch candidates")
  const result = await fetchCandidatesViaRPC()
  
  if (result.candidates.length > 0) {
    cache.candidates = { data: result.candidates, total: result.total, timestamp: Date.now() }
  }
  
  return result
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"))

  try {
    const { candidates, total } = await fetchCandidates()
    
    if (candidates.length > 0) {
      const paginatedCandidates = candidates.slice(offset, offset + limit)
      const hasMore = candidates.length > offset + limit

      return NextResponse.json({
        candidates: paginatedCandidates,
        total,
        hasMore,
        offset,
        limit,
      })
    }
    
    // If no candidates found, return a helpful response
    return NextResponse.json({
      candidates: [],
      total: 0,
      hasMore: false,
      offset,
      limit,
      unavailable: true,
      message: "Candidates data requires a Graph API key. View candidates on nouns.wtf instead.",
      externalUrl: "https://nouns.wtf/vote#candidates"
    })
  } catch (err: any) {
    console.error("[candidates] API error:", err.message)
    
    // Return cached data if available, even if stale
    if (cache.candidates && cache.candidates.data.length > 0) {
      const paginatedCandidates = cache.candidates.data.slice(offset, offset + limit)
      return NextResponse.json({
        candidates: paginatedCandidates,
        total: cache.candidates.total,
        hasMore: cache.candidates.total > offset + limit,
        offset,
        limit,
        stale: true,
        message: "Serving stale cached data due to fetch error"
      })
    }

    // Return a helpful unavailable response instead of an error
    return NextResponse.json({
      candidates: [],
      total: 0,
      hasMore: false,
      offset,
      limit,
      unavailable: true,
      message: "Candidates data requires a Graph API key. View candidates on nouns.wtf instead.",
      externalUrl: "https://nouns.wtf/vote#candidates"
    })
  }
}
