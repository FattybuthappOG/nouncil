"use client"

import { useState, useEffect } from "react"
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useWatchContractEvent,
} from "wagmi"
import { parseEther, formatEther } from "viem"
import { NOUNS_AUCTION_ABI, NOUNS_AUCTION_ADDRESS, CLIENT_ID } from "@/lib/nouns-auction-abi"
import { ArrowLeft, Gavel, Clock, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import WalletConnectButton from "@/components/wallet-connect-button"
import { EnsDisplay } from "@/components/ens-display"

interface Bid {
  sender: string
  value: bigint
  timestamp: number
}

export default function AuctionPage() {
  const { address, isConnected } = useAccount()
  const [bidAmount, setBidAmount] = useState("")
  const [timeRemaining, setTimeRemaining] = useState("")
  const [bidHistory, setBidHistory] = useState<Bid[]>([])

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

  const currentBid = auctionData?.[1] ? BigInt(auctionData[1].toString()) : BigInt(0)
  const minBidIncrementBps = minBidIncrement ? Number(minBidIncrement) : 5
  const minNextBid =
    currentBid > BigInt(0)
      ? currentBid + (currentBid * BigInt(minBidIncrementBps)) / BigInt(100)
      : reservePrice
        ? BigInt(reservePrice.toString())
        : parseEther("0.01")

  useEffect(() => {
    if (auctionData?.[4] && auctionData?.[1] && currentBid > BigInt(0)) {
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
        args: [CLIENT_ID, nounId],
        value,
      })
    } catch (err) {
      console.error("Bid error:", err)
    }
  }

  const nounId = auctionData?.[0] ? Number(auctionData[0]) : null
  const currentBidder = auctionData?.[4] || null
  const isUserHighBidder = currentBidder?.toLowerCase() === address?.toLowerCase()

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

                {currentBidder && (
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Leading Bidder</span>
                    {isUserHighBidder ? (
                      <span className="text-green-500 font-bold">You!</span>
                    ) : (
                      <EnsDisplay address={currentBidder as string} className="font-mono text-sm" />
                    )}
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
