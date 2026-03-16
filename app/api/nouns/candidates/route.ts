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

// NounsDAOData proxy contract
const NOUNS_DAO_DATA = "0xf790a5f59678dd733fb3de93493a91f472ca1365"

// keccak256("ProposalCandidateCreated(address,address[],uint256[],string[],bytes[],string,string,uint256,bytes32)")
const CANDIDATE_CREATED_TOPIC = "0xf1167632f94b4215581a322b86242c468fa7920b4c79ee827d558c45a0977529"

// Deployment block of NounsDAOData contract (Aug 2023)
const DEPLOY_BLOCK = 17812145

// RPC endpoints with fallback strategy - removed publicnode (unreliable)
const RPC_URLS = [
  process.env.ETH_RPC_URL || "https://eth.drpc.org",
  "https://cloudflare-eth.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
  "https://eth.meowrpc.com",
].filter(Boolean) as string[]

// 24 hour cache for all candidates (heavy query, cache longer)
const cache: Record<string, { data: any; ts: number }> = {}
const CACHE_TTL = 24 * 60 * 60 * 1000

// Delay between RPC calls to avoid rate limiting (3000ms = 1 request/3 seconds for conservative free tier)
const RPC_DELAY_MS = 3000

// Helper to delay execution
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function rpcCall(method: string, params: any[]): Promise<any> {
  let lastError: any
  
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(30000), // Longer timeout for slow RPC
      })
      
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`)
        await delay(RPC_DELAY_MS)
        continue
      }
      
      const json = await res.json()
      if (json.error) {
        lastError = new Error(`RPC error: ${json.error.message}`)
        await delay(RPC_DELAY_MS)
        continue
      }
      
      return json.result
    } catch (err) {
      lastError = err
      await delay(RPC_DELAY_MS)
      continue
    }
  }
  
  throw new Error(`All RPC endpoints failed. Last error: ${lastError?.message || "Unknown"}`)
}

// Decode ABI string from log data at a given offset (in 32-byte words)
function decodeAbiString(data: string, wordOffset: number): string {
  try {
    const hex = data.slice(2)
    const offsetHex = hex.slice(wordOffset * 64, wordOffset * 64 + 64)
    const strOffset = parseInt(offsetHex, 16) * 2
    const lenHex = hex.slice(strOffset, strOffset + 64)
    const strLen = parseInt(lenHex, 16) * 2
    const strHex = hex.slice(strOffset + 64, strOffset + 64 + strLen)
    return Buffer.from(strHex, "hex").toString("utf8")
  } catch {
    return ""
  }
}

function parseLog(log: any, index: number): CandidateData | null {
  try {
    const proposer = `0x${log.topics[1].slice(26)}`
    const blockNumber = parseInt(log.blockNumber, 16)

    const description = decodeAbiString(log.data, 4)
    const slug = decodeAbiString(log.data, 5)

    let title = slug || `Candidate by ${proposer.slice(0, 8)}`
    if (description) {
      const firstLine = description.split("\n")[0].replace(/^#+\s*/, "").trim()
      if (firstLine.length > 0) title = firstLine
    }

    const id = `${proposer.toLowerCase()}-${slug || blockNumber}`

    return {
      id,
      candidateNumber: index + 1,
      proposer,
      title: title.length > 120 ? title.slice(0, 120) + "…" : title,
      description,
      createdTimestamp: blockNumber,
      slug: slug || id,
    }
  } catch (err) {
    return null
  }
}

// Fetch ALL candidates from deployment block - called once per cache TTL
async function fetchAllCandidates(): Promise<CandidateData[]> {
  const currentBlockHex: string = await rpcCall("eth_blockNumber", [])
  const currentBlock = parseInt(currentBlockHex, 16)

  const CHUNK_SIZE = 5000
  const allLogs: any[] = []
  const totalChunks = Math.ceil((currentBlock - DEPLOY_BLOCK) / CHUNK_SIZE)
  let failedChunks = 0
  
  for (let i = 0; i < totalChunks; i++) {
    const start = DEPLOY_BLOCK + i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE - 1, currentBlock)
    
    try {
      console.log(`[candidates] Fetching chunk ${i + 1}/${totalChunks} (blocks ${start}-${end})`)
      const logs: any[] = await rpcCall("eth_getLogs", [{
        address: NOUNS_DAO_DATA,
        topics: [CANDIDATE_CREATED_TOPIC],
        fromBlock: `0x${start.toString(16)}`,
        toBlock: `0x${end.toString(16)}`,
      }])
      
      if (Array.isArray(logs)) {
        allLogs.push(...logs)
        console.log(`[candidates] Got ${logs.length} candidates from chunk ${i + 1}/${totalChunks}`)
      }
    } catch (err) {
      failedChunks++
      console.error(`[candidates] Failed to fetch chunk ${i + 1}/${totalChunks} (blocks ${start}-${end}):`, err)
      // Continue with next chunk even if one fails
      // This allows us to get partial results instead of complete failure
      continue
    }
    
    // Add delay between chunk requests to avoid rate limiting
    if (i < totalChunks - 1) {
      await delay(RPC_DELAY_MS)
    }
  }

  console.log(`[candidates] Completed fetch: ${allLogs.length} total candidates, ${failedChunks} failed chunks`)

  // Parse all logs and reverse so most recent is first
  const candidates: CandidateData[] = []
  let candidateNumber = allLogs.length
  
  for (const log of allLogs) {
    const c = parseLog(log, 0)
    if (c) {
      c.candidateNumber = candidateNumber--
      candidates.push(c)
    }
  }
  
  candidates.reverse()
  return candidates
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"))
  
  const cacheKey = "candidates_all"

  // Check cache - fetch all candidates once, then paginate
  let allCandidates: CandidateData[] = []
  let fromCache = false

  if (cache[cacheKey] && Date.now() - cache[cacheKey].ts < CACHE_TTL) {
    console.log("[candidates] Returning cached data")
    allCandidates = cache[cacheKey].data
    fromCache = true
  } else {
    try {
      console.log("[candidates] Cache miss or expired - fetching from RPC (this may take several minutes)...")
      allCandidates = await fetchAllCandidates()
      cache[cacheKey] = { data: allCandidates, ts: Date.now() }
      console.log(`[candidates] Successfully fetched and cached ${allCandidates.length} candidates`)
    } catch (error: any) {
      console.error("[candidates] Fetch error:", error?.message)
      
      // Use stale cache if available
      if (cache[cacheKey]) {
        console.warn("[candidates] Using stale cache due to RPC failure")
        allCandidates = cache[cacheKey].data
        fromCache = true
      } else {
        console.error("[candidates] No cache available and fetch failed - returning empty")
        return NextResponse.json(
          { candidates: [], total: 0, hasMore: false, offset, limit, error: error?.message },
          { status: 200 }
        )
      }
    }
  }

  // Paginate from cached/fetched candidates
  const total = allCandidates.length
  const hasMore = total > offset + limit
  const paginatedCandidates = allCandidates.slice(offset, offset + limit)

  return NextResponse.json({
    candidates: paginatedCandidates,
    total,
    hasMore,
    offset,
    limit,
    source: fromCache ? "cached" : "rpc-fetched",
    cacheAge: cache[cacheKey] ? Math.round((Date.now() - cache[cacheKey].ts) / 1000 / 60) + "m" : "unknown"
  })
}
