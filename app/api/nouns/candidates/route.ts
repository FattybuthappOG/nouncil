import { NextResponse } from "next/server"

// Candidates viewing requires access to the Nouns subgraph which is currently unavailable.
// The subgraph was deprecated in favor of nouns-api (self-hosted), and public access to the decentralized network requires paid API keys.
// Users should view existing candidates on nouns.wtf, but can create new candidates through this interface.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"))

  // Return a message to users explaining the situation
  return NextResponse.json({
    candidates: [],
    total: 0,
    hasMore: false,
    offset,
    limit,
    unavailable: true,
    message: "View existing candidates on nouns.wtf or create a new proposal candidate below.",
    externalUrl: "https://nouns.wtf/vote#candidates"
  })
}
