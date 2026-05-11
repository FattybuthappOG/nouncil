import { NextResponse } from "next/server"

// The Graph decentralized network - requires API key for access
// Get a free API key at https://thegraph.com/studio/apikeys/
const GRAPH_API_KEY = process.env.GRAPH_API_KEY || ""
const SUBGRAPH_ID = "5qcR6rAfDMZCVGuZ6DDois7y4zyXqsyqvaqhE6NRRraW"

// Cache for candidates
const cache: {
  candidates?: { data: any[]; timestamp: number; total: number }
} = {}
const CACHE_TTL = 300_000 // 5 minute cache

// Query The Graph for candidates
async function fetchCandidatesFromGraph(): Promise<{ candidates: any[]; total: number }> {
  if (!GRAPH_API_KEY) {
    return { candidates: [], total: 0 }
  }

  const url = `https://gateway-arbitrum.network.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/${SUBGRAPH_ID}`
  
  const query = `{
    proposalCandidates(first: 100, orderBy: createdTimestamp, orderDirection: desc, where: { canceled: false }) {
      id
      slug
      proposer
      createdTimestamp
      createdTransactionHash
      canceled
      latestVersion {
        content {
          title
          description
        }
      }
    }
  }`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      console.error("[candidates] Graph API error:", response.status)
      return { candidates: [], total: 0 }
    }

    const json = await response.json()
    
    if (json.errors) {
      console.error("[candidates] GraphQL errors:", json.errors)
      return { candidates: [], total: 0 }
    }

    const rawCandidates = json.data?.proposalCandidates || []
    
    const candidates = rawCandidates.map((c: any, index: number) => {
      const title = c.latestVersion?.content?.title || 
                   parseTitle(c.latestVersion?.content?.description || c.slug || "")
      
      return {
        id: c.id,
        candidateNumber: rawCandidates.length - index,
        slug: c.slug,
        proposer: c.proposer,
        title,
        description: c.latestVersion?.content?.description || "",
        createdTimestamp: Number(c.createdTimestamp),
        createdTransactionHash: c.createdTransactionHash,
        canceled: c.canceled,
      }
    })

    return { candidates, total: candidates.length }
  } catch (err: any) {
    console.error("[candidates] Failed to fetch from Graph:", err.message)
    return { candidates: [], total: 0 }
  }
}

// Parse title from description markdown
function parseTitle(description: string): string {
  if (!description) return "Untitled Candidate"
  const lines = description.split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("# ")) return trimmed.substring(2).trim()
    if (trimmed.startsWith("#")) return trimmed.substring(1).trim()
  }
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith("![") && !trimmed.startsWith("http")) {
      return trimmed.substring(0, 100)
    }
  }
  return "Untitled Candidate"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"))

  // Check cache first
  if (cache.candidates && Date.now() - cache.candidates.timestamp < CACHE_TTL) {
    const paginatedCandidates = cache.candidates.data.slice(offset, offset + limit)
    return NextResponse.json({
      candidates: paginatedCandidates,
      total: cache.candidates.total,
      hasMore: cache.candidates.total > offset + limit,
      offset,
      limit,
    })
  }

  // Try to fetch from The Graph if API key is available
  const { candidates, total } = await fetchCandidatesFromGraph()
  
  if (candidates.length > 0) {
    // Update cache
    cache.candidates = { data: candidates, timestamp: Date.now(), total }
    
    const paginatedCandidates = candidates.slice(offset, offset + limit)
    return NextResponse.json({
      candidates: paginatedCandidates,
      total,
      hasMore: total > offset + limit,
      offset,
      limit,
    })
  }

  // Return unavailable message if no API key or fetch failed
  return NextResponse.json({
    candidates: [],
    total: 0,
    hasMore: false,
    offset,
    limit,
    unavailable: true,
    message: "View existing candidates on nouns.wtf or create a new proposal candidate below.",
    externalUrl: "https://nouns.wtf/vote#candidates"
  })
}
