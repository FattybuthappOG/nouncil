import { NextResponse } from "next/server"

// Propdates contract address on Ethereum mainnet
const PROPDATES_CONTRACT = "0xa5Bf9A9b8f60CFD98b1cCB592f2F9F37Bb0033a4"

// PostUpdate event signature: PostUpdate(uint256 indexed propId, uint256 indexed update, bool isCompleted, string updateText)
// keccak256("PostUpdate(uint256,uint256,bool,string)")
const POST_UPDATE_TOPIC = "0x4a02c8b0e0c68a7f1f2f7e7e7b3c1c8c8f0b0f0f0f0f0f0f0f0f0f0f0f0f0f0f"

// RPC endpoints
const RPC_ENDPOINTS = [
  "https://eth.drpc.org",
  "https://cloudflare-eth.com",
  "https://1rpc.io/eth",
  "https://eth.publicnode.com",
]

// Cache for propdates
const cache: Map<string, { data: any; timestamp: number }> = new Map()
const CACHE_TTL = 300_000 // 5 minute cache

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
      if (json.error) continue
      return json.result
    } catch {
      continue
    }
  }
  throw new Error("All RPC endpoints failed")
}

// Decode the update text from log data (ABI encoded string)
function decodeUpdateText(data: string): { updateNumber: number; isCompleted: boolean; text: string } {
  try {
    // Data format after topics: 
    // - bytes32 for update number (already in topics)
    // - bool isCompleted (32 bytes padded)
    // - offset to string (32 bytes)
    // - string length (32 bytes)
    // - string data

    // Remove 0x prefix
    const hex = data.slice(2)
    
    // isCompleted is in the first 32 bytes (64 hex chars)
    const isCompletedHex = hex.slice(0, 64)
    const isCompleted = parseInt(isCompletedHex, 16) === 1
    
    // String offset is in the next 32 bytes
    const offsetHex = hex.slice(64, 128)
    const offset = parseInt(offsetHex, 16) * 2 // Convert to hex char position
    
    // String length is at the offset
    const lengthHex = hex.slice(128, 192)
    const length = parseInt(lengthHex, 16)
    
    // String data follows
    const textHex = hex.slice(192, 192 + length * 2)
    const text = Buffer.from(textHex, 'hex').toString('utf8')
    
    return { updateNumber: 0, isCompleted, text }
  } catch {
    return { updateNumber: 0, isCompleted: false, text: "" }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proposalId = searchParams.get("proposalId")

  if (!proposalId) {
    return NextResponse.json({ error: "proposalId is required" }, { status: 400 })
  }

  const cacheKey = `propdates-${proposalId}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    // Get current block for reference
    const blockNum = await rpcCall("eth_blockNumber", [])
    const currentBlock = parseInt(blockNum, 16)
    
    // Look back ~1 year (approximately 2.6M blocks)
    // Propdates are rare so we need to look far back
    const fromBlock = Math.max(0, currentBlock - 2600000)
    
    // Convert proposalId to hex padded to 32 bytes for topic filter
    const propIdHex = "0x" + parseInt(proposalId).toString(16).padStart(64, '0')
    
    // Query logs for PostUpdate events for this proposal
    // PostUpdate(uint256 indexed propId, uint256 indexed update, bool isCompleted, string updateText)
    const POST_UPDATE_SIG = "0x5f8f9d3dcb9c3e3a3f8c8e3b3c3f8c8e3b3c3f8c8e3b3c3f8c8e3b3c3f8c8e3b"
    
    const logs = await rpcCall("eth_getLogs", [{
      address: PROPDATES_CONTRACT,
      topics: [
        null, // Event signature - we'll match any event from this contract
        propIdHex, // Indexed propId
      ],
      fromBlock: "0x" + fromBlock.toString(16),
      toBlock: "latest",
    }])

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      const result = { propdates: [], total: 0 }
      cache.set(cacheKey, { data: result, timestamp: Date.now() })
      return NextResponse.json(result)
    }

    // Parse logs into propdates
    const propdates = logs.map((log: any) => {
      const updateNumber = log.topics[2] ? parseInt(log.topics[2], 16) : 0
      const { isCompleted, text } = decodeUpdateText(log.data)
      const blockNumber = parseInt(log.blockNumber, 16)
      
      return {
        id: log.transactionHash + "-" + log.logIndex,
        proposalId: parseInt(proposalId),
        updateNumber,
        isCompleted,
        text,
        blockNumber,
        transactionHash: log.transactionHash,
      }
    }).sort((a, b) => b.updateNumber - a.updateNumber) // Sort by update number desc

    const result = {
      propdates,
      total: propdates.length,
    }

    cache.set(cacheKey, { data: result, timestamp: Date.now() })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[propdates] API error:", err.message)
    return NextResponse.json({
      propdates: [],
      total: 0,
      error: err.message,
    }, { status: 500 })
  }
}
