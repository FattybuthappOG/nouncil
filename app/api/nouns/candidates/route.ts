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
      console.log("[v0] Trying endpoint:", endpoint)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      console.log("[v0] Response status from", endpoint, ":", response.status)
      
      if (!response.ok) {
        console.log("[v0] Response not OK, skipping")
        continue
      }

      const json = await response.json()
      console.log("[v0] Got JSON response, errors?", !!json.errors, "data?", !!json.data)
      
      if (json.errors) {
        console.log("[v0] GraphQL errors:", json.errors)
        continue
      }
      if (!json.data) {
        console.log("[v0] No data field in response")
        continue
      }

      console.log("[v0] Successfully got data from", endpoint)
      return json.data
    } catch (error) {
      console.log("[v0] Fetch failed for", endpoint, ":", error)
      continue
    }
  }

  console.log("[v0] All endpoints failed")
  return null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      console.log("[v0] Returning cached candidates:", cache.data.length)
      return NextResponse.json({
        candidates: cache.data.slice(0, limit),
        total: cache.data.length,
      })
    }

    console.log("[v0] Fetching candidates from subgraph...")
    
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
    console.log("[v0] Subgraph response:", data?.proposalCandidates?.length || 0, "candidates")

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
      console.log("[v0] Cached", candidates.length, "candidates")
    }

    console.log("[v0] Returning", candidates.length, "candidates to client")
    return NextResponse.json({
      candidates: candidates.slice(0, limit),
      total: candidates.length,
    })
  } catch (error) {
    console.error("[v0] Candidates API error:", error)
    return NextResponse.json({
      candidates: [],
      total: 0,
    })
  }
}
