import { NextResponse } from "next/server"

// Subgraph endpoints - using the official Nouns subgraph
const SUBGRAPH_URLS = [
  "https://api.studio.thegraph.com/query/94029/nouns-subgraph/version/latest",
  "https://api.thegraph.com/subgraphs/name/nounsdao/nouns-subgraph",
]

// Cache for candidates
const cache: {
  candidates?: { data: any[]; total: number; timestamp: number }
} = {}
const CACHE_TTL = 60_000 // 1 minute cache

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

async function fetchCandidatesFromSubgraph(): Promise<{ candidates: any[]; total: number }> {
  // Check cache first
  if (cache.candidates && Date.now() - cache.candidates.timestamp < CACHE_TTL) {
    return { candidates: cache.candidates.data, total: cache.candidates.total }
  }

  // Simpler query that works with the actual subgraph schema
  // ProposalCandidate has: id, proposer, slug, createdTimestamp, createdBlock, canceled
  // and latestVersion which has content with title/description
  const candidatesData = await querySubgraph(`{
    proposalCandidates(
      first: 100
      orderBy: createdTimestamp
      orderDirection: desc
      where: { canceled: false }
    ) {
      id
      slug
      proposer
      createdTimestamp
      createdBlock
      createdTransactionHash
      canceled
      latestVersion {
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

  if (!candidatesData?.proposalCandidates || candidatesData.proposalCandidates.length === 0) {
    // If no candidates found, return empty (subgraph may be indexing)
    console.log("[candidates] No candidates returned from subgraph")
    return { candidates: [], total: 0 }
  }

  // Process and number the candidates (newest first = highest number)
  const candidates = candidatesData.proposalCandidates.map((c: any, index: number) => {
    const version = c.latestVersion?.content
    const title = version?.title || parseTitle(version?.description || c.slug || "")
    
    return {
      id: c.id,
      candidateNumber: totalCount - index, // Newest gets highest number
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

  // Update cache
  cache.candidates = { data: candidates, total: totalCount, timestamp: Date.now() }

  return { candidates, total: totalCount }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"))

  try {
    const { candidates, total } = await fetchCandidatesFromSubgraph()
    
    const paginatedCandidates = candidates.slice(offset, offset + limit)
    const hasMore = candidates.length > offset + limit

    return NextResponse.json({
      candidates: paginatedCandidates,
      total,
      hasMore,
      offset,
      limit,
    })
  } catch (err: any) {
    console.error("[candidates] API error:", err.message)
    
    // Return cached data if available, even if stale
    if (cache.candidates) {
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

    return NextResponse.json({
      candidates: [],
      total: 0,
      hasMore: false,
      offset,
      limit,
      error: err.message || "Failed to fetch candidates"
    }, { status: 500 })
  }
}
