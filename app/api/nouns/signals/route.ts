import { NextResponse } from "next/server"

// Goldsky subgraph endpoint (same as nouns.wtf uses - free, no API key)
const GOLDSKY_ENDPOINT = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn"

// Cache for signals
const cache: Map<string, { data: any; timestamp: number }> = new Map()
const CACHE_TTL = 60_000 // 1 minute cache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proposalId = searchParams.get("proposalId")
  const candidateId = searchParams.get("candidateId")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
  const offset = parseInt(searchParams.get("offset") || "0")

  if (!proposalId && !candidateId) {
    return NextResponse.json({ error: "proposalId or candidateId is required" }, { status: 400 })
  }

  const cacheKey = `signals-${proposalId || candidateId}-${limit}-${offset}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    let query: string
    let entityName: string

    if (proposalId) {
      // Query proposal feedback (signals)
      entityName = "proposalFeedbacks"
      query = `{
        proposalFeedbacks(
          first: ${limit}
          skip: ${offset}
          where: { proposal: "${proposalId}" }
          orderBy: createdTimestamp
          orderDirection: desc
        ) {
          id
          voter {
            id
          }
          supportDetailed
          reason
          votes
          createdTimestamp
          createdBlock
        }
      }`
    } else {
      // Query candidate feedback (signals)
      entityName = "candidateFeedbacks"
      query = `{
        candidateFeedbacks(
          first: ${limit}
          skip: ${offset}
          where: { candidate: "${candidateId}" }
          orderBy: createdTimestamp
          orderDirection: desc
        ) {
          id
          voter {
            id
          }
          supportDetailed
          reason
          votes
          createdTimestamp
          createdBlock
        }
      }`
    }

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

    const feedbacks = json.data?.[entityName] || []
    const signals = feedbacks.map((f: any) => ({
      id: f.id,
      voter: f.voter?.id || "0x0",
      support: f.supportDetailed, // 0 = Against, 1 = For, 2 = Abstain
      reason: f.reason || "",
      votes: Number(f.votes),
      timestamp: Number(f.createdTimestamp),
      blockNumber: Number(f.createdBlock),
    }))

    const result = {
      signals,
      total: signals.length,
      hasMore: signals.length === limit,
      offset,
      limit,
    }

    cache.set(cacheKey, { data: result, timestamp: Date.now() })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[signals] API error:", err.message)
    return NextResponse.json({
      signals: [],
      total: 0,
      hasMore: false,
      error: err.message,
    }, { status: 500 })
  }
}
