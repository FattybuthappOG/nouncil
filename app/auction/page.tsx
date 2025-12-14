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
import { Clock, TrendingUp, Gavel, Menu, X, Sun, Moon, Copy, Globe } from "lucide-react"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import EnsDisplay from "@/components/ens-display"
import { NOUNS_AUCTION_ABI } from "@/lib/nouns-auction-abi"
import { NOUNS_AUCTION_ADDRESS } from "@/lib/nouns-auction-abi"
import { fetchAuctionCurator } from "@/app/actions/fetch-curator"
import { TreasuryDropdown } from "@/components/treasury-dropdown"
import { useBalance } from "wagmi"

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
] as const

type LanguageCode = (typeof LANGUAGES)[number]["code"]

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
  const [showMenu, setShowMenu] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en")
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)

  const { data: balanceData } = useBalance({
    address: "0x0BC3807Ec262cB779b38D65b38158acC3bfedE10",
  })
  const balance = balanceData
    ? `${Number.parseFloat(balanceData.formatted).toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH`
    : "Loading..."

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
    const savedDarkMode = localStorage.getItem("nouncil-dark-mode")
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === "true")
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("nouncil-dark-mode", String(isDarkMode))
      document.documentElement.classList.toggle("dark", isDarkMode)
    }
  }, [isDarkMode, mounted])

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

  const copyNounsSymbol = () => {
    navigator.clipboard.writeText("⌐◨-◨")
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <header
        className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b sticky top-0 z-50 backdrop-blur`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img src="/images/logo-nouncil.webp" alt="Nouncil" className="h-12 w-auto" />
            </Link>
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg">Nouns Auction</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <WalletConnectButton />
            <button
              onClick={() => setShowMenu(true)}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {showMenu && (
          <div className="fixed inset-0 z-[100]" onClick={() => setShowMenu(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute right-0 top-0 min-h-full w-full sm:w-96 ${isDarkMode ? "bg-gray-900" : "bg-white"} shadow-2xl overflow-y-auto`}
            >
              <div className="p-6 min-h-screen">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold"></h2>
                  <button
                    onClick={() => setShowMenu(false)}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <TreasuryDropdown balance={balance} isDarkMode={isDarkMode} />

                  <a
                    href="https://nouns.world/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMenu(false)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${
                      isDarkMode
                        ? "bg-gray-800 hover:bg-gray-700 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    }`}
                  >
                    <img src="/images/nounsworld.gif" alt="Nouns World" className="w-6 h-6 rounded" />
                    <span className="font-medium">Learn about Nouns</span>
                  </a>

                  <a
                    href="https://togatime.cloudnouns.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMenu(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                  >
                    <span className="font-medium">Generate Toga PFP</span>
                  </a>

                  <button
                    onClick={copyNounsSymbol}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Copy className="w-5 h-5" />
                      <span className="font-medium">Copy Nouns Symbol</span>
                    </div>
                    {copyFeedback && <span className="text-sm text-green-500 font-medium">Copied!</span>}
                  </button>

                  <div className={`rounded-lg border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                    <button
                      onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5" />
                        <span className="font-medium">Language</span>
                      </div>
                      <span className="text-xl">{LANGUAGES.find((l) => l.code === selectedLanguage)?.flag}</span>
                    </button>

                    {showLanguageMenu && (
                      <div className={`border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setSelectedLanguage(lang.code)
                              setShowLanguageMenu(false)
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              selectedLanguage === lang.code
                                ? isDarkMode
                                  ? "bg-gray-800"
                                  : "bg-gray-100"
                                : isDarkMode
                                  ? "hover:bg-gray-800"
                                  : "hover:bg-gray-100"
                            }`}
                          >
                            <span className="text-xl">{lang.flag}</span>
                            <span className="font-medium">{lang.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <a
                    href="https://discord.gg/tnyXJZsGnq"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMenu(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                  >
                    <img src="/images/discord-logo.svg" alt="Discord" className="w-6 h-6" />
                    <span className="font-medium">Join Calls Thursday</span>
                  </a>

                  <button
                    onClick={() => {
                      setIsDarkMode(!isDarkMode)
                      setShowMenu(false)
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                  >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    <span className="font-medium">{isDarkMode ? "Light Theme" : "Dark Theme"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Noun Display */}
          <Card className={`p-8 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
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
            <Card className={`p-6 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
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
            <Card className={`p-6 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
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
