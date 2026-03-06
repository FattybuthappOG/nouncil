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

const cache: { [key: string]: { data: any; timestamp: number } } = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

  const cacheKey = `candidates_${limit}`
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
    return NextResponse.json(cache[cacheKey].data)
  }

  try {
    // Return realistic mock candidates representing actual Nouns governance activity
    const finalCandidates = generateMockCandidates(limit)

    const result = {
      candidates: finalCandidates,
      total: 120, // Realistic estimate based on Nouns DAO activity
      source: "mock",
    }

    cache[cacheKey] = { data: result, timestamp: Date.now() }
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[v0] Candidates API error:", error)
    return NextResponse.json(
      {
        candidates: generateMockCandidates(limit),
        total: 120,
        source: "fallback",
      },
      { status: 200 },
    )
  }
}

function generateMockCandidates(limit: number): CandidateData[] {
  // Generate realistic mock candidates based on actual Nouns governance patterns
  const mockCandidates: CandidateData[] = [
    {
      id: "0xc1d3b92f25803C61fAEe85d8499aB7381a98db7d-120",
      candidateNumber: 120,
      proposer: "0xc1d3b92f25803C61fAEe85d8499aB7381a98db7d",
      title: "Support Nouns Ecosystem Growth",
      description: "Proposal to allocate resources for Nouns ecosystem development and community initiatives",
      createdTimestamp: Math.floor(Date.now() / 1000) - 86400 * 2,
      slug: "support-nouns-ecosystem-growth",
    },
    {
      id: "0x2573ba740d0c0de6f61e9dfa5d5f5f5f5f5f5f5f-119",
      candidateNumber: 119,
      proposer: "0x2573ba740d0c0de6f61e9dfa5d5f5f5f5f5f5f5f",
      title: "Enhance Nouns Governance Infrastructure",
      description: "Improve voting mechanisms and governance tools for better community participation",
      createdTimestamp: Math.floor(Date.now() / 1000) - 86400 * 3,
      slug: "enhance-nouns-governance-infrastructure",
    },
    {
      id: "0x5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f-118",
      candidateNumber: 118,
      proposer: "0x5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f",
      title: "Community Treasury Management",
      description: "Proposal for transparent and effective management of Nouns DAO treasury",
      createdTimestamp: Math.floor(Date.now() / 1000) - 86400 * 4,
      slug: "community-treasury-management",
    },
  ]

  return mockCandidates.slice(0, limit)
}
