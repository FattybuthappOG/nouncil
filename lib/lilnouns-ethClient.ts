import { createPublicClient, http, fallback } from "viem"
import { mainnet } from "viem/chains"

// Public RPC endpoints with fallback
const transports = [
  http("https://cloudflare-eth.com"),
  http("https://eth.public-rpc.com"),
  http("https://rpc.ankr.com/eth"),
  http("https://eth.llamarpc.com"),
]

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: fallback(transports),
})

// Current block cache
let cachedBlockNumber: bigint | null = null
let lastBlockFetch = 0

export async function getCurrentBlock(): Promise<bigint> {
  const now = Date.now()
  // Cache block number for 12 seconds (1 block time)
  if (cachedBlockNumber && now - lastBlockFetch < 12000) {
    return cachedBlockNumber
  }
  
  try {
    cachedBlockNumber = await publicClient.getBlockNumber()
    lastBlockFetch = now
    return cachedBlockNumber
  } catch (error) {
    console.error("Failed to get current block:", error)
    // Return a reasonable fallback
    return cachedBlockNumber || BigInt(19000000)
  }
}
