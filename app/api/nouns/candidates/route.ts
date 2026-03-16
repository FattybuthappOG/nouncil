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

// RPC endpoints with fallback strategy - remove unreliable endpoints
const RPC_URLS = [
  process.env.ETH_RPC_URL || "https://eth.drpc.org",
  "https://cloudflare-eth.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
  "https://endpoints.omnirpc.io/eth",
  "https://eth.meowrpc.com",
].filter(Boolean) as string[]

// 6 hour cache to minimize RPC calls (candidates don't change that often)
const cache: Record<string, { data: any; ts: number }> = {}
const CACHE_TTL = 6 * 60 * 60 * 1000

// Delay between RPC calls to avoid rate limiting (400ms = 2.5 requests/second for safety)
const RPC_DELAY_MS = 400

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
        signal: AbortSignal.timeout(15000),
      })
      
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`)
        // Add delay before trying next provider to avoid hammering
        await delay(RPC_DELAY_MS)
        continue
      }
      
      const json = await res.json()
      if (json.error) {
        lastError = new Error(`RPC error: ${json.error.message}`)
        // Add delay before trying next provider on error
        await delay(RPC_DELAY_MS)
        continue
      }
      
      return json.result
    } catch (err) {
      lastError = err
      // Add delay on exception too
      await delay(RPC_DELAY_MS)
      continue
    }
  }
  
  throw new Error(`All RPC endpoints failed. Last error: ${lastError?.message || "Unknown"}`)
}
      
      const json = await res.json()
      if (json.error) {
        lastError = new Error(`RPC error: ${json.error.message}`)
        continue
      }
      
      return json.result
    } catch (err) {
      lastError = err
      continue
    }
  }
  
  throw new Error(`All RPC endpoints failed. Last error: ${lastError?.message || "Unknown"}`)
}

// Decode ABI string from log data at a given offset (in 32-byte words)
function decodeAbiString(data: string, wordOffset: number): string {
  try {
    // Each word is 64 hex chars. data starts after "0x"
    const hex = data.slice(2)
    // The wordOffset points to the offset of the string
    const offsetHex = hex.slice(wordOffset * 64, wordOffset * 64 + 64)
    const strOffset = parseInt(offsetHex, 16) * 2 // in hex chars
    const lenHex = hex.slice(strOffset, strOffset + 64)
    const strLen = parseInt(lenHex, 16) * 2 // in hex chars
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

    // The non-indexed params in log.data are ABI-encoded as:
    // [0] targets offset
    // [1] values offset
    // [2] signatures offset
    // [3] calldatas offset
    // [4] description offset
    // [5] slug offset
    // [6] proposalIdToUpdate (uint256)
    // [7] encodedProposalHash (bytes32)
    // Then the actual arrays/strings follow

    const description = decodeAbiString(log.data, 4)
    const slug = decodeAbiString(log.data, 5)

    // Extract title from markdown description (first line after #)
    let title = slug || `Candidate by ${proposer.slice(0, 8)}`
    if (description) {
      const firstLine = description.split("\n")[0].replace(/^#+\s*/, "").trim()
      if (firstLine.length > 0) title = firstLine
    }

    // Use a running index for candidateNumber (will be set from total later)
    const id = `${proposer.toLowerCase()}-${slug || blockNumber}`

    return {
      id,
      candidateNumber: index + 1,
      proposer,
      title: title.length > 120 ? title.slice(0, 120) + "…" : title,
      description,
      createdTimestamp: blockNumber, // block number as proxy; no extra RPC needed
      slug: slug || id,
    }
  } catch (err) {
    return null
  }
}

async function fetchCandidates(limit: number): Promise<{ candidates: CandidateData[]; total: number }> {
  // Step 1: get current block
  const currentBlockHex: string = await rpcCall("eth_blockNumber", [])
  const currentBlock = parseInt(currentBlockHex, 16)

  // Step 2: Only query recent blocks to avoid rate limits
  // ~12.5 blocks per second = ~1.08M blocks per day
  // Query last 7 days instead of all history from deployment
  const BLOCKS_PER_DAY = 1_080_000
  const DAYS_TO_QUERY = 7
  const fromBlock = Math.max(DEPLOY_BLOCK, currentBlock - BLOCKS_PER_DAY * DAYS_TO_QUERY)

  // Step 3: fetch logs in 5000-block chunks
  const CHUNK_SIZE = 5000
  const allLogs: any[] = []
  
  for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, currentBlock)
    
    try {
      const logs: any[] = await rpcCall("eth_getLogs", [{
        address: NOUNS_DAO_DATA,
        topics: [CANDIDATE_CREATED_TOPIC],
        fromBlock: `0x${start.toString(16)}`,
        toBlock: `0x${end.toString(16)}`,
      }])
      
      if (Array.isArray(logs)) {
        allLogs.push(...logs)
      }
    } catch (err) {
      console.error(`[candidates] Failed to fetch logs for blocks ${start}-${end}:`, err)
      // Continue with next chunk even if one fails
      continue
    }
    
    // Add delay between chunk requests to avoid rate limiting
    await delay(RPC_DELAY_MS)
  }

  const total = allLogs.length

  // Take the last `limit` logs (most recent events are at end of array)
  const recentLogs = allLogs.slice(-limit).reverse()

  const candidates: CandidateData[] = []
  let candidateNumber = total
  for (const log of recentLogs) {
    const c = parseLog(log, 0)
    if (c) {
      c.candidateNumber = candidateNumber--
      candidates.push(c)
    }
  }

  return { candidates, total }
}
    } catch (err) {
      console.error(`[candidates] Failed to fetch logs for blocks ${fromBlock}-${toBlock}:`, err)
      // Continue to next chunk even if one fails
      continue
    }
  }

  const total = allLogs.length

  // Take the last `limit` logs (most recent events are at end of array)
  const recentLogs = allLogs.slice(-limit).reverse()

  const candidates: CandidateData[] = []
  let candidateNumber = total
  for (const log of recentLogs) {
    const c = parseLog(log, 0)
    if (c) {
      c.candidateNumber = candidateNumber--
      candidates.push(c)
    }
  }

  return { candidates, total }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
  const cacheKey = `candidates_${limit}`

  // Return cached data if available (6 hour TTL)
  if (cache[cacheKey] && Date.now() - cache[cacheKey].ts < CACHE_TTL) {
    return NextResponse.json(cache[cacheKey].data)
  }

  try {
    const { candidates, total } = await fetchCandidates(limit)
    const result = { candidates, total, source: "rpc-cached" }
    cache[cacheKey] = { data: result, ts: Date.now() }
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[candidates] Fetch error:", error?.message)
    
    // If we have stale cache, return it instead of error
    if (cache[cacheKey]) {
      console.warn("[candidates] Using stale cache due to RPC failure")
      return NextResponse.json({
        ...cache[cacheKey].data,
        stale: true,
        error: "Using cached data - RPC failed",
      })
    }
    
    // Return empty result gracefully instead of error
    return NextResponse.json(
      { candidates: [], total: 0, error: error?.message },
      { status: 200 }
    )
  }
}
