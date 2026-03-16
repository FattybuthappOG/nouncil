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

// 12 hour cache for candidates fetched from subgraph
const cache: Record<string, { data: any; ts: number }> = {}
const CACHE_TTL = 12 * 60 * 60 * 1000

const SUBGRAPH_URL = "https://api.studio.thegraph.com/query/94029/nouns-subgraph/version/latest"

// Fetch candidates from The Graph subgraph (much faster and no rate limits)
async function fetchAllCandidates(): Promise<CandidateData[]> {
  const candidates: CandidateData[] = []
  let skip = 0
  const pageSize = 1000 // Max query size from subgraph

  console.log("[candidates] Fetching from Nouns subgraph...")

  try {
    let hasMore = true
    let pageNum = 1

    while (hasMore) {
      const query = `{
        proposalCandidates(first: ${pageSize}, skip: ${skip}, orderBy: createdBlock, orderDirection: desc) {
          id
          proposer {
            id
          }
          targets
          values
          signatures
          calldatas
          description
          reason
          createdBlock
          createdTransactionHash
        }
      }`

      console.log(
        `[candidates] Fetching page ${pageNum} (skip: ${skip}, first: ${pageSize})...`
      )

      const response = await fetch(SUBGRAPH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        throw new Error(
          `Subgraph HTTP error: ${response.status} ${response.statusText}`
        )
      }

      const json = await response.json()

      if (json.errors) {
        throw new Error(`Subgraph error: ${json.errors[0]?.message || "Unknown"}`)
      }

      const candidates_page = json.data?.proposalCandidates || []

      if (candidates_page.length === 0) {
        hasMore = false
        console.log(`[candidates] Reached end at page ${pageNum}`)
        break
      }

      console.log(
        `[candidates] Got ${candidates_page.length} candidates on page ${pageNum}`
      )

      for (const candidate of candidates_page) {
        const description = candidate.description || ""
        const title = description
          .split("\n")[0]
          .replace(/^#+\s*/, "")
          .trim()

        candidates.push({
          id: candidate.id,
          candidateNumber: candidates.length + 1,
          proposer: candidate.proposer?.id || "0x0000000000000000000000000000000000000000",
          title: title || `Candidate ${candidates.length + 1}`,
          description,
          createdTimestamp: parseInt(candidate.createdBlock || "0"),
          slug: title
            ?.toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-") || `candidate-${candidates.length + 1}`,
        })
      }

      // Check if we got less than a full page, meaning we've reached the end
      if (candidates_page.length < pageSize) {
        hasMore = false
      } else {
        skip += pageSize
        pageNum++
        // Small delay between pages to be respectful to the subgraph
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`[candidates] Successfully fetched ${candidates.length} total candidates`)
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
      console.log(
        `[candidates] Successfully fetched and cached ${allCandidates.length} candidates`
      )
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
    cacheAge: cache[cacheKey]
      ? Math.round((Date.now() - cache[cacheKey].ts) / 1000 / 60) + "m"
      : "unknown",
  })
}
