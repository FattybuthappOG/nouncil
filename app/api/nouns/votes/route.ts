import { NextResponse } from "next/server"

// Goldsky subgraph endpoint (same as nouns.wtf uses - free, no API key)
const GOLDSKY_ENDPOINT = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn"

// Cache for votes
const cache: Map<string, { data: any; timestamp: number }> = new Map()
const CACHE_TTL = 60_000 // 1 minute cache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proposalId = searchParams.get("proposalId")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
  const offset = parseInt(searchParams.get("offset") || "0")

  if (!proposalId) {
    return NextResponse.json({ error: "proposalId is required" }, { status: 400 })
  }

  const cacheKey = `votes-${proposalId}-${limit}-${offset}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    // Query votes for the proposal
    const query = `{
      votes(
        first: ${limit}
        skip: ${offset}
        where: { proposal: "${proposalId}" }
        orderBy: blockNumber
        orderDirection: desc
      ) {
        id
        voter {
          id
        }
        support
        votes
        reason
        blockNumber
        blockTimestamp
      }
    }`

    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      throw new Error(`Goldsky returned ${response.status}`)
    }

    const json = await response.json()

    if (json.errors) {
      throw new Error(json.errors[0]?.message || "GraphQL error")
    }

    const votes = (json.data?.votes || []).map((v: any) => ({
      id: v.id,
      voter: v.voter?.id || "0x0",
      support: v.support, // 0 = Against, 1 = For, 2 = Abstain
      votes: Number(v.votes),
      reason: v.reason || "",
      blockNumber: Number(v.blockNumber),
      timestamp: Number(v.blockTimestamp),
    }))

    const result = {
      votes,
      total: votes.length,
      hasMore: votes.length === limit,
      offset,
      limit,
    }

    cache.set(cacheKey, { data: result, timestamp: Date.now() })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[votes] API error:", err.message)
    return NextResponse.json({
      votes: [],
      total: 0,
      hasMore: false,
      error: err.message,
    }, { status: 500 })
  }
}
