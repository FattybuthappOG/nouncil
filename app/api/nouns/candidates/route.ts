import { NextResponse } from "next/server"

// Multiple subgraph endpoints to try - the Nouns subgraph with proposalCandidate entity
const SUBGRAPH_URLS = [
  // The Graph decentralized network - Nouns subgraph (includes candidates)
  "https://gateway.thegraph.com/api/subgraphs/id/5qcR6rAfDMZCVGuZ6DDois7y4zyXqsyqvaqhE6NRRraW",
  // The Graph Studio endpoint
  "https://api.studio.thegraph.com/query/94029/nouns-subgraph/version/latest",
  // Alternative Graph Studio deploys
  "https://api.studio.thegraph.com/query/50108/nouns-subgraph/version/latest",
  "https://api.studio.thegraph.com/query/49498/nouns-v3-mainnet/version/latest",
]

// Cache for candidates
let cache: { data: any[]; timestamp: number } | null = null
const CACHE_TTL = 300_000 // 5 minutes

// The exact GraphQL query from the official nouns-monorepo
const CANDIDATES_QUERY = `
query GetCandidateProposals($first: Int!) {
  proposalCandidates(first: $first, orderBy: createdTransactionHash, orderDirection: desc) {
    id
    slug
    proposer
    lastUpdatedTimestamp
    createdTransactionHash
    canceled
    latestVersion {
      content {
        title
        description
      }
    }
  }
}
`

// Simpler query in case the subgraph doesn't support all fields
const CANDIDATES_QUERY_SIMPLE = `
{
  proposalCandidates(first: 100, orderBy: createdTransactionHash, orderDirection: desc) {
    id
    slug
    proposer
    canceled
    latestVersion {
      content {
        title
        description
      }
    }
  }
}
`

async function querySubgraph(query: string, variables?: Record<string, any>): Promise<any> {
  for (const url of SUBGRAPH_URLS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      
      const body: any = { query }
      if (variables) body.variables = variables

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      
      if (!res.ok) {
        console.error(`Subgraph ${url} returned ${res.status}`)
        continue
      }
      
      const json = await res.json()
      
      if (json.errors) {
        console.error(`Subgraph ${url} errors:`, JSON.stringify(json.errors))
        continue
      }
      
      if (!json.data) {
        console.error(`Subgraph ${url} no data`)
        continue
      }
      
      console.log(`[v0] Candidates subgraph success from: ${url}, count: ${json.data?.proposalCandidates?.length || 0}`)
      return json.data
    } catch (e) {
      console.error(`Subgraph ${url} failed:`, e)
      continue
    }
  }
  throw new Error("All subgraph endpoints failed")
}

function parseTitle(description: string): string {
  if (!description) return ""
  const firstLine = description.split("\n")[0]
  return firstLine.replace(/^#+\s*/, "").trim() || ""
}

async function fetchCandidates(limit: number): Promise<any[]> {
  let data: any = null
  
  // Try the full query first
  try {
    data = await querySubgraph(CANDIDATES_QUERY, { first: limit })
  } catch {
    // Try simpler query as fallback
    try {
      data = await querySubgraph(CANDIDATES_QUERY_SIMPLE)
    } catch (e2) {
      throw e2
    }
  }

  const rawCandidates = data?.proposalCandidates || []
  
  // Filter out canceled candidates and format
  const candidates = rawCandidates
    .filter((c: any) => !c.canceled)
    .map((c: any, index: number) => {
      const content = c.latestVersion?.content || {}
      const title = content.title || parseTitle(content.description || "") || c.slug || "Untitled"
      
      return {
        id: c.id,
        slug: c.slug || "",
        proposer: c.proposer || "0x0000000000000000000000000000000000000000",
        title,
        description: (content.description || "").slice(0, 500),
        lastUpdatedTimestamp: Number(c.lastUpdatedTimestamp || 0),
        createdTransactionHash: c.createdTransactionHash || "",
        canceled: c.canceled || false,
        candidateNumber: rawCandidates.length - index,
      }
    })

  return candidates
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 200)

    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        candidates: cache.data.slice(0, limit),
        total: cache.data.length,
      })
    }

    const candidates = await fetchCandidates(200)

    // Cache the results
    cache = { data: candidates, timestamp: Date.now() }

    return NextResponse.json({
      candidates: candidates.slice(0, limit),
      total: candidates.length,
    })
  } catch (error) {
    console.error("Candidates fetch error:", error)
    return NextResponse.json({
      candidates: [],
      total: 0,
      error: "Failed to fetch candidates - subgraph may be unavailable",
    })
  }
}
