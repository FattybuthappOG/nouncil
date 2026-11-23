import { NextResponse } from "next/server"

const GOLDSKY_URL = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn"
const CACHE_TTL = 120_000

interface Candidate {
  id: string
  candidateNumber: number
  slug: string
  proposer: string
  title: string
  description: string
  targets: string[]
  values: string[]
  signatures: string[]
  calldatas: string[]
  createdTimestamp: number
  createdTransactionHash: string
  canceled: boolean
}

let candidateCache: { candidates: Candidate[]; total: number; timestamp: number } | undefined

function parseTitle(description: string): string {
  if (!description) return "Untitled Candidate"
  const heading = description.split("\n").map((line) => line.trim()).find((line) => line.startsWith("#"))
  if (heading) return heading.replace(/^#+\s*/, "").trim()
  return description.split("\n").map((line) => line.trim()).find((line) => line && !line.startsWith("![") && !line.startsWith("http"))?.slice(0, 100) || "Untitled Candidate"
}

async function fetchCandidates(): Promise<{ candidates: Candidate[]; total: number }> {
  const query = `{
    proposalCandidates(first: 100, orderBy: number, orderDirection: desc, where: { canceled: false }) {
      id
      number
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

  try {
    const response = await fetch(GOLDSKY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 120 },
    })

    if (!response.ok) throw new Error(`Goldsky responded with ${response.status}`)
    const json = await response.json()
    if (json.errors?.length) throw new Error("Goldsky returned a GraphQL error")

    const rawCandidates = json.data?.proposalCandidates || []
    const candidates: Candidate[] = rawCandidates.map((candidate: any) => {
      const content = candidate.latestVersion?.content
      const description = content?.description || ""
      return {
        id: candidate.id,
        candidateNumber: Number(candidate.number),
        slug: candidate.slug || "",
        proposer: candidate.proposer || "",
        title: content?.title || parseTitle(description || candidate.slug || ""),
        description,
        targets: content?.targets || [],
        values: content?.values || [],
        signatures: content?.signatures || [],
        calldatas: content?.calldatas || [],
        createdTimestamp: Number(candidate.createdTimestamp || 0),
        createdTransactionHash: candidate.createdTransactionHash || "",
        canceled: Boolean(candidate.canceled),
      }
    })

    return { candidates, total: candidates.length ? Math.max(...candidates.map((candidate) => candidate.candidateNumber)) : 0 }
  } catch (error) {
    console.error("[candidates] Failed to fetch from Goldsky:", error)
    throw error
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "20", 10)
  const requestedOffset = Number.parseInt(searchParams.get("offset") || "0", 10)
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 100)) : 20
  const offset = Number.isFinite(requestedOffset) ? Math.max(0, requestedOffset) : 0

  if (!candidateCache || Date.now() - candidateCache.timestamp >= CACHE_TTL) {
    try {
      const result = await fetchCandidates()
      candidateCache = { ...result, timestamp: Date.now() }
    } catch {
      if (!candidateCache) {
        return NextResponse.json({ candidates: [], total: 0, hasMore: false, offset, limit, error: "Candidate data is temporarily unavailable" }, { status: 503 })
      }
    }
  }

  const { candidates, total } = candidateCache
  return NextResponse.json({
    candidates: candidates.slice(offset, offset + limit),
    total,
    hasMore: offset + limit < candidates.length,
    offset,
    limit,
  })
}
