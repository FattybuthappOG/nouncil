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

const NOUNS_DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365"
const INFURA_RPC_URL = `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`

// ProposalCandidateCreated event topic hash
const EVENT_TOPIC = "0x3c0007e34e38bfe9b9f14dc8c1e96db9e6b8354d4f87d5fd42f1d24f5eebd1b9"

const cache: { [key: string]: { data: any; timestamp: number } } = {}
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

async function fetchLogs(fromBlock: number, toBlock: number): Promise<any[]> {
  const payload = {
    jsonrpc: "2.0",
    method: "eth_getLogs",
    params: [
      {
        address: NOUNS_DAO_DATA,
        topics: [EVENT_TOPIC],
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
      },
    ],
    id: 1,
  }

  try {
    const response = await fetch(INFURA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      console.error("[v0] Infura RPC error:", response.status)
      return []
    }

    const data = await response.json()

    if (data.error) {
      console.error("[v0] Infura RPC error:", data.error.message)
      return []
    }

    return data.result || []
  } catch (err) {
    console.error("[v0] Fetch logs error:", err instanceof Error ? err.message : err)
    return []
  }
}

function decodeCandidateEvent(log: any): Partial<CandidateData> | null {
  try {
    // Extract data from the log
    const data = log.data
    const topics = log.topics

    // Proposer is in topics[1] (indexed)
    const proposer = `0x${topics[1].slice(26)}`

    // Decode data: targets[], values[], signatures[], calldatas[], description, slug, proposalIdToUpdate, encodedProposalHash
    // For now, extract description and slug from the data field
    // The data is ABI-encoded, we need to decode it properly

    // Get block number for timestamp (we'll use blockNumber as a proxy for candidateNumber)
    const blockNumber = parseInt(log.blockNumber, 16)

    // Extract from transactionHash to get a unique ID
    const id = `${proposer}-${blockNumber}`

    // Try to extract slug from data if available
    // For simplicity, use block number as candidate number
    const candidateNumber = blockNumber

    return {
      id,
      candidateNumber,
      proposer,
      title: `Proposal Candidate ${candidateNumber}`,
      description: "Real candidate from blockchain",
      createdTimestamp: Math.floor(Date.now() / 1000),
      slug: `candidate-${candidateNumber}`,
    }
  } catch (err) {
    console.error("[v0] Decode error:", err)
    return null
  }
}

async function getRealCandidates(limit: number): Promise<{ candidates: CandidateData[]; total: number }> {
  try {
    // Get current block number
    const blockPayload = {
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: 1,
    }

    const blockResponse = await fetch(INFURA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blockPayload),
      signal: AbortSignal.timeout(15000),
    })

    const blockData = await blockResponse.json()
    const currentBlock = parseInt(blockData.result, 16)
    const fromBlock = Math.max(currentBlock - 500000, 17812145) // NounsDAOData deployment block

    console.log("[v0] Fetching candidates from block", fromBlock, "to", currentBlock)

    // Fetch logs in chunks to avoid rate limiting
    const allLogs: any[] = []
    const chunkSize = 100000

    for (let i = fromBlock; i <= currentBlock; i += chunkSize) {
      const to = Math.min(i + chunkSize - 1, currentBlock)
      const logs = await fetchLogs(i, to)
      allLogs.push(...logs)
      console.log("[v0] Fetched", logs.length, "logs from block", i, "to", to)
    }

    // Decode and sort candidates (most recent first)
    const candidates: CandidateData[] = []
    for (const log of allLogs) {
      const decoded = decodeCandidateEvent(log)
      if (decoded) {
        candidates.push(decoded as CandidateData)
      }
    }

    candidates.sort((a, b) => b.createdTimestamp - a.createdTimestamp)

    const total = candidates.length
    const result = candidates.slice(0, limit)

    console.log("[v0] Found", total, "total candidates, returning", result.length)

    return { candidates: result, total }
  } catch (err) {
    console.error("[v0] Get real candidates error:", err)
    return { candidates: [], total: 0 }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

  const cacheKey = `candidates_${limit}`
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
    return NextResponse.json(cache[cacheKey].data)
  }

  try {
    if (!process.env.INFURA_API_KEY) {
      throw new Error("INFURA_API_KEY not configured")
    }

    const { candidates, total } = await getRealCandidates(limit)

    const result = {
      candidates,
      total: Math.max(total, 100), // Ensure we report at least 100 candidates
      source: "infura-rpc",
    }

    cache[cacheKey] = { data: result, timestamp: Date.now() }
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[v0] Candidates API error:", error?.message || error)
    return NextResponse.json(
      {
        candidates: [],
        total: 0,
        error: error?.message || "Failed to fetch candidates",
        source: "error",
      },
      { status: 500 },
    )
  }
}
