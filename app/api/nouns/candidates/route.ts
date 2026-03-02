import { NextResponse } from "next/server"

// Cache
let cache: { data: any; timestamp: number } | null = null
const CACHE_TTL = 120_000 // 2 minutes

async function fetchCandidates(limit: number) {
  try {
    // Use nouns.biz REST API which has reliable candidates data
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    
    const res = await fetch("https://api.nouns.biz/candidates", {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}`)
    }
    
    const data = await res.json()
    
    if (!Array.isArray(data)) {
      throw new Error("Invalid response format")
    }

    // Transform API response to our format
    const candidates = data.map((c: any, index: number) => ({
      id: c.id || `${c.proposer}-${c.slug}`,
      slug: c.slug || "",
      proposer: c.proposer || "0x0000000000000000000000000000000000000000",
      title: c.title || c.description?.split("\n")[0] || "",
      description: c.description || "",
      targets: c.targets || [],
      values: c.values || [],
      signatures: c.signatures || [],
      calldatas: c.calldatas || [],
      candidateNumber: (data.length - index),
      createdTimestamp: c.createdTimestamp ? Number.parseInt(c.createdTimestamp) * 1000 : 0,
      createdTransactionHash: c.createdTransactionHash || "",
      canceled: c.canceled || false,
    }))

    return { 
      candidates: candidates.slice(0, limit), 
      total: candidates.length 
    }
  } catch (error) {
    console.error("[v0] Error fetching from nouns.biz:", error)
    return { candidates: [], total: 0 }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        candidates: cache.data.candidates.slice(0, limit),
        total: cache.data.total,
      })
    }

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
