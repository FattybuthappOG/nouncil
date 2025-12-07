"use client"

import { DialogTitle } from "@/components/ui/dialog"

import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogTrigger, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { useCandidateData, useCandidateIds } from "@/hooks/useContractData"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { parseMarkdownMedia } from "@/lib/markdown-parser"
import { EnsDisplay } from "@/components/ens-display"
import { useState, useEffect } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseAbi } from "viem"

type LanguageCode = keyof typeof translations

const translations = {
  en: {
    back: "Back",
    candidate: "Candidate",
    proposer: "Proposer",
    sponsors: "Sponsors",
    sponsorCandidate: "Sponsor Candidate",
    viewOnEtherscan: "View on Etherscan",
    transaction: "Transaction",
    media: "Media",
    description: "Description",
    loadingCandidate: "Loading candidate...",
    daysAgo: "days ago",
    hoursAgo: "hours ago",
    recently: "Recently",
    signatureValidity: "Signature Validity",
    days: "days",
    sponsorReason: "Reason for sponsoring (optional)",
    explainWhy: "Explain why you want to sponsor this candidate...",
    generateTransaction: "Generate Sponsor Transaction",
    connectWallet: "Connect wallet to sponsor",
  },
  zh: {
    back: "返回",
    candidate: "候选人",
    proposer: "提议者",
    sponsors: "赞助者",
    sponsorCandidate: "赞助候选人",
    viewOnEtherscan: "在 Etherscan 上查看",
    transaction: "交易",
    media: "媒体",
    description: "描述",
    loadingCandidate: "正在加载候选人...",
    daysAgo: "天前",
    hoursAgo: "小时前",
    recently: "最近",
    signatureValidity: "签名有效期",
    days: "天",
    sponsorReason: "赞助理由（可选）",
    explainWhy: "解释您为何要赞助此候选人...",
    generateTransaction: "生成赞助交易",
    connectWallet: "连接钱包以赞助",
  },
  es: {
    back: "Volver",
    candidate: "Candidato",
    proposer: "Proponente",
    sponsors: "Patrocinadores",
    sponsorCandidate: "Patrocinar Candidato",
    viewOnEtherscan: "Ver en Etherscan",
    transaction: "Transacción",
    media: "Medios",
    description: "Descripción",
    loadingCandidate: "Cargando candidato...",
    daysAgo: "días atrás",
    hoursAgo: "horas atrás",
    recently: "Recientemente",
    signatureValidity: "Validez de Firma",
    days: "días",
    sponsorReason: "Razón para patrocinar (opcional)",
    explainWhy: "Explica por qué quieres patrocinar este candidato...",
    generateTransaction: "Generar Transacción de Patrocinio",
    connectWallet: "Conectar billetera para patrocinar",
  },
}

const NOUNS_DAO_DATA_CONTRACT = "0xf790A5f59678dd733fb3De93493A91f472ca1365"

