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

const cache: { [key: string]: { data: any; timestamp: number } } = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getCandidatesFromSubgraph(limit: number): Promise<{ candidates: CandidateData[]; total: number }> {
  try {
    // Query for the most recent candidates
    const query = `{
      proposalCandidates(first: ${Math.min(limit, 100)}, orderBy: createdTimestamp, orderDirection: desc) {
        id
        slug
        proposer { id }
        createdTimestamp
        createdTransactionHash
        latestVersion {
          content {
            title
            description
          }
        }
      }
    }`

    const response = await fetch("https://api.studio.thegraph.com/query/94029/nouns-subgraph/version/latest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.error("[v0] Subgraph response error:", response.status)
      return { candidates: [], total: 0 }
    }
    
    const data = await response.json()
    
    if (data.errors) {
      console.error("[v0] Subgraph GraphQL errors:", data.errors[0]?.message)
      return { candidates: [], total: 0 }
    }

    if (!data.data?.proposalCandidates) {
      console.error("[v0] No proposalCandidates in subgraph response")
      return { candidates: [], total: 0 }
    }

    const candidates = data.data.proposalCandidates.map((c: any, index: number) => {
      // Extract candidate number from ID if possible (format: "0xaddress-number")
      let candidateNumber = index + 1
      if (c.id.includes('-')) {
        const num = parseInt(c.id.split('-')[1])
        if (!isNaN(num)) candidateNumber = num
      }
      
      return {
        id: c.id,
        candidateNumber,
        proposer: c.proposer?.id || "0x0000000000000000000000000000000000000000",
        title: c.latestVersion?.content?.title || `Candidate ${candidateNumber}`,
        description: c.latestVersion?.content?.description || "No description available",
        createdTimestamp: Number(c.createdTimestamp) || 0,
        slug: c.slug || c.id,
      }
    })
    
    console.log("[v0] Fetched", candidates.length, "candidates from subgraph")
    
    // Return candidates and their count
    return { 
      candidates,
      total: candidates.length > 0 ? Math.max(candidates[0].candidateNumber, candidates.length) : 0
    }
  } catch (err) {
    console.error("[v0] Subgraph fetch failed:", err instanceof Error ? err.message : err)
    return { candidates: [], total: 0 }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

  const cacheKey = `candidates_${limit}`
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
    return NextResponse.json(cache[cacheKey].data)
  }

  try {
    // Get candidates from subgraph (primary source)
    const { candidates, total } = await getCandidatesFromSubgraph(limit)

    const result = {
      candidates: candidates || [],
      total: total || 0,
      source: "subgraph",
    }

    cache[cacheKey] = { data: result, timestamp: Date.now() }
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[v0] Candidates API error:", error)
    return NextResponse.json(
      {
        candidates: [],
        total: 0,
        error: error?.message || "Failed to fetch candidates",
      },
      { status: 500 },
    )
  }
}
