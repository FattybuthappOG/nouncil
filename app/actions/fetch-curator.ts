"use server"

import { createPublicClient, http, parseAbiItem } from "viem"
import { mainnet } from "viem/chains"

const AUCTION_HOUSE_ADDRESS = "0x830BD73E4184ceF73443C15111a1DF14e495C706"

export async function fetchAuctionCurator(settledNounId: number) {
  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http("https://ethereum-rpc.publicnode.com"),
    })

    const currentBlock = await client.getBlockNumber()

    const CHUNK_SIZE = 500
    const MAX_BLOCKS_TO_SEARCH = 15000

    for (let i = 0; i < Math.ceil(MAX_BLOCKS_TO_SEARCH / CHUNK_SIZE); i++) {
      const toBlock = currentBlock - BigInt(i * CHUNK_SIZE)
      const fromBlock = toBlock - BigInt(CHUNK_SIZE)

      try {
        const logs = await client.getLogs({
          address: AUCTION_HOUSE_ADDRESS,
          event: parseAbiItem("event AuctionSettled(uint256 indexed nounId, address winner, uint256 amount)"),
          args: {
            nounId: BigInt(settledNounId),
          },
          fromBlock,
          toBlock,
        })

        if (logs.length > 0) {
          const txHash = logs[0].transactionHash
          const tx = await client.getTransaction({ hash: txHash })
          const curator = tx.from
          return { curator, error: null }
        }
      } catch (chunkError) {
        // Continue to next chunk on error
      }
    }

    return { curator: null, error: "No settlement event found" }
  } catch (error) {
    return { curator: null, error: String(error) }
  }
}
