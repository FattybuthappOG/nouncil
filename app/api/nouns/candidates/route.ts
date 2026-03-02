import { NextResponse } from "next/server"

// Subgraph endpoints - try multiple sources
const SUBGRAPH_URLS = [
  "https://api.thegraph.com/subgraphs/name/nounsdao/nouns-subgraph",
  "https://subgraph.satsuma-prod.com/3b2ced13c8d91/nouns/nouns-subgraph/api",
  "https://api.studio.thegraph.com/query/94029/nouns-subgraph/version/latest",
]

// Cache
let cache: { data: any; timestamp: number } | null = null
const CACHE_TTL = 120_000 // 2 minutes

async function querySubgraph(query: string): Promise<any> {
  for (const url of SUBGRAPH_URLS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      
      if (!res.ok) continue
      
      const json = await res.json()
      if (json.errors || !json.data) continue
      
      return json.data
    } catch {
      continue
    }
  }
  
  throw new Error("All subgraph endpoints failed")
}

async function fetchCandidates(limit: number) {
  try {
    // Count total candidates first
    const countData = await querySubgraph(`{
      proposalCandidates(first: 1000, where: { canceled: false }) {
        id
      }
    }`)
    
    const totalCount = countData?.proposalCandidates?.length || 0

    // Fetch paginated candidates with full details
    const data = await querySubgraph(`{
      proposalCandidates(first: ${limit}, orderBy: lastUpdatedTimestamp, orderDirection: desc, where: { canceled: false }) {
        id
        slug
        proposer
        lastUpdatedTimestamp
        createdTransactionHash
        canceled
        versions {
          content {
            title
          }
        }
        latestVersion {
          content {
            title
            description
            targets
            values
            signatures
            calldatas
          }
        }
      }
    }`)

    if (!data?.proposalCandidates || !Array.isArray(data.proposalCandidates)) {
      return { candidates: [], total: 0 }
    }

    const candidates = data.proposalCandidates.map((c: any, index: number) => ({
      id: c.id,
      slug: c.slug || "",
      proposer: c.proposer || "0x0000000000000000000000000000000000000000",
      title: c.latestVersion?.content?.title || "",
      description: c.latestVersion?.content?.description || "",
      targets: c.latestVersion?.content?.targets || [],
      values: c.latestVersion?.content?.values || [],
      signatures: c.latestVersion?.content?.signatures || [],
      calldatas: c.latestVersion?.content?.calldatas || [],
      candidateNumber: totalCount - index,
      createdTimestamp: Number.parseInt(c.lastUpdatedTimestamp || "0") * 1000,
      createdTransactionHash: c.createdTransactionHash || "",
      canceled: c.canceled,
    }))

    return { candidates, total: totalCount }
  } catch (error) {
    return { candidates: [], total: 0 }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      const cached = cache.data
      return NextResponse.json({
        candidates: cached.candidates.slice(0, limit),
        total: cached.total,
      })
    }

    // Fetch fresh data (cache up to 100)
    const result = await fetchCandidates(100)
    cache = { data: result, timestamp: Date.now() }

    return NextResponse.json({
      candidates: result.candidates.slice(0, limit),
      total: result.total,
    })
  } catch (error) {
    return NextResponse.json(
      { candidates: [], total: 0 },
      { status: 500 }
    )
  }
}
