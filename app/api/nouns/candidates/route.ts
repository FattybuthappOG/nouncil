import { NextResponse } from "next/server"

// Cache for candidates
let cache: { data: any[]; timestamp: number } | null = null
const CACHE_TTL = 180_000 // 3 minutes

async function fetchFromSubgraph(query: string) {
  const endpoints = [
    "https://api.thegraph.com/subgraphs/name/nounsdao/nouns-subgraph",
    "https://subgraph.satsuma-prod.com/3b2ced13c8d91/nouns/nouns-subgraph/api",
  ]

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) continue

      const json = await response.json()
      if (json.errors) continue
      if (!json.data) continue

      return json.data
    } catch {
      continue
    }
  }

  return null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        candidates: cache.data.slice(0, limit),
        total: cache.data.length,
      })
    }

    // Query candidates
    const query = `{
      proposalCandidates(first: 1000, orderBy: createdTimestamp, orderDirection: desc, where: { canceled: false }) {
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
            targets
            values
            signatures
            calldatas
          }
        }
      }
    }`

    const data = await fetchFromSubgraph(query)

    let candidates: any[] = []
    
    if (data?.proposalCandidates && Array.isArray(data.proposalCandidates)) {
      const total = data.proposalCandidates.length
      candidates = data.proposalCandidates.map((c: any, index: number) => ({
        id: c.id,
        slug: c.slug || "",
        proposer: c.proposer || "0x0000000000000000000000000000000000000000",
        title: c.latestVersion?.content?.title || "",
        description: c.latestVersion?.content?.description || "",
        targets: c.latestVersion?.content?.targets || [],
        values: c.latestVersion?.content?.values || [],
        signatures: c.latestVersion?.content?.signatures || [],
        calldatas: c.latestVersion?.content?.calldatas || [],
        candidateNumber: total - index,
        createdTimestamp: Number.parseInt(c.createdTimestamp || "0") * 1000,
        createdTransactionHash: c.createdTransactionHash || "",
        canceled: c.canceled,
      }))

      // Cache the results
      cache = { data: candidates, timestamp: Date.now() }
    }

    return NextResponse.json({
      candidates: candidates.slice(0, limit),
      total: candidates.length,
    })
  } catch {
    return NextResponse.json({
      candidates: [],
      total: 0,
    })
  }
}
