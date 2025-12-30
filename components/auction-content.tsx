"use client"

import { useState, useEffect } from "react"
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useBalance,
  usePublicClient,
} from "wagmi"
import { useAccount } from "wagmi"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Menu,
  X,
  Sun,
  Moon,
  Copy,
  Check,
  Gavel,
  ChevronDown,
  TrendingUp,
  User,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EnsDisplay } from "@/components/ens-display"
import { fetchAuctionCurator } from "@/app/actions/fetch-curator"
import { TreasuryDropdown } from "@/components/treasury-dropdown"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { parseEther, formatEther } from "ethers"

const NOUNS_AUCTION_ADDRESS = "0x830BD73E4184ceF73443C15111a1DF14e495C706" as const

const NOUNS_AUCTION_ABI = [
  {
    inputs: [],
    name: "auction",
    outputs: [
      { name: "nounId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "bidder", type: "address" },
      { name: "settled", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minBidIncrementPercentage",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reservePrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "nounId", type: "uint256" }],
    name: "createBid",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "nounId", type: "uint256" },
      { indexed: false, name: "sender", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
      { indexed: false, name: "extended", type: "bool" },
    ],
    name: "AuctionBid",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "nounId", type: "uint256" },
      { indexed: false, name: "winner", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "AuctionSettled",
    type: "event",
  },
] as const

type LanguageCode = "en" | "zh" | "es" | "pt" | "ja"

const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    backToNouncil: "Back to Nouncil",
    nounsAuction: "Nouns Auction",
    auctionStatus: "Auction Status",
    timeRemaining: "Time Remaining",
    currentBid: "Current Bid",
    minimumNextBid: "Minimum Next Bid",
    placeYourBid: "Place Your Bid",
    enterBidAmount: "Enter bid amount in ETH",
    placeBid: "Place Bid",
    confirmingBid: "Confirming...",
    placingBid: "Placing Bid...",
    connectWallet: "Connect Wallet to Bid",
    bidHistory: "Bid History",
    curatorOfAuction: "Curator of auction",
    learnNouns: "Learn about Nouns",
    togaPfp: "Toga PFP generator",
    discord: "Join our Discord",
  },
  zh: {
    backToNouncil: "返回 Nouncil",
    nounsAuction: "Nouns 拍卖",
    auctionStatus: "拍卖状态",
    timeRemaining: "剩余时间",
    currentBid: "当前出价",
    minimumNextBid: "最低下次出价",
    placeYourBid: "出价",
    enterBidAmount: "输入 ETH 出价金额",
    placeBid: "出价",
    confirmingBid: "确认中...",
    placingBid: "出价中...",
    connectWallet: "连接钱包出价",
    bidHistory: "出价历史",
    curatorOfAuction: "拍卖策展人",
    learnNouns: "了解 Nouns",
    togaPfp: "Toga PFP 生成器",
    discord: "加入我们的 Discord",
  },
  es: {
    backToNouncil: "Volver a Nouncil",
    nounsAuction: "Subasta de Nouns",
    auctionStatus: "Estado de la subasta",
    timeRemaining: "Tiempo restante",
    currentBid: "Oferta actual",
    minimumNextBid: "Próximo lance mínimo",
    placeYourBid: "Haz tu oferta",
    enterBidAmount: "Ingresa el monto en ETH",
    placeBid: "Dar lance",
    confirmingBid: "Confirmando...",
    placingBid: "Ofertando...",
    connectWallet: "Conecta tu wallet para dar lance",
    bidHistory: "Historial de ofertas",
    curatorOfAuction: "Curador de la subasta",
    learnNouns: "Aprende sobre Nouns",
    togaPfp: "Generador Toga PFP",
    discord: "Únete a nuestro Discord",
  },
  pt: {
    backToNouncil: "Voltar para Nouncil",
    nounsAuction: "Leilão Nouns",
    auctionStatus: "Status do leilão",
    timeRemaining: "Tempo restante",
    currentBid: "Lance atual",
    minimumNextBid: "Próximo lance mínimo",
    placeYourBid: "Faça seu lance",
    enterBidAmount: "Digite o valor em ETH",
    placeBid: "Dar lance",
    confirmingBid: "Confirmando...",
    placingBid: "Dando lance...",
    connectWallet: "Conecte sua carteira para dar lance",
    bidHistory: "Histórico de lances",
    curatorOfAuction: "Curador do leilão",
    learnNouns: "Aprenda sobre Nouns",
    togaPfp: "Gerador Toga PFP",
    discord: "Junte-se ao nosso Discord",
  },
  ja: {
    backToNouncil: "Nouncilに戻る",
    nounsAuction: "Nounsオークション",
    auctionStatus: "オークション状況",
    timeRemaining: "残り時間",
    currentBid: "現在の入札",
    minimumNextBid: "最低次回入札額",
    placeYourBid: "入札する",
    enterBidAmount: "ETHで入札額を入力",
    placeBid: "入札",
    confirmingBid: "確認中...",
    placingBid: "入札中...",
    connectWallet: "入札するにはウォレットを接続",
    bidHistory: "入札履歴",
    curatorOfAuction: "オークションキュレーター",
    learnNouns: "Nounsについて学ぶ",
    togaPfp: "Toga PFPジェネレーター",
    discord: "Discordに参加",
  },
}

