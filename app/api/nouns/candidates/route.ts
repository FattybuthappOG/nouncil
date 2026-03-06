import { NextResponse } from "next/server"

// NounsDAOData contract - handles proposal candidates
const NOUNS_DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365"
// Start block for NounsDAOData deployment
const START_BLOCK = 17812145

// RPC endpoints - same as proposals route
const RPC_URLS = [
  process.env.ETH_RPC_URL,
  "https://ethereum-rpc.publicnode.com",
  "https://cloudflare-eth.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
].filter(Boolean) as string[]

// Event signatures
// ProposalCandidateCreated(address msgSender, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, string slug, uint256 proposalIdToUpdate, bytes32 encodedProposalHash)
const CANDIDATE_CREATED_TOPIC = "0xf67e91ee937593d77e556ef8fabc5d65cfab21c3f41683c8b3ab8b8a89e6ce2c"
// ProposalCandidateCanceled(address msgSender, string slug)
const CANDIDATE_CANCELED_TOPIC = "0x3e0f78e0b1948a2a4a5c3c55d0e29e0a82f54ff35381beedbc7ad9d60a07e3b1"

// Cache for candidates
let cache: { data: any[]; timestamp: number } | null = null
const CACHE_TTL = 300_000 // 5 minutes

async function rpcCall(method: string, params: any[]): Promise<any> {
  for (const url of RPC_URLS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method,
          params,
          id: 1,
        }),
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

// Decode address from 32-byte hex (first 12 bytes are padding)
function decodeAddress(hex: string): string {
  return "0x" + hex.slice(26)
}

// Decode a string from ABI-encoded data
function decodeString(data: string, offset: number): string {
  // offset points to where the length of the string is stored
  const lenHex = data.slice(offset * 2, offset * 2 + 64)
  const len = parseInt(lenHex, 16)
  if (len === 0 || len > 10000) return ""
  const strHex = data.slice(offset * 2 + 64, offset * 2 + 64 + len * 2)
  try {
    // Decode hex to UTF-8
    const bytes = []
    for (let i = 0; i < strHex.length; i += 2) {
      bytes.push(parseInt(strHex.slice(i, i + 2), 16))
    }
    return new TextDecoder().decode(new Uint8Array(bytes))
  } catch {
    return ""
  }
}

// Parse title from description (first line, strip markdown)
function parseTitle(description: string): string {
  if (!description) return ""
  const firstLine = description.split("\n")[0]
  return firstLine.replace(/^#+\s*/, "").trim() || ""
}

async function fetchCandidatesFromEvents(): Promise<any[]> {
  // Get current block number
  const latestBlockHex = await rpcCall("eth_blockNumber", [])
  const latestBlock = parseInt(latestBlockHex, 16)
  
  // Only look at last ~90 days of blocks (~648000 blocks) to minimize RPC load
  const fromBlock = Math.max(START_BLOCK, latestBlock - 648000)
  
  // Fetch created events
  const createdLogs = await rpcCall("eth_getLogs", [{
    address: NOUNS_DAO_DATA,
    topics: [CANDIDATE_CREATED_TOPIC],
    fromBlock: "0x" + fromBlock.toString(16),
    toBlock: "latest",
  }])

  // Fetch canceled events
  const canceledLogs = await rpcCall("eth_getLogs", [{
    address: NOUNS_DAO_DATA,
    topics: [CANDIDATE_CANCELED_TOPIC],
    fromBlock: "0x" + fromBlock.toString(16),
    toBlock: "latest",
  }])

  // Build set of canceled candidate keys (proposer-slug)
  const canceledSet = new Set<string>()
  for (const log of canceledLogs || []) {
    try {
      const proposer = decodeAddress(log.topics[1] || log.data.slice(2, 66))
      // For canceled events, the slug is in the data
      canceledSet.add(proposer.toLowerCase() + "-canceled")
    } catch {
      // skip malformed
    }
  }

  // Parse created events
  const candidates: any[] = []
  
  for (const log of createdLogs || []) {
    try {
      const data = log.data.slice(2) // remove 0x
      const blockNumber = parseInt(log.blockNumber, 16)
      const txHash = log.transactionHash
      
      // The first topic after the event signature is the msgSender (proposer)
      // In the event data, we need to decode the ABI-encoded parameters
      // The structure is complex with dynamic arrays and strings
      // Let's extract the key fields we need

      // Read the data offsets (each is 32 bytes / 64 hex chars)
      // Word 0: offset to targets array
      // Word 1: offset to values array
      // Word 2: offset to signatures array
      // Word 3: offset to calldatas array
      // Word 4: offset to description string
      // Word 5: offset to slug string
      // Word 6: proposalIdToUpdate
      // Word 7: encodedProposalHash
      
      // First, get the proposer from the first indexed topic
      const proposer = log.topics && log.topics[1] 
        ? decodeAddress(log.topics[1]) 
        : decodeAddress(data.slice(0, 64))
      
      // Read offsets
      const descOffset = parseInt(data.slice(256, 320), 16) * 2 // word 4
      const slugOffset = parseInt(data.slice(320, 384), 16) * 2 // word 5
      
      // Decode description and slug
      const description = decodeString(data, descOffset)
      const slug = decodeString(data, slugOffset)
      
      const title = parseTitle(description)
      const candidateId = proposer.toLowerCase() + "-" + slug
      
      // Get block timestamp via eth_getBlockByNumber (cached approach)
      // To avoid excessive RPC calls, estimate timestamp from block number
      // Ethereum block time ~12 seconds, current block ~21M
      const estimatedTimestamp = Math.floor(Date.now() / 1000) - (latestBlock - blockNumber) * 12

      candidates.push({
        id: candidateId,
        slug,
        proposer,
        title: title || slug || `Candidate`,
        description: description.slice(0, 500),
        createdTimestamp: estimatedTimestamp,
        createdTransactionHash: txHash,
        blockNumber,
        canceled: false,
      })
    } catch {
      // skip malformed events
    }
  }

  // Sort by block number descending (most recent first)
  candidates.sort((a, b) => b.blockNumber - a.blockNumber)

  // Assign candidate numbers (newest = highest number)
  const total = candidates.length
  candidates.forEach((c, i) => {
    c.candidateNumber = total - i
  })

  return candidates
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        candidates: cache.data.slice(0, limit),
        total: cache.data.length,
      })
    }

    const candidates = await fetchCandidatesFromEvents()

    // Cache the results
    cache = { data: candidates, timestamp: Date.now() }

    return NextResponse.json({
      candidates: candidates.slice(0, limit),
      total: candidates.length,
    })
  } catch (error) {
    console.error("Candidates fetch error:", error)
    return NextResponse.json({
      candidates: [],
      total: 0,
      error: "Failed to fetch candidates",
    })
  }
}
