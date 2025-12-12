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

    // Search last ~8000 blocks (approximately 24 hours)
    const fromBlock = currentBlock - BigInt(8000)

    // Query for AuctionSettled event for the previous Noun
    // Event signature: AuctionSettled(uint256 indexed nounId, address winner, uint256 amount)
    const logs = await client.getLogs({
      address: AUCTION_HOUSE_ADDRESS,
      event: parseAbiItem("event AuctionSettled(uint256 indexed nounId, address winner, uint256 amount)"),
      args: {
        nounId: BigInt(previousNounId),
      },
      fromBlock,
      toBlock: currentBlock,
    })

    console.log("[v0] Server: Found", logs.length, "settlement events")

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

    console.log("[v0] Server: No settlement event found")
    return { curator: null, error: "No settlement event found" }
  } catch (error) {
    console.error("[v0] Server: Error fetching curator:", error)
    return { curator: null, error: String(error) }
  }
}
