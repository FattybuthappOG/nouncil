import { NextResponse } from "next/server"

// Lil Nouns Subgraph ID on The Graph decentralized network
const LILNOUNS_SUBGRAPH_ID = "4FfnVdrSfBP54nhXVtoj3s2pT6vSRf39BjQyMWRSPDCp"

// Multiple endpoint options to try
const ENDPOINTS = [
  // The Graph Gateway (may require API key in header)
  `https://gateway.thegraph.com/api/subgraphs/id/${LILNOUNS_SUBGRAPH_ID}`,
  // Arbitrum gateway
  `https://gateway-arbitrum.network.thegraph.com/api/subgraphs/id/${LILNOUNS_SUBGRAPH_ID}`,
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query, variables } = body

    let lastError: Error | null = null

    // Try each endpoint until one works
    for (const endpoint of ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, variables }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data?.data) {
            return NextResponse.json(data)
          }
          // If we got a response but no data, check for errors
          if (data?.errors) {
            console.error(`[Lil Nouns API] Subgraph errors from ${endpoint}:`, data.errors)
            lastError = new Error(data.errors[0]?.message || "Subgraph query error")
            continue
          }
        } else {
          console.error(`[Lil Nouns API] HTTP error from ${endpoint}:`, response.status)
          lastError = new Error(`HTTP ${response.status}`)
        }
      } catch (e) {
        console.error(`[Lil Nouns API] Request failed for ${endpoint}:`, e)
        lastError = e as Error
      }
    }

    // All endpoints failed
    return NextResponse.json(
      { error: lastError?.message || "All subgraph endpoints failed", data: null },
      { status: 502 }
    )
  } catch (e) {
    console.error("[Lil Nouns API] Error:", e)
    return NextResponse.json({ error: "Internal server error", data: null }, { status: 500 })
  }
}
