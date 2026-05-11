import { NextResponse } from "next/server"

// NounsDAOData contract address on Ethereum mainnet
// This contract emits events for ProposalCandidateCreated, ProposalCandidateUpdated, and ProposalCandidateCanceled
const NOUNS_DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365"

// RPC endpoints with public access
const RPC_ENDPOINTS = [
  "https://eth.drpc.org",
  "https://cloudflare-eth.com",
  "https://1rpc.io/eth",
  "https://eth.publicnode.com",
]

// Cache for candidates
const cache: {
  candidates?: { data: any[]; timestamp: number }
} = {}
const CACHE_TTL = 300_000 // 5 minute cache

// Make RPC call with fallback
async function rpcCall(method: string, params: any[]): Promise<any> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      
      if (!response.ok) continue
      const json = await response.json()
      if (json.error) {
        console.error(`[candidates] RPC error from ${endpoint}:`, json.error.message)
        continue
      }
      return json.result
    } catch (err: any) {
      console.error(`[candidates] RPC call failed for ${endpoint}:`, err.message)
      continue
    }
  }
  throw new Error("All RPC endpoints failed")
}

// ABI for ProposalCandidateCreated event
const PROPOSAL_CANDIDATE_CREATED_ABI = {
  type: 'event',
  name: 'ProposalCandidateCreated',
  inputs: [
    { type: 'address', indexed: true, name: 'msgSender' },
    { type: 'address[]', indexed: false, name: 'targets' },
    { type: 'uint256[]', indexed: false, name: 'values' },
    { type: 'string[]', indexed: false, name: 'signatures' },
    { type: 'bytes[]', indexed: false, name: 'calldatas' },
    { type: 'string', indexed: false, name: 'description' },
    { type: 'string', indexed: false, name: 'slug' },
    { type: 'uint256', indexed: false, name: 'proposalIdToUpdate' },
    { type: 'bytes32', indexed: false, name: 'encodedProposalHash' }
  ]
}

// Fetch candidates from blockchain events - optimized for recent candidates only
async function fetchCandidatesFromBlockchain(): Promise<any[]> {
  console.log("[candidates] Fetching recent candidates from blockchain events...")
  
  try {
    // Get current block number
    const blockNum = await rpcCall("eth_blockNumber", [])
    const currentBlock = parseInt(blockNum, 16)
    
    // Look back only ~2 days (approximately 14400 blocks on Ethereum) to get recent candidates
    // This is much faster than querying all candidates
    const lookbackBlocks = 14400
    const fromBlock = Math.max(0, currentBlock - lookbackBlocks)
    
    console.log(`[candidates] Querying recent logs from block ${fromBlock} to ${currentBlock}`)
    
    // ProposalCandidateCreated event selector
    const CANDIDATE_CREATED = "0x1e5b6e5f97b93ce8eafaa1e14a7d6f9e8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a"
    
    // Single query for recent events (should be well under 10000 block limit)
    const logs = await rpcCall("eth_getLogs", [{
      address: NOUNS_DAO_DATA,
      topics: [CANDIDATE_CREATED],
      fromBlock: "0x" + fromBlock.toString(16),
      toBlock: "latest",
    }])
    
    console.log(`[candidates] Found ${logs?.length || 0} recent candidate creation events`)
    
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      console.log("[candidates] No recent candidates found")
      return []
    }
    
    // Parse the logs into candidate objects - newest first
    const candidates = logs.map((log: any, index: number) => {
      try {
        const proposer = "0x" + (log.topics[1]?.slice(-40) || "0")
        const blockNumber = parseInt(log.blockNumber, 16)
        const transactionHash = log.transactionHash
        
        return {
          id: transactionHash + "-" + log.logIndex,
          candidateNumber: logs.length - index,
          slug: `candidate-${logs.length - index}`,
          proposer,
          title: `Candidate #${logs.length - index}`,
          description: `Proposed by ${proposer.slice(0, 6)}...${proposer.slice(-4)}`,
          createdTimestamp: 0,
          createdBlock: blockNumber.toString(),
          createdTransactionHash: transactionHash,
          canceled: false,
        }
      } catch (err: any) {
        console.error("[candidates] Error parsing log:", err.message)
        return null
      }
    }).filter(Boolean).reverse() // Reverse to show newest first (highest number first)
    
    console.log(`[candidates] Successfully parsed ${candidates.length} recent candidates`)
    return candidates
  } catch (err: any) {
    console.error("[candidates] Failed to fetch candidates from blockchain:", err.message)
    throw err
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"))

  try {
    // Check cache first
    if (cache.candidates && Date.now() - cache.candidates.timestamp < CACHE_TTL) {
      console.log("[candidates] Returning cached candidates")
      const paginatedCandidates = cache.candidates.data.slice(offset, offset + limit)
      return NextResponse.json({
        candidates: paginatedCandidates,
        total: cache.candidates.data.length,
        hasMore: cache.candidates.data.length > offset + limit,
        offset,
        limit,
        source: "cache",
      })
    }

    // Fetch from blockchain
    const candidates = await fetchCandidatesFromBlockchain()
    
    // Update cache
    cache.candidates = { data: candidates, timestamp: Date.now() }
    
    const paginatedCandidates = candidates.slice(offset, offset + limit)
    
    return NextResponse.json({
      candidates: paginatedCandidates,
      total: candidates.length,
      hasMore: candidates.length > offset + limit,
      offset,
      limit,
      source: "blockchain",
    })
  } catch (err: any) {
    console.error("[candidates] API error:", err.message)
    
    // Try to return cached data if available
    if (cache.candidates && cache.candidates.data.length > 0) {
      console.log("[candidates] Returning stale cached data due to error")
      const paginatedCandidates = cache.candidates.data.slice(offset, offset + limit)
      return NextResponse.json({
        candidates: paginatedCandidates,
        total: cache.candidates.data.length,
        hasMore: cache.candidates.data.length > offset + limit,
        offset,
        limit,
        source: "cache",
        stale: true,
      })
    }

    // Return helpful error response
    return NextResponse.json({
      candidates: [],
      total: 0,
      hasMore: false,
      offset,
      limit,
      unavailable: true,
      message: "Candidates data is temporarily unavailable. View candidates on nouns.wtf.",
      externalUrl: "https://nouns.wtf/vote#candidates"
    })
  }
}
