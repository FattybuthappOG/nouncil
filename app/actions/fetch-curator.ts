"use server"

import { createPublicClient, http, parseAbiItem } from "viem"
import { mainnet } from "viem/chains"

const AUCTION_HOUSE_ADDRESS = "0x830BD73E4184ceF73443C15111a1DF14e495C706"

export async function fetchAuctionCurator(previousNounId: number) {
  try {
    console.log("[v0] Server: Fetching curator for Noun", previousNounId)

    const client = createPublicClient({
      chain: mainnet,
      transport: http("https://eth.merkle.io"),
    })

    const currentBlock = await client.getBlockNumber()
    console.log("[v0] Server: Current block:", currentBlock)

    const CHUNK_SIZE = 2000
    const MAX_BLOCKS_TO_SEARCH = 20000

    for (let i = 0; i < Math.ceil(MAX_BLOCKS_TO_SEARCH / CHUNK_SIZE); i++) {
      const toBlock = currentBlock - BigInt(i * CHUNK_SIZE)
      const fromBlock = toBlock - BigInt(CHUNK_SIZE)

      console.log(`[v0] Server: Searching blocks ${fromBlock} to ${toBlock}`)

      try {
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
          const txHash = logs[0].transactionHash
          console.log("[v0] Server: Settlement tx:", txHash)

          const tx = await client.getTransaction({ hash: txHash })
          const curator = tx.from

          console.log("[v0] Server: Found curator:", curator)
          return { curator, error: null }
        }
      } catch (chunkError) {
        console.error(`[v0] Server: Error searching chunk ${i}:`, chunkError)
      }
    }

    console.log("[v0] Server: No settlement event found in last", MAX_BLOCKS_TO_SEARCH, "blocks")
    return { curator: null, error: "No settlement event found" }
  } catch (error) {
    console.error("[v0] Server: Error fetching curator:", error)
    return { curator: null, error: String(error) }
  }
}
