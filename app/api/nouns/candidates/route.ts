import { NextResponse } from "next/server"

// NounsDAOData (Proxy) contract - emits ProposalCandidateCreated/Canceled events
const NOUNS_DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365"

// RPC endpoints - ordered by reliability
const RPC_URLS = [
  process.env.ETH_RPC_URL,
  "https://ethereum-rpc.publicnode.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
  "https://rpc.ankr.com/eth",
].filter(Boolean) as string[]

// Event signatures
// ProposalCandidateCreated(address indexed msgSender, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, string slug, bytes32 encodedProposalHash)
const CANDIDATE_CREATED_TOPIC = "0x39f6ee14d478e1f642b4ee25f54d4b4b83b5eb2a287299aaa0826b4b3e31bb51"
// ProposalCandidateCanceled(address indexed msgSender, string slug)
const CANDIDATE_CANCELED_TOPIC = "0xa1acbc5d5efd41ae6f23ae1ab4efcee843b741c0a12ce84d1ec6a4b7830e08ef2"

// Cache
let cache: { data: any; timestamp: number } | null = null
const CACHE_TTL = 120_000 // 2 minutes

async function rpcCall(method: string, params: any[]): Promise<any> {
  for (const url of RPC_URLS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) continue
      const json = await res.json()
      if (json.error) continue
      return json.result
    } catch {
      continue
    }
  }
  throw new Error("All RPC endpoints failed")
}

function decodeString(hex: string, offset: number): string {
  // Read string offset pointer
  const strOffset = parseInt(hex.slice(offset * 2, offset * 2 + 64), 16) * 2
  // Read string length
  const strLen = parseInt(hex.slice(strOffset, strOffset + 64), 16)
  // Read string data
  const strData = hex.slice(strOffset + 64, strOffset + 64 + strLen * 2)
  try {
    return decodeURIComponent(
      strData.replace(/../g, (m: string) => "%" + m)
    )
  } catch {
    return ""
  }
}

async function fetchCandidatesFromLogs(limit: number) {
  // Get current block number
  const latestBlock = await rpcCall("eth_blockNumber", [])
  const currentBlock = parseInt(latestBlock, 16)
  
  // Search last ~90 days of blocks (approximately 648000 blocks at 12s per block)
  const fromBlock = Math.max(0, currentBlock - 648000)
  
  // Fetch ProposalCandidateCreated events
  const logs = await rpcCall("eth_getLogs", [{
    address: NOUNS_DAO_DATA,
    topics: [CANDIDATE_CREATED_TOPIC],
    fromBlock: "0x" + fromBlock.toString(16),
    toBlock: "latest",
  }])

  if (!logs || !Array.isArray(logs)) {
    return { candidates: [], total: 0 }
  }

  // Parse the logs - extract proposer from topic[1] and decode description/slug from data
  const candidates = logs.map((log: any, index: number) => {
    const proposer = "0x" + (log.topics[1] ? log.topics[1].slice(26) : "0000000000000000000000000000000000000000")
    const blockNumber = parseInt(log.blockNumber, 16)
    const txHash = log.transactionHash
    
    // The data field contains ABI-encoded: targets[], values[], signatures[], calldatas[], description, slug, encodedProposalHash
    // We need description (index 4) and slug (index 5)
    let title = ""
    let description = ""
    let slug = ""
    
    try {
      const data = log.data.slice(2) // remove 0x
      
      // ABI decoding: each field is a 32-byte offset pointer for dynamic types
      // Field offsets are at positions 0, 32, 64, 96, 128, 160, 192 (bytes)
      // = positions 0, 64, 128, 192, 256, 320, 384 (hex chars)
      
      // Description offset is at position 4 (index 4) = 256 hex chars from start
      const descOffset = parseInt(data.slice(256, 320), 16) * 2
      if (descOffset && descOffset < data.length) {
        const descLen = parseInt(data.slice(descOffset, descOffset + 64), 16)
        if (descLen > 0 && descLen < 100000) {
          const descHex = data.slice(descOffset + 64, descOffset + 64 + descLen * 2)
          try {
            description = decodeURIComponent(descHex.replace(/../g, (m: string) => "%" + m))
            // Extract title from first line
            title = description.split("\n")[0].replace(/^#+\s*/, "").trim()
          } catch {
            description = ""
          }
        }
      }
      
      // Slug offset is at position 5 (index 5) = 320 hex chars from start
      const slugOffset = parseInt(data.slice(320, 384), 16) * 2
      if (slugOffset && slugOffset < data.length) {
        const slugLen = parseInt(data.slice(slugOffset, slugOffset + 64), 16)
        if (slugLen > 0 && slugLen < 10000) {
          const slugHex = data.slice(slugOffset + 64, slugOffset + 64 + slugLen * 2)
          try {
            slug = decodeURIComponent(slugHex.replace(/../g, (m: string) => "%" + m))
          } catch {
            slug = ""
          }
        }
      }
    } catch {
      // ABI decoding failed - skip this candidate
    }

    return {
      id: `${proposer.toLowerCase()}-${slug}`,
      slug,
      proposer,
      title: title || slug || `Candidate`,
      description,
      createdTimestamp: 0, // Will be filled from block
      createdTransactionHash: txHash,
      canceled: false,
      blockNumber,
      candidateNumber: 0, // Will be assigned after sorting
    }
  })

  // Sort by block number descending (newest first) and assign candidate numbers
  candidates.sort((a: any, b: any) => b.blockNumber - a.blockNumber)
  const total = candidates.length
  candidates.forEach((c: any, i: number) => {
    c.candidateNumber = total - i
  })

  // Return only the requested limit
  return {
    candidates: candidates.slice(0, limit),
    total,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      const cached = cache.data
      return NextResponse.json({
        candidates: cached.candidates.slice(0, limit),
        total: cached.total,
      })
    }

    const result = await fetchCandidatesFromLogs(100) // Fetch up to 100, cache them

    cache = { data: result, timestamp: Date.now() }

    return NextResponse.json({
      candidates: result.candidates.slice(0, limit),
      total: result.total,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch candidates", candidates: [], total: 0 },
      { status: 500 },
    )
  }
}
