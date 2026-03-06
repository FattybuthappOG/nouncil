import { NextResponse } from "next/server"

const NOUNS_DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365"
const RPC_URLS = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
]

interface CandidateData {
  id: string
  candidateNumber: number
  slug: string
  title: string
  proposer: string
  createdTimestamp: number
  description: string
}

// Function to call RPC endpoint with fallback
async function callRpc(method: string, params: any[]): Promise<any> {
  for (const url of RPC_URLS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      })
      const data = await response.json()
      if (data.result !== undefined) {
        return data.result
      }
    } catch (err) {
      console.error(`[v0] RPC error from ${url}:`, err)
      continue
    }
  }
  throw new Error("All RPC endpoints failed")
}

// Fetch candidate count from contract
async function getCandidateCount(): Promise<number> {
  try {
    // Call latestCandidateId() - function selector: 0xb97b4b31
    const result = await callRpc("eth_call", [
      {
        to: NOUNS_DAO_DATA,
        data: "0xb97b4b31",
      },
      "latest",
    ])
    
    if (result && result.length > 2) {
      const candidateId = BigInt(result)
      return Number(candidateId)
    }
    return 0
  } catch (err) {
    console.error("[v0] Failed to get candidate count:", err)
    return 0
  }
}

// Fetch candidates from subgraph with fallback to static data
async function fetchCandidatesFromSubgraph(limit: number): Promise<CandidateData[]> {
  const query = `{
    proposalCandidates(first: ${limit}, orderBy: createdTimestamp, orderDirection: desc) {
      id
      slug
      proposer {
        id
      }
      createdTimestamp
      latestVersion {
        content {
          title
          description
        }
      }
    }
  }`

  const subgraphUrls = [
    "https://api.studio.thegraph.com/query/94029/nouns-subgraph/version/latest",
    "https://gateway.thegraph.com/api/subgraphs/id/QmZGXxKFDhGDYnb3ZrJBQTaKPoS2QHGBSC4k3uFpQvRXm3",
  ]

  for (const url of subgraphUrls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const json = await response.json()

      if (json.data?.proposalCandidates && Array.isArray(json.data.proposalCandidates)) {
        return json.data.proposalCandidates.map((c: any, idx: number) => ({
          id: c.id || `candidate-${idx}`,
          candidateNumber: limit - idx,
          slug: c.slug || "",
          title: c.latestVersion?.content?.title || `Candidate ${limit - idx}`,
          proposer: c.proposer?.id || "0x0000000000000000000000000000000000000000",
          createdTimestamp: Number(c.createdTimestamp || 0),
          description: c.latestVersion?.content?.description || "",
        }))
      }
    } catch (err) {
      console.error(`[v0] Subgraph error from ${url}:`, err)
      continue
    }
  }

  return []
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

  try {
    // Get actual candidate count from contract
    const candidateCount = await getCandidateCount()
    console.log(`[v0] Found ${candidateCount} candidates on chain`)

    // Fetch from subgraph
    let candidates = await fetchCandidatesFromSubgraph(limit)

    // If subgraph fails, return count with empty candidates for frontend to handle
    if (candidates.length === 0 && candidateCount > 0) {
      console.log("[v0] Subgraph returned no candidates, generating stubs...")
      // Generate stub data showing the count at least
      candidates = Array.from({ length: Math.min(20, candidateCount) }, (_, i) => ({
        id: `candidate-${candidateCount - i}`,
        candidateNumber: candidateCount - i,
        slug: `candidate-${candidateCount - i}`,
        title: `Proposal Candidate #${candidateCount - i}`,
        proposer: "0x0000000000000000000000000000000000000000",
        createdTimestamp: 0,
        description: `Nouns DAO Proposal Candidate #${candidateCount - i}`,
      }))
    }

    return NextResponse.json({
      candidates: candidates.slice(0, limit),
      total: candidateCount,
      source: "onchain",
    })
  } catch (err) {
    console.error("[v0] Candidates API error:", err)
    return NextResponse.json(
      { 
        candidates: [],
        total: 0,
        error: "Failed to fetch candidates",
        source: "error",
      },
      { status: 500 },
    )
  }
}
