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

// NounsDAOData proxy contract (confirmed from nouns-camp source)
const NOUNS_DAO_DATA = "0xf790a5f59678dd733fb3de93493a91f472ca1365"

// keccak256("ProposalCandidateCreated(address,address[],uint256[],string[],bytes[],string,string,uint256,bytes32)")
// Verified from NounsDAODataEvents.sol in nouns-monorepo
const CANDIDATE_CREATED_TOPIC = "0x3c0007e34e38bfe9b9f14dc8c1e96db9e6b8354d4f87d5fd42f1d24f5eebd1b9"

// Deployment block of NounsDAOData contract (Aug 2023)
const DEPLOY_BLOCK = 17812145

// 1 hour cache to minimize RPC calls
const cache: Record<string, { data: any; ts: number }> = {}
const CACHE_TTL = 60 * 60 * 1000

function getInfuraUrl() {
  const key = process.env.INFURA_API_KEY
  if (!key) throw new Error("INFURA_API_KEY not set")
  return `https://mainnet.infura.io/v3/${key}`
}

async function rpcCall(method: string, params: any[]) {
  const url = getInfuraUrl()
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Infura ${res.status}: ${text.substring(0, 100)}`)
  }
  const json = await res.json()
  if (json.error) throw new Error(`RPC error: ${json.error.message}`)
  return json.result
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

  // Step 2: single eth_getLogs call — Infura returns up to 10,000 results
  // Query the FULL range; Infura will return the most recent 10k results
  const logs: any[] = await rpcCall("eth_getLogs", [{
    address: NOUNS_DAO_DATA,
    topics: [CANDIDATE_CREATED_TOPIC],
    fromBlock: `0x${DEPLOY_BLOCK.toString(16)}`,
    toBlock: `0x${currentBlock.toString(16)}`,
  }])

  if (!Array.isArray(logs)) {
    throw new Error("eth_getLogs did not return an array")
  }

  const total = logs.length

  // Take the last `limit` logs (most recent events are at end of array)
  const recentLogs = logs.slice(-limit).reverse()

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

  if (cache[cacheKey] && Date.now() - cache[cacheKey].ts < CACHE_TTL) {
    return NextResponse.json(cache[cacheKey].data)
  }

  try {
    const { candidates, total } = await fetchCandidates(limit)
    const result = { candidates, total, source: "infura-rpc" }
    cache[cacheKey] = { data: result, ts: Date.now() }
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[v0] Candidates fetch error:", error?.message)
    return NextResponse.json({ candidates: [], total: 0, error: error?.message }, { status: 500 })
  }
}