const NOUNS_DAO_DATA_ABI = parseAbi([
  "function addSignature(bytes sig, uint256 expirationTimestamp, address proposer, string slug, uint256 proposalIdToUpdate, bytes encodedProp, string reason) external",
])

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const candidateNumber = Number.parseInt(params.id)
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en")
  const [translatedDescription, setTranslatedDescription] = useState("")
  const [validityDays, setValidityDays] = useState(7)
  const [sponsorReason, setSponsorReason] = useState("")
  const [showWalletDialog, setShowWalletDialog] = useState(false)
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { candidates, totalCount, isLoading: candidatesLoading } = useCandidateIds(1000)
  const candidate = candidates.find((c, idx) => totalCount - idx === candidateNumber)
  const candidateId = candidate?.id || params.id
  const candidateData = useCandidateData(candidateId)
  const router = useRouter()
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    const savedLanguage = localStorage.getItem("nouns-language") as LanguageCode
    if (savedLanguage && translations[savedLanguage]) {
      setSelectedLanguage(savedLanguage)
    }
  }, [])

  useEffect(() => {
    if (!candidateData.fullDescription) return

    if (selectedLanguage === "en") {
      setTranslatedDescription(candidateData.fullDescription)
      return
    }

    const translateDescription = async () => {
      try {
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(candidateData.fullDescription.slice(0, 500))}&langpair=en|${selectedLanguage}`,
        )
        const data = await response.json()
        if (data.responseStatus === 200 && data.responseData.translatedText) {
          setTranslatedDescription(data.responseData.translatedText)
        } else {
          setTranslatedDescription(candidateData.fullDescription)
        }
      } catch (error) {
        console.error("Translation error:", error)
        setTranslatedDescription(candidateData.fullDescription)
      }
    }

    translateDescription()
  }, [selectedLanguage, candidateData.fullDescription])

  const t = (key: string) => {
    return translations[selectedLanguage]?.[key] || translations.en[key] || key
  }

  const handleSponsorClick = async () => {
    if (!isConnected) {
      alert(t("connectWallet"))
      return
    }

    try {
      const expirationTimestamp = Math.floor(Date.now() / 1000) + validityDays * 24 * 60 * 60

      const emptySignature = "0x00"

      const emptyEncodedProp = "0x00"

      console.log("[v0] Sponsoring candidate:", {
        slug: candidateData.slug,
        proposer: candidateData.proposer,
        expirationTimestamp,
        reason: sponsorReason || "Supporting this candidate",
      })

      await writeContract({
        address: NOUNS_DAO_DATA_CONTRACT,
        abi: NOUNS_DAO_DATA_ABI,
        functionName: "addSignature",
        args: [
          emptySignature,
          BigInt(expirationTimestamp),
          candidateData.proposer,
          candidateData.slug,
          BigInt(0), // proposalIdToUpdate - 0 for new candidates
          emptyEncodedProp,
          sponsorReason || "Supporting this candidate",
        ],
      })

      console.log("[v0] Sponsor transaction submitted successfully")
    } catch (err) {
      console.error("[v0] Sponsor transaction error:", err)
      alert(`Error: ${err instanceof Error ? err.message : "Failed to sponsor"}`)
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return t("recently")
    const now = Math.floor(Date.now() / 1000)
    const diff = now - timestamp
    const days = Math.floor(diff / 86400)
    const hours = Math.floor(diff / 3600)

    if (days > 0) return `${days} ${t("daysAgo")}`
    if (hours > 0) return `${hours} ${t("hoursAgo")}`
    return t("recently")
  }

  if (candidatesLoading || candidateData.isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">{t("loadingCandidate")}</div>
      </div>
    )
  }

  const { images, videos } = parseMarkdownMedia(candidateData.fullDescription)

  return (
    <div className="min-h-screen bg-gray-900 overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back")}
          </Button>
          {isConnected ? (
            <Button
              variant="outline"
              onClick={() => disconnect()}
              className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
            >
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </Button>
          ) : (
            <Button onClick={() => setShowWalletDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              Connect Wallet
            </Button>
          )}
        </div>
      </header>

      {/* Wallet Selection Dialog */}
      <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-gray-100">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => {
                  try {
                    connect({ connector })
                    setShowWalletDialog(false)
                  } catch (error) {
                    console.error("Connection error:", error)
                  }
                }}
                className="w-full p-4 rounded-lg flex items-center gap-3 transition-colors bg-gray-700 hover:bg-gray-600 text-white"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span className="font-medium">{connector.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 overflow-hidden">
        {/* Candidate Header */}
        <Card className="bg-gray-800 border-gray-700 p-6 overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {t("candidate")} #{candidateNumber}
                  </Badge>
                </div>
                <h1 className="text-2xl font-bold text-gray-100 mb-2 break-words">{candidateData.description}</h1>
                <div className="flex items-center gap-3 flex-wrap text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTimeAgo(candidateData.createdTimestamp)}
                  </div>
                </div>
              </div>
            </div>

            {/* Proposer Info */}
            <div className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50 break-all flex-wrap">
              <span className="text-sm text-gray-400">{t("proposer")}:</span>
              <EnsDisplay address={candidateData.proposer} />
              <a
                href={`https://etherscan.io/address/${candidateData.proposer}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Sponsors Section */}
            {candidateData.sponsors && candidateData.sponsors.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50 break-all flex-wrap">
                <span className="text-sm text-gray-400">
                  {t("sponsors")} ({candidateData.sponsors.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {candidateData.sponsors.map((sponsor, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <EnsDisplay address={sponsor} />
                      <a
                        href={`https://etherscan.io/address/${sponsor}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sponsor Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">{t("sponsorCandidate")}</Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700 text-gray-100">
                <DialogHeader>
                  <DialogTitle>{t("sponsorCandidate")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="validity" className="text-gray-300">
                      {t("signatureValidity")}
                    </Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        id="validity"
                        type="number"
                        min="1"
                        max="365"
                        value={validityDays}
                        onChange={(e) => setValidityDays(Number.parseInt(e.target.value) || 7)}
                        className="bg-gray-700 border-gray-600 text-gray-100"
                      />
                      <span className="text-gray-400">{t("days")}</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="reason" className="text-gray-300">
                      {t("sponsorReason")}
                    </Label>
                    <Textarea
                      id="reason"
                      value={sponsorReason}
                      onChange={(e) => setSponsorReason(e.target.value)}
                      placeholder={t("explainWhy")}
                      className="bg-gray-700 border-gray-600 text-gray-100 mt-2"
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleSponsorClick}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!isConnected || isPending || isConfirming}
                  >
                    {isPending
                      ? "Preparing..."
                      : isConfirming
                        ? "Confirming..."
                        : isConfirmed
                          ? "Sponsored!"
                          : isConnected
                            ? t("generateTransaction")
                            : t("connectWallet")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Transaction */}
            {candidateData.transactionHash && (
              <div className="flex items-center gap-2 text-sm break-all flex-wrap">
                <span className="text-gray-400">{t("transaction")}:</span>
                <a
                  href={`https://etherscan.io/tx/${candidateData.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {candidateData.transactionHash.slice(0, 10)}...{candidateData.transactionHash.slice(-8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* Media Section */}
        {(images.length > 0 || videos.length > 0) && (
          <Card className="bg-gray-800 border-gray-700 p-6 overflow-hidden">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">{t("media")}</h2>
            <div className="space-y-4">
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={img || "/placeholder.svg"}
                  alt={`Candidate media ${idx + 1}`}
                  className="w-full max-w-full rounded-lg border border-gray-700"
                />
              ))}
              {videos.map((videoId, idx) => (
                <div key={idx} className="relative w-full pt-[56.25%] overflow-hidden rounded-lg">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Description */}
        <Card className="bg-gray-800 border-gray-700 p-6 overflow-hidden">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">{t("description")}</h2>
          <div className="prose prose-invert max-w-none break-words overflow-hidden">
            <ReactMarkdown
              skipHtml={true}
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-3xl font-bold text-gray-100 mt-6 mb-4 break-words" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-2xl font-bold text-gray-200 mt-5 mb-3 break-words" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-xl font-semibold text-gray-300 mt-4 mb-2 break-words" {...props} />
                ),
                p: ({ node, ...props }) => <p className="text-gray-300 leading-relaxed mb-4 break-words" {...props} />,
                a: ({ node, ...props }) => (
                  <a
                    className="text-blue-400 hover:text-blue-300 underline break-all"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-4 border-gray-600 pl-4 italic text-gray-400 my-4 break-words"
                    {...props}
                  />
                ),
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm text-gray-200 break-all" {...props} />
                  ) : (
                    <code
                      className="block bg-gray-700 p-4 rounded-lg text-sm text-gray-200 overflow-x-auto mb-4"
                      {...props}
                    />
                  ),
                img: () => null,
              }}
            >
              {translatedDescription || candidateData.fullDescription}
            </ReactMarkdown>
          </div>
        </Card>
      </div>
    </div>
  )
}
