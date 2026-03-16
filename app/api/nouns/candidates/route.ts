import { NextResponse } from "next/server"

interface CandidateData {
  id: string
  candidateNumber: number
  proposer: string
  title: string
  description: string
  createdTimestamp: number
  slug: string
}

// The Graph Nouns subgraph - already has all candidate data indexed
const SUBGRAPH_URL = "https://api.studio.thegraph.com/query/94029/nouns-subgraph/version/latest"

// 12 hour cache for candidates
const cache: Record<string, { data: any; ts: number }> = {}
const CACHE_TTL = 12 * 60 * 60 * 1000

// Fetch candidates from The Graph subgraph - instant, no rate limits
async function fetchAllCandidates(): Promise<CandidateData[]> {
  const query = `{
    proposalCandidates(first: 1000, orderBy: createdBlock, orderDirection: desc) {
      id
      proposer
      description
      createdBlock
      slug
    }
  }`
  
  try {
    console.log("[candidates] Fetching from subgraph...")
    const response = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15000),
    })
    
    if (!response.ok) {
      throw new Error(`Subgraph HTTP ${response.status}`)
    }
    
    const json = await response.json()
    
    if (json.errors) {
      throw new Error(`Subgraph error: ${json.errors[0]?.message || "Unknown"}`)
    }
    
    if (!json.data?.proposalCandidates) {
      console.warn("[candidates] No candidates in subgraph response")
      return []
    }
    
    const candidates: CandidateData[] = json.data.proposalCandidates.map((c: any, index: number) => {
      let title = c.slug || `Candidate by ${c.proposer.slice(0, 8)}`
      if (c.description) {
        const firstLine = c.description.split("\n")[0].replace(/^#+\s*/, "").trim()
        if (firstLine.length > 0) title = firstLine
      }
      
      return {
        id: c.id,
        candidateNumber: index + 1,
        proposer: c.proposer,
        title: title.length > 120 ? title.slice(0, 120) + "…" : title,
        description: c.description || "",
        createdTimestamp: parseInt(c.createdBlock || "0"),
        slug: c.slug || c.id,
      }
    })
    
    console.log(`[candidates] Successfully fetched ${candidates.length} candidates from subgraph`)
    return candidates
  } catch (err) {
    console.error("[candidates] Subgraph fetch error:", err)
    throw err
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"))
  
  const cacheKey = "candidates_all"

  // Check cache - fetch all candidates once, then paginate
  let allCandidates: CandidateData[] = []
  let fromCache = false

  if (cache[cacheKey] && Date.now() - cache[cacheKey].ts < CACHE_TTL) {
    console.log("[candidates] Returning cached data")
    allCandidates = cache[cacheKey].data
    fromCache = true
  } else {
    try {
      console.log("[candidates] Cache miss or expired - fetching from subgraph...")
      allCandidates = await fetchAllCandidates()
      cache[cacheKey] = { data: allCandidates, ts: Date.now() }
      console.log(`[candidates] Successfully fetched and cached ${allCandidates.length} candidates`)
    } catch (error: any) {
      console.error("[candidates] Fetch error:", error?.message)
      
      // Use stale cache if available
      if (cache[cacheKey]) {
        console.warn("[candidates] Using stale cache due to subgraph failure")
        allCandidates = cache[cacheKey].data
        fromCache = true
      } else {
        console.error("[candidates] No cache available and fetch failed - returning empty")
        return NextResponse.json(
          { candidates: [], total: 0, hasMore: false, offset, limit, error: error?.message },
          { status: 200 }
        )
      }
    }
  }

  // Paginate from cached/fetched candidates
  const total = allCandidates.length
  const hasMore = total > offset + limit
  const paginatedCandidates = allCandidates.slice(offset, offset + limit)

  return NextResponse.json({
    candidates: paginatedCandidates,
    total,
    hasMore,
    offset,
    limit,
    source: fromCache ? "cached" : "subgraph-fetched",
    cacheAge: cache[cacheKey] ? Math.round((Date.now() - cache[cacheKey].ts) / 1000 / 60) + "m" : "unknown"
  })
}
