import { NextResponse } from "next/server"

// NounsDAOData contract - emits ProposalCandidateCreated / Canceled events
const NOUNS_DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365"
const DEPLOY_BLOCK = 17812145

// ProposalCandidateCreated(address,address[],uint256[],string[],bytes[],string,string,uint256,bytes32)
// Topic0 = keccak256 of the event signature
const CANDIDATE_CREATED_TOPIC = "0x4dfe75e0c00019f1e5084ef8d11254e5475c3a5b42ad7ad78e09fcc9146e3819"

// RPC endpoints - same as proposals route, publicnode is most reliable for large log queries
const RPC_URLS = [
  process.env.ETH_RPC_URL,
  "https://ethereum-rpc.publicnode.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
].filter(Boolean) as string[]

// Long cache since candidates change infrequently
let cache: { data: any[]; timestamp: number } | null = null
const CACHE_TTL = 600_000 // 10 minutes

async function rpcCall(method: string, params: any[], timeoutMs = 30000): Promise<any> {
  for (const url of RPC_URLS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) continue
      const json = await res.json()
      if (json.error) {
        console.log(`[v0] RPC ${url} error:`, json.error.message || json.error)
        continue
      }
      return json.result
    } catch (e: any) {
      console.log(`[v0] RPC ${url} exception:`, e.message || e)
      continue
    }
  }
  throw new Error("All RPC endpoints failed")
}

// Decode ABI-encoded string from calldata/event data
function decodeAbiString(data: string, wordOffset: number): string {
  try {
    const hex = data.startsWith("0x") ? data.slice(2) : data
    // Read the offset pointer at wordOffset
    const offsetHex = hex.substr(wordOffset * 64, 64)
    const offset = parseInt(offsetHex, 16) * 2 // byte offset to char offset
    // Read length at that offset
    const lengthHex = hex.substr(offset, 64)
    const length = parseInt(lengthHex, 16)
    if (length === 0 || length > 10000) return ""
    // Read string bytes
    const strHex = hex.substr(offset + 64, length * 2)
    const bytes: number[] = []
    for (let i = 0; i < strHex.length; i += 2) {
      bytes.push(parseInt(strHex.substr(i, 2), 16))
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes))
  } catch {
    return ""
  }
}

async function fetchCandidatesFromLogs(): Promise<any[]> {
  // Get current block
  const latestHex = await rpcCall("eth_blockNumber", [])
  const latestBlock = parseInt(latestHex, 16)

  // Fetch in chunks of 500k blocks to avoid RPC response size limits
  const CHUNK = 500_000
  const allLogs: any[] = []

  for (let from = DEPLOY_BLOCK; from <= latestBlock; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, latestBlock)
    try {
      const logs = await rpcCall("eth_getLogs", [{
        address: NOUNS_DAO_DATA,
        topics: [CANDIDATE_CREATED_TOPIC],
        fromBlock: "0x" + from.toString(16),
        toBlock: "0x" + to.toString(16),
      }], 45000)

      if (Array.isArray(logs)) {
        allLogs.push(...logs)
      }
    } catch (e: any) {
      console.log(`[v0] Log chunk ${from}-${to} failed:`, e.message)
      // If a full chunk fails, try smaller sub-chunks
      const SUB = 100_000
      for (let subFrom = from; subFrom <= to; subFrom += SUB) {
        const subTo = Math.min(subFrom + SUB - 1, to)
        try {
          const subLogs = await rpcCall("eth_getLogs", [{
            address: NOUNS_DAO_DATA,
            topics: [CANDIDATE_CREATED_TOPIC],
            fromBlock: "0x" + subFrom.toString(16),
            toBlock: "0x" + subTo.toString(16),
          }], 30000)
          if (Array.isArray(subLogs)) {
            allLogs.push(...subLogs)
          }
        } catch {
          // Skip this sub-chunk
        }
      }
    }
  }

  console.log(`[v0] Found ${allLogs.length} ProposalCandidateCreated events`)

  // Parse events
  const candidates = allLogs.map((log: any, index: number) => {
    // Proposer is the first indexed parameter (msg.sender)
    const proposer = log.topics[1]
      ? "0x" + log.topics[1].slice(26).toLowerCase()
      : "0x0000000000000000000000000000000000000000"

    const data = log.data || ""

    // Event data layout (non-indexed params, ABI encoded):
    // word 0: offset to targets[]
    // word 1: offset to values[]
    // word 2: offset to signatures[]
    // word 3: offset to calldatas[]
    // word 4: offset to description (string)
    // word 5: offset to slug (string)
    // word 6: proposalIdToUpdate (uint256)
    // word 7: encodedProposalHash (bytes32)
    //
    // We want the slug (word 5) and description (word 4)
    const slug = decodeAbiString(data, 5)
    const description = decodeAbiString(data, 4)

    const title = slug
      ? slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
      : description
        ? description.split("\n")[0].replace(/^#+\s*/, "").trim().slice(0, 120)
        : `Candidate ${index + 1}`

    return {
      id: `${proposer}-${slug || index}`,
      slug,
      proposer,
      title,
      description: description.slice(0, 500),
      createdBlock: parseInt(log.blockNumber, 16),
      createdTransactionHash: log.transactionHash || "",
      canceled: false,
      candidateNumber: index + 1,
    }
  })

  // Reverse so newest is first, re-number
  candidates.reverse()
  candidates.forEach((c, i) => { c.candidateNumber = candidates.length - i })

  return candidates
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 200)

    // Return cache if fresh
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        candidates: cache.data.slice(0, limit),
        total: cache.data.length,
      })
    }

    const candidates = await fetchCandidatesFromLogs()
    cache = { data: candidates, timestamp: Date.now() }

    return NextResponse.json({
      candidates: candidates.slice(0, limit),
      total: candidates.length,
    })
  } catch (error: any) {
    console.error("Candidates fetch error:", error?.message || error)
    return NextResponse.json({
      candidates: [],
      total: 0,
      error: "Failed to fetch candidates",
    })
  }
}
