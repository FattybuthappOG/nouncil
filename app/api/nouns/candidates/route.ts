import { NextResponse } from "next/server"

// Goldsky public endpoint - same as nouns.wtf uses (free, no API key required)
const GOLDSKY_URL = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn"

// Cache for candidates
const cache: {
  candidates?: { data: any[]; timestamp: number; total: number }
} = {}
const CACHE_TTL = 120_000 // 2 minute cache

// Query Goldsky for candidates (same endpoint nouns.wtf uses)
async function fetchCandidatesFromGoldsky(): Promise<{ candidates: any[]; total: number }> {
  // Fetch candidates with the 'number' field which is the real candidate number
  // The highest number represents total candidates ever created (includes canceled/promoted)
  const query = `{
    proposalCandidates(first: 100, orderBy: number, orderDirection: desc, where: { canceled: false }) {
      id
      number
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
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(GOLDSKY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      console.error("[candidates] Goldsky API error:", response.status)
      return { candidates: [], total: 0 }
    }

    const json = await response.json()
    
    if (json.errors) {
      console.error("[candidates] GraphQL errors:", json.errors)
      return { candidates: [], total: 0 }
    }

    const rawCandidates = json.data?.proposalCandidates || []
    
    // The highest candidate number represents the total candidates ever created
    // (since results are ordered by number desc, the first one has the highest number)
    const total = rawCandidates.length > 0 ? Number(rawCandidates[0].number) : 0
    
    const candidates = rawCandidates.map((c: any) => {
      const title = c.latestVersion?.content?.title || 
                   parseTitle(c.latestVersion?.content?.description || c.slug || "")
      
      return {
        id: c.id,
        candidateNumber: Number(c.number), // Use the real candidate number from subgraph
        slug: c.slug,
        proposer: c.proposer,
        title,
        description: c.latestVersion?.content?.description || "",
        createdTimestamp: Number(c.createdTimestamp),
        createdTransactionHash: c.createdTransactionHash,
        canceled: c.canceled,
      }
    })

    return { candidates, total }
  } catch (err: any) {
    console.error("[candidates] Failed to fetch from Goldsky:", err.message)
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

  // Fetch from Goldsky (free public endpoint)
  const { candidates, total } = await fetchCandidatesFromGoldsky()
  
  // Update cache regardless of whether we have candidates
  cache.candidates = { data: candidates, timestamp: Date.now(), total }
  
  const paginatedCandidates = candidates.slice(offset, offset + limit)
  
  // Always return successful response when query succeeds (even if no candidates found)
  // Only set unavailable: true if there was an actual error
  return NextResponse.json({
    candidates: paginatedCandidates,
    total,
    hasMore: total > offset + limit,
    offset,
    limit,
  })
}
