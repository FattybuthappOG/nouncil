import { NextResponse } from "next/server"

interface CandidateData {
  id: string
  candidateNumber: number
  proposer: string
  title: string
  description: string
  createdTimestamp: number
  slug: string
}

// Cached candidates only - no external API calls
const cache: Record<string, { data: any; ts: number }> = {
  candidates_all: {
    data: [
      {
        id: "example-1",
        candidateNumber: 1,
        proposer: "0x2d2b12313d3d9b241d8a04f270d5ad6a0e3aa0e0",
        title: "Example Candidate 1",
        description: "# Example Candidate\n\nThis is placeholder candidate data while data sources are unavailable.",
        createdTimestamp: 17812145,
        slug: "example-candidate-1"
      },
      {
        id: "example-2",
        candidateNumber: 2,
        proposer: "0x1d1c11213c2c8a130c0f26051d4d991d9d33a0c0",
        title: "Example Candidate 2",
        description: "# Another Candidate\n\nPlaceholder for demonstration.",
        createdTimestamp: 17811000,
        slug: "example-candidate-2"
      }
    ],
    ts: Date.now()
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"))
  
  const cacheKey = "candidates_all"
  const cached = cache[cacheKey]

  if (!cached) {
    return NextResponse.json({
      candidates: [],
      total: 0,
      hasMore: false,
      offset,
      limit,
      message: "No candidate data available"
    })
  }

  const allCandidates = cached.data
  const total = allCandidates.length
  const hasMore = total > offset + limit
  const paginatedCandidates = allCandidates.slice(offset, offset + limit)

  return NextResponse.json({
    candidates: paginatedCandidates,
    total,
    hasMore,
    offset,
    limit,
    message: "Serving cached candidate data. Live updates unavailable."
  })
}
