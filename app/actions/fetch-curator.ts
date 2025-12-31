"use server"

import { createPublicClient, http, parseAbiItem } from "viem"
import { mainnet } from "viem/chains"

const AUCTION_HOUSE_ADDRESS = "0x830BD73E4184ceF73443C15111a1DF14e495C706"

export async function fetchAuctionCurator(currentNounId: number) {
  try {
    const previousNounId = currentNounId - 1
    console.log("[v0] Server: Fetching curator for Noun", previousNounId)

    // Create a public client using the public RPC
    const client = createPublicClient({
      chain: mainnet,
      transport: http("https://eth.llamarpc.com"),
    })

    // Get current block
    const currentBlock = await client.getBlockNumber()
    console.log("[v0] Server: Current block:", currentBlock)

    const CHUNK_SIZE = 1000
    const MAX_BLOCKS_TO_SEARCH = 8000 // ~24 hours

    // Search backwards in chunks
    for (let i = 0; i < Math.ceil(MAX_BLOCKS_TO_SEARCH / CHUNK_SIZE); i++) {
      const toBlock = currentBlock - BigInt(i * CHUNK_SIZE)
      const fromBlock = toBlock - BigInt(CHUNK_SIZE)

      console.log(`[v0] Server: Searching blocks ${fromBlock} to ${toBlock}`)

      try {
        // Query for AuctionSettled event for the previous Noun
        const logs = await client.getLogs({
          address: AUCTION_HOUSE_ADDRESS,
          event: parseAbiItem("event AuctionSettled(uint256 indexed nounId, address winner, uint256 amount)"),
          args: {
            nounId: BigInt(previousNounId),
          },
          fromBlock,
          toBlock,
        })

        if (logs.length > 0) {
          // Get the transaction hash from the event
          const txHash = logs[0].transactionHash
          console.log("[v0] Server: Settlement tx:", txHash)

          // Fetch the transaction to get the 'from' address (the curator)
          const tx = await client.getTransaction({ hash: txHash })
          const curator = tx.from

          console.log("[v0] Server: Found curator:", curator)
          return { curator, error: null }
        }
      } catch (chunkError) {
        console.error(`[v0] Server: Error searching chunk ${i}:`, chunkError)
        // Continue to next chunk
      }
    }

    console.log("[v0] Server: No settlement event found in last", MAX_BLOCKS_TO_SEARCH, "blocks")
    return { curator: null, error: "No settlement event found" }
  } catch (error) {
    console.error("[v0] Server: Error fetching curator:", error)
    return { curator: null, error: String(error) }
  }
}
