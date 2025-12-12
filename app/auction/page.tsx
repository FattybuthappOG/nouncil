"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  usePublicClient,
} from "wagmi"
import { parseEther, formatEther } from "viem"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Clock, TrendingUp, Gavel } from "lucide-react"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import EnsDisplay from "@/components/ens-display"
import { NOUNS_AUCTION_ABI } from "@/lib/nouns-auction-abi"
import { NOUNS_AUCTION_ADDRESS } from "@/lib/nouns-auction-abi"
import { fetchAuctionCurator } from "@/app/actions/fetch-curator"

interface Bid {
  sender: string
  value: bigint
  timestamp: number
}

interface SettlementInfo {
  winner: string
  amount: bigint
  settler: string
  nounId: number
}

export default function AuctionPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()

  const [bidAmount, setBidAmount] = useState("")
  const [timeRemaining, setTimeRemaining] = useState("")
  const [bidHistory, setBidHistory] = useState<Array<{ sender: string; value: bigint; timestamp: number }>>([])
  const [previousSettlement, setPreviousSettlement] = useState<SettlementInfo | null>(null)
  const [mounted, setMounted] = useState(false)
  const [auctionCurator, setAuctionCurator] = useState<string | null>(null)

  const { data: auctionData, refetch: refetchAuction } = useReadContract({
    address: NOUNS_AUCTION_ADDRESS,
    abi: NOUNS_AUCTION_ABI,
    functionName: "auction",
  })

  const { data: minBidIncrement } = useReadContract({
    address: NOUNS_AUCTION_ADDRESS,
    abi: NOUNS_AUCTION_ABI,
    functionName: "minBidIncrementPercentage",
  })

  const { data: reservePrice } = useReadContract({
    address: NOUNS_AUCTION_ADDRESS,
    abi: NOUNS_AUCTION_ABI,
    functionName: "reservePrice",
  })

  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  useWatchContractEvent({
    address: NOUNS_AUCTION_ADDRESS,
    abi: NOUNS_AUCTION_ABI,
    eventName: "AuctionBid",
    onLogs(logs) {
      logs.forEach((log: any) => {
        if (log.args.nounId === auctionData?.[0]) {
          setBidHistory((prev) => [
            {
              sender: log.args.sender,
              value: log.args.value,
              timestamp: Date.now(),
            },
            ...prev,
          ])
        }
      })
    },
  })

  useWatchContractEvent({
    address: NOUNS_AUCTION_ADDRESS,
    abi: NOUNS_AUCTION_ABI,
    eventName: "AuctionSettled",
    onLogs(logs) {
      logs.forEach(async (log: any) => {
        const currentNounId = auctionData?.[0] ? Number(auctionData[0]) : null

        if (log.args.nounId && currentNounId && Number(log.args.nounId) === currentNounId - 1) {
          console.log("[v0] Settlement event detected for Noun", Number(log.args.nounId))

          if (publicClient && log.transactionHash) {
            try {
              const tx = await publicClient.getTransaction({
                hash: log.transactionHash,
              })

              setPreviousSettlement({
                winner: log.args.winner,
                amount: log.args.amount,
                settler: tx.from,
                nounId: Number(log.args.nounId),
              })

              console.log("[v0] Settlement info updated:", {
                nounId: Number(log.args.nounId),
                winner: log.args.winner,
                settler: tx.from,
              })
            } catch (error) {
              console.error("[v0] Error fetching settler:", error)
            }
          }
        }
      })
    },
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchLastCurator = async () => {
      if (!mounted) return

      try {
        console.log("[v0] Fetching last auction curator...")

        const currentNounId = auctionData?.[0] ? Number(auctionData[0]) : null
        if (!currentNounId) {
          console.log("[v0] No current noun ID available yet")
          return
        }

        const result = await fetchAuctionCurator(currentNounId)

        if (result.curator) {
          console.log("[v0] Curator fetched:", result.curator)
          setAuctionCurator(result.curator)
        } else {
          console.log("[v0] No curator found:", result.error)
        }
      } catch (error) {
        console.error("[v0] Error fetching curator:", error)
      }
    }

    if (mounted && auctionData?.[0]) {
      fetchLastCurator()
    }
  }, [mounted, auctionData])

  useEffect(() => {
    if (auctionData?.[4] && auctionData?.[1] && BigInt(auctionData[1].toString()) > BigInt(0)) {
      setBidHistory([
        {
          sender: auctionData[4] as string,
          value: BigInt(auctionData[1].toString()),
          timestamp: Date.now(),
        },
      ])
    }
  }, [auctionData])

  useEffect(() => {
    if (!auctionData?.[3]) return

    const updateTime = () => {
      const endTime = Number(auctionData[3])
      const now = Math.floor(Date.now() / 1000)
      const remaining = endTime - now

      if (remaining <= 0) {
        setTimeRemaining("Auction ended")
        return
      }

      const hours = Math.floor(remaining / 3600)
      const minutes = Math.floor((remaining % 3600) / 60)
      const seconds = remaining % 60

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [auctionData])

  useEffect(() => {
    if (isSuccess) {
      refetchAuction()
    }
  }, [isSuccess, refetchAuction])

  const handleBid = async () => {
    if (!bidAmount || !auctionData) return

    try {
      const nounId = BigInt(auctionData[0].toString())
      const value = parseEther(bidAmount)

      writeContract({
        address: NOUNS_AUCTION_ADDRESS,
        abi: NOUNS_AUCTION_ABI,
        functionName: "createBid",
        args: [nounId],
        value,
      })
    } catch (err) {
      console.error("Bid error:", err)
    }
  }

  const nounId = auctionData?.[0] ? Number(auctionData[0]) : null
  const currentBidder = auctionData?.[4] || null
  const isUserHighBidder = currentBidder?.toLowerCase() === address?.toLowerCase()
  const currentBid = auctionData?.[1] ? BigInt(auctionData[1].toString()) : BigInt(0)
  const minBidIncrementBps = minBidIncrement ? Number(minBidIncrement) : 5
  const minNextBid =
    currentBid > BigInt(0)
      ? currentBid + (currentBid * BigInt(minBidIncrementBps)) / BigInt(100)
      : reservePrice
        ? BigInt(reservePrice.toString())
        : parseEther("0.01")

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Nouncil</span>
          </Link>
          <div className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Nouns Auction</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Noun Display */}
          <Card className="p-8">
            <div className="aspect-square relative rounded-lg overflow-hidden bg-muted mb-6">
              {nounId !== null ? (
                <img
                  src={`https://noun.pics/${nounId}`}
                  alt={`Noun ${nounId}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Loading Noun...</div>
                </div>
              )}
            </div>
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold">Noun {nounId !== null ? nounId : "..."}</h1>
            </div>

            {previousSettlement && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-bold mb-3">Previous Auction (Noun {previousSettlement.nounId})</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                    <span className="text-muted-foreground">Winner</span>
                    <EnsDisplay address={previousSettlement.winner} className="font-mono" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                    <span className="text-muted-foreground">Winning Bid</span>
                    <span className="font-bold">{formatEther(previousSettlement.amount)} ETH</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                    <span className="text-muted-foreground">Settled By</span>
                    {previousSettlement.settler ? (
                      <EnsDisplay address={previousSettlement.settler} className="font-mono" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {bidHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Bidding History
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bidHistory.map((bid, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">#{bidHistory.length - index}</span>
                        <EnsDisplay address={bid.sender} className="font-mono" />
                      </div>
                      <span className="font-bold">{formatEther(bid.value)} ETH</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Auction Info & Bidding */}
          <div className="space-y-6">
            {/* Current Status */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Auction Status</h2>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Time Remaining</span>
                  <span className="font-bold text-lg">{timeRemaining || "Loading..."}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Current Bid</span>
                  <span className="font-bold text-lg">
                    {currentBid > BigInt(0) ? `${formatEther(currentBid)} ETH` : "No bids yet"}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Minimum Next Bid</span>
                  <span className="font-bold text-primary">{formatEther(minNextBid)} ETH</span>
                </div>

                {auctionCurator && (
                  <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Curator of auction:</span>
                    <div className="text-sm font-medium">
                      <EnsDisplay address={auctionCurator} />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Bidding Form */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Place Your Bid</h2>
              </div>

              {!isConnected ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Connect your wallet to place a bid</p>
                  <WalletConnectButton />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Bid Amount (ETH)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min={formatEther(minNextBid)}
                      placeholder={`Min: ${formatEther(minNextBid)} ETH`}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      disabled={isPending || isConfirming}
                      className="text-lg"
                    />
                  </div>

                  <Button
                    onClick={handleBid}
                    disabled={!bidAmount || isPending || isConfirming || parseEther(bidAmount || "0") < minNextBid}
                    className="w-full"
                    size="lg"
                  >
                    {isPending || isConfirming ? "Processing..." : "Place Bid"}
                  </Button>

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive rounded-lg text-sm text-destructive">
                      {error.message}
                    </div>
                  )}

                  {isSuccess && (
                    <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg text-sm text-green-500">
                      Bid placed successfully!
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Your bid must be at least {minBidIncrementBps}% higher than the current bid. If
                  you are outbid, your ETH will be automatically refunded.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