export default function AuctionContent() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <Link href="/" className="flex items-center gap-3 text-gray-300">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Nouncil</span>
          </Link>
        </div>
        <main className="max-w-4xl mx-auto p-4">
          <div className="flex flex-col items-center mb-8">
            <div className="w-full max-w-md aspect-square rounded-2xl bg-gray-800 animate-pulse mb-4" />
          </div>
        </main>
      </div>
    )
  }

  return <AuctionContentInner />
}

function AuctionContentInner() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const { isConnected } = useAccount()
  const [bidAmount, setBidAmount] = useState("")
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [bidHistory, setBidHistory] = useState<Array<{ sender: string; value: bigint; timestamp: number }>>([])
  const [auctionCurator, setAuctionCurator] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en")
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)

  const { data: balanceData } = useBalance({
    address: "0x0BC3807Ec262cB779b38D65b38158acC3bfedE10",
    query: { enabled: mounted },
  })
  const balance = balanceData
    ? `${Number.parseFloat(balanceData.formatted).toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH`
    : "Loading..."

  const { data: auctionData, refetch: refetchAuction } = useReadContract({
    address: NOUNS_AUCTION_ADDRESS,
    abi: NOUNS_AUCTION_ABI,
    functionName: "auction",
    query: { enabled: mounted },
  })

  const { data: minBidIncrement } = useReadContract({
    address: NOUNS_AUCTION_ADDRESS,
    abi: NOUNS_AUCTION_ABI,
    functionName: "minBidIncrementPercentage",
    query: { enabled: mounted },
  })

  const { data: reservePrice } = useReadContract({
    address: NOUNS_AUCTION_ADDRESS,
    abi: NOUNS_AUCTION_ABI,
    functionName: "reservePrice",
    query: { enabled: mounted },
  })

  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: mounted && !!hash },
  })

  const publicClient = usePublicClient()

  useWatchContractEvent({
    address: NOUNS_AUCTION_ADDRESS,
    abi: NOUNS_AUCTION_ABI,
    eventName: "AuctionBid",
    enabled: mounted,
    onLogs(logs) {
      logs.forEach((log: any) => {
        if (log.args.nounId === auctionData?.[0]) {
          setBidHistory((prev) => [{ sender: log.args.sender, value: log.args.value, timestamp: Date.now() }, ...prev])
        }
      })
    },
  })

  useWatchContractEvent({
    address: NOUNS_AUCTION_ADDRESS,
    abi: NOUNS_AUCTION_ABI,
    eventName: "AuctionSettled",
    enabled: mounted,
    onLogs(logs) {
      logs.forEach(async (log: any) => {
        const currentNounId = auctionData?.[0] ? Number(auctionData[0]) : null
        if (log.args.nounId && currentNounId && Number(log.args.nounId) === currentNounId - 1) {
          if (publicClient && log.transactionHash) {
            try {
              const tx = await publicClient.getTransaction({ hash: log.transactionHash })
              setAuctionCurator(tx.from)
            } catch (e) {
              console.error(e)
            }
          }
        }
      })
    },
  })

  const t = (key: string) => translations[selectedLanguage]?.[key] || translations.en[key] || key

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("nouncil-dark-mode")
    if (savedDarkMode !== null) setIsDarkMode(savedDarkMode === "true")
    const savedLanguage = localStorage.getItem("nouns-language") as LanguageCode
    if (savedLanguage && translations[savedLanguage]) setSelectedLanguage(savedLanguage)
  }, [])

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
  }, [isDarkMode])

  useEffect(() => {
    if (!auctionData) return
    const endTime = Number(auctionData[3]) * 1000
    const updateTimer = () => {
      const diff = endTime - Date.now()
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [auctionData])

  useEffect(() => {
    if (isSuccess) {
      refetchAuction()
      setBidAmount("")
    }
  }, [isSuccess, refetchAuction])

  useEffect(() => {
    if (!auctionData?.[0]) return
    try {
      const result = fetchAuctionCurator(Number(auctionData[0]) - 1)
      if (result.curator) setAuctionCurator(result.curator)
    } catch (e) {
      console.error(e)
    }
  }, [auctionData])

  const handleBid = async () => {
    if (!bidAmount || !auctionData) return
    try {
      writeContract({
        address: NOUNS_AUCTION_ADDRESS,
        abi: NOUNS_AUCTION_ABI,
        functionName: "createBid",
        args: [auctionData[0]],
        value: parseEther(bidAmount),
      })
    } catch (err) {
      console.error(err)
    }
  }

  const nounId = auctionData?.[0] ? Number(auctionData[0]) : 0
  const currentBid = auctionData?.[1] ? formatEther(auctionData[1]) : "0"
  const currentBidder = auctionData?.[4] || "0x0000000000000000000000000000000000000000"
  const minNextBid =
    auctionData?.[1] && minBidIncrement
      ? formatEther(auctionData[1] + (auctionData[1] * BigInt(minBidIncrement)) / BigInt(100))
      : reservePrice
        ? formatEther(reservePrice)
        : "0"

  const copyNoggle = () => {
    navigator.clipboard.writeText("⌐◨-◨")
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const handleLanguageChange = (lang: LanguageCode) => {
    setSelectedLanguage(lang)
    localStorage.setItem("nouns-language", lang)
    setShowLanguageMenu(false)
  }

  const darkBg = "bg-[#1a1a2e]"
  const darkCard = "bg-[#252540]"
  const darkBorder = "border-[#3a3a5a]"
  const lightBg = "bg-gray-50"
  const lightCard = "bg-white"

  return (
    <div className={`min-h-screen ${isDarkMode ? `${darkBg} text-white` : `${lightBg} text-gray-900`}`}>
      <div className="w-full max-w-7xl mx-auto px-4 py-4 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-center gap-2 text-sm hover:opacity-80">
            <ArrowLeft className="h-4 w-4" />
            {t("backToNouncil")}
          </Link>
          <Link href="/">
            <Image src="/images/nouncil-logo.webp" alt="Nouncil" width={40} height={40} className="rounded-full" />
          </Link>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>
              {t("nounsAuction")}
            </span>
            <Gavel className={`h-4 w-4 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
            <div className="relative ml-2">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`p-2 rounded-lg ${isDarkMode ? "hover:bg-[#252540]" : "hover:bg-gray-100"}`}
              >
                {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              {showMenu && (
                <div
                  className={`absolute right-0 top-12 w-56 rounded-lg shadow-lg border z-50 ${isDarkMode ? `${darkCard} ${darkBorder}` : `${lightCard} border-gray-200`}`}
                >
                  <div className="p-2 space-y-1">
                    <TreasuryDropdown isDarkMode={isDarkMode} balance={balance} />
                    <a
                      href="https://nouns.wtf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${isDarkMode ? "hover:bg-[#3a3a5a]" : "hover:bg-gray-100"}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t("learnNouns")}
                    </a>
                    <a
                      href="https://toga.nounswap.wtf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${isDarkMode ? "hover:bg-[#3a3a5a]" : "hover:bg-gray-100"}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t("togaPfp")}
                    </a>
                    <button
                      onClick={copyNoggle}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm w-full ${isDarkMode ? "hover:bg-[#3a3a5a]" : "hover:bg-gray-100"}`}
                    >
                      {copyFeedback ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      {copyFeedback ? "Copied!" : "⌐◨-◨"}
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                        className={`flex items-center justify-between px-3 py-2 rounded-md text-sm w-full ${isDarkMode ? "hover:bg-[#3a3a5a]" : "hover:bg-gray-100"}`}
                      >
                        <span>
                          {selectedLanguage === "en"
                            ? "English"
                            : selectedLanguage === "zh"
                              ? "中文"
                              : selectedLanguage === "es"
                                ? "Español"
                                : selectedLanguage === "pt"
                                  ? "Português"
                                  : "日本語"}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      {showLanguageMenu && (
                        <div
                          className={`absolute left-full top-0 ml-2 w-36 rounded-lg shadow-lg border z-50 ${isDarkMode ? `${darkCard} ${darkBorder}` : `${lightCard} border-gray-200`}`}
                        >
                          <div className="p-1">
                            {(["en", "zh", "es", "pt", "ja"] as LanguageCode[]).map((lang) => (
                              <button
                                key={lang}
                                onClick={() => handleLanguageChange(lang)}
                                className={`w-full text-left px-3 py-2 rounded text-sm ${isDarkMode ? "hover:bg-[#3a3a5a]" : "hover:bg-gray-100"} ${selectedLanguage === lang ? (isDarkMode ? "bg-[#3a3a5a]" : "bg-gray-100") : ""}`}
                              >
                                {lang === "en"
                                  ? "English"
                                  : lang === "zh"
                                    ? "中文"
                                    : lang === "es"
                                      ? "Español"
                                      : lang === "pt"
                                        ? "Português"
                                        : "日本語"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <a
                      href="https://discord.gg/nouncil"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${isDarkMode ? "hover:bg-[#3a3a5a]" : "hover:bg-gray-100"}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t("discord")}
                    </a>
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm w-full ${isDarkMode ? "hover:bg-[#3a3a5a]" : "hover:bg-gray-100"}`}
                    >
                      {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {isDarkMode ? "Light Mode" : "Dark Mode"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Desktop: side by side, Mobile: stacked */}
        <div className="flex flex-col lg:flex-row landscape:flex-row gap-4 lg:gap-8 landscape:gap-6 lg:items-stretch landscape:items-stretch">
          {/* Left side - Auction info */}
          <div className="order-2 landscape:order-1 lg:order-1 flex flex-col gap-3 lg:gap-4 justify-center lg:w-1/2 landscape:w-1/2 flex-shrink-0">
            {/* Time Remaining */}
            <div
              className={`p-4 rounded-xl ${isDarkMode ? darkCard + " " + darkBorder : "bg-white border border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-purple-500/20" : "bg-purple-100"}`}>
                    <Clock className={`h-5 w-5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                  </div>
                  <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {t("timeRemaining")}
                  </span>
                </div>
                <div className="font-mono font-bold text-xl">
                  <span className={isDarkMode ? "text-white" : "text-gray-900"}>{timeLeft.hours}</span>
                  <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}>h </span>
                  <span className={isDarkMode ? "text-white" : "text-gray-900"}>{timeLeft.minutes}</span>
                  <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}>m </span>
                  <span className={isDarkMode ? "text-white" : "text-gray-900"}>{timeLeft.seconds}</span>
                  <span className={isDarkMode ? "text-gray-500" : "text-gray-400"}>s</span>
                </div>
              </div>
            </div>

            {/* Current Bid */}
            <div
              className={`p-4 rounded-xl ${isDarkMode ? darkCard + " " + darkBorder : "bg-white border border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-green-500/20" : "bg-green-100"}`}>
                    <TrendingUp className={`h-5 w-5 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
                  </div>
                  <div className="hidden lg:flex landscape:flex items-center gap-1.5">
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {t("currentBid")}
                    </span>
                    {currentBidder !== "0x0000000000000000000000000000000000000000" && (
                      <>
                        <span className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>by</span>
                        <a
                          href={`https://etherscan.io/address/${currentBidder}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm hover:underline ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}
                        >
                          <EnsDisplay
                            address={currentBidder as `0x${string}`}
                            disableLink
                            className={`${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}
                          />
                        </a>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col lg:hidden landscape:hidden">
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {t("currentBid")}
                    </span>
                    {currentBidder !== "0x0000000000000000000000000000000000000000" && (
                      <a
                        href={`https://etherscan.io/address/${currentBidder}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs flex items-center gap-1 hover:underline ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                      >
                        by{" "}
                        <EnsDisplay
                          address={currentBidder as `0x${string}`}
                          disableLink
                          className={`${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}
                        />
                      </a>
                    )}
                  </div>
                </div>
                <div className={`font-bold text-xl ${isDarkMode ? "text-green-400" : "text-green-600"}`}>
                  {Number.parseFloat(currentBid).toFixed(2)} ETH
                </div>
              </div>
            </div>

            {/* Minimum Next Bid */}
            <div
              className={`p-4 rounded-xl ${isDarkMode ? darkCard + " " + darkBorder : "bg-white border border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? "bg-yellow-500/20" : "bg-yellow-100"}`}>
                    <Gavel className={`h-5 w-5 ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`} />
                  </div>
                  <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    {t("minimumNextBid")}
                  </span>
                </div>
                <div className={`font-bold text-xl ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`}>
                  {Number.parseFloat(minNextBid).toFixed(4)} ETH
                </div>
              </div>
            </div>

            {/* Curator (optional) */}
            {auctionCurator && (
              <div
                className={`p-4 rounded-xl ${isDarkMode ? darkCard + " " + darkBorder : "bg-white border border-gray-200"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDarkMode ? "bg-purple-500/20" : "bg-purple-100"}`}>
                      <User className={`h-5 w-5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                    </div>
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {t("curatorOfAuction")}
                    </span>
                  </div>
                  <div className={`font-medium ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>
                    <EnsDisplay address={auctionCurator as `0x${string}`} />
                  </div>
                </div>
              </div>
            )}

            {/* Bid Input */}
            <div
              className={`p-4 rounded-xl ${isDarkMode ? darkCard + " " + darkBorder : "bg-white border border-gray-200"}`}
            >
              {isConnected ? (
                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder={t("enterBidAmount")}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    step="0.01"
                    min={minNextBid}
                    className={`flex-1 ${isDarkMode ? `${darkBg} ${darkBorder}` : ""}`}
                  />
                  <Button
                    onClick={handleBid}
                    disabled={isPending || isConfirming || !bidAmount}
                    className="bg-purple-600 hover:bg-purple-700 px-6"
                  >
                    {isConfirming ? t("confirmingBid") : isPending ? t("placingBid") : t("placeBid")}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{t("connectWallet")}</p>
                  <WalletConnectButton />
                </div>
              )}
              {error && <p className="text-red-500 text-sm mt-2">{error.message}</p>}
            </div>

            {/* Bid History */}
            {bidHistory.length > 0 && (
              <div
                className={`p-4 rounded-xl ${isDarkMode ? darkCard + " " + darkBorder : "bg-white border border-gray-200"}`}
              >
                <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {t("bidHistory")}
                </h3>
                <div className="space-y-2">
                  {bidHistory.slice(0, 5).map((bid, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-2 rounded-lg text-sm ${isDarkMode ? darkBg : "bg-gray-50"}`}
                    >
                      <EnsDisplay address={bid.sender as `0x${string}`} />
                      <span className="font-mono">{formatEther(bid.value)} ETH</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right side - Noun artwork */}
          <div className="order-1 landscape:order-2 lg:order-2 flex flex-col items-center justify-center mb-4 landscape:mb-0 lg:mb-0 lg:w-1/2 landscape:w-1/2 lg:flex-1">
            <div
              className={`w-full max-w-[280px] lg:max-w-none landscape:max-w-none lg:w-full landscape:w-full aspect-square lg:aspect-auto landscape:aspect-auto lg:flex-1 landscape:flex-1 rounded-2xl overflow-hidden ${isDarkMode ? darkCard : "bg-gray-100"} flex items-center justify-center`}
            >
              <Image
                src={`https://noun.pics/${nounId}`}
                alt={`Noun ${nounId}`}
                width={800}
                height={800}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl lg:text-4xl font-bold mt-4">Noun {nounId}</h1>
          </div>
        </div>
      </div>
    </div>
  )
}
