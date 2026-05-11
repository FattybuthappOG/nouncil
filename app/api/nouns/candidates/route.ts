import { NextResponse } from "next/server"

// Candidates data is currently not available without a paid Graph API key.
// The Graph's decentralized network (required for subgraph queries) requires paid subscriptions.
// Users should view candidates on nouns.wtf or nouns.camp instead.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"))

  // Return a helpful response directing users to official sources
  return NextResponse.json({
    candidates: [],
    total: 0,
    hasMore: false,
    offset,
    limit,
    unavailable: true,
    message: "Candidates are viewable and creatable on nouns.wtf and nouns.camp. This interface supports creating proposals directly.",
    externalUrls: {
      viewCandidates: "https://nouns.wtf/vote#candidates",
      createOnCamp: "https://nouns.camp",
      createOnWtf: "https://nouns.wtf/vote"
    }
  })
}
