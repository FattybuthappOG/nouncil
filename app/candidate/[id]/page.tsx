"use client"

import { DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogTrigger, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { useCandidateData, useProposalData } from "@/hooks/useContractData"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink, Clock } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useAccount, useSignMessage, useWriteContract, useDisconnect } from "wagmi"
import { keccak256, encodePacked } from "viem"
import { NOUNS_PROPOSALS_ABI } from "@/constants/abi"
import WalletConnectButton from "@/components/wallet-connect-button" // Import WalletConnect button
import ReactMarkdown from "react-markdown" // Declare ReactMarkdown variable
import { parseMarkdownMedia } from "@/utils/markdown" // Declare parseMarkdownMedia variable
import EnsDisplay from "@/components/ens-display" // Declare EnsDisplay variable
import { useState, useEffect } from "react" // Import useState and useEffect

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
    transactionCancelled: "Transaction cancelled",
    sponsorError: "Sponsor error",
    preparing: "Preparing...",
    confirming: "Confirming...",
    sponsored: "Sponsored!",
    idle: "Sponsor",
    userRejected: "Transaction rejected by user",
    sponsorSuccess: "Successfully sponsored candidate!",
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
    transactionCancelled: "交易已取消",
    sponsorError: "赞助错误",
    preparing: "准备中...",
    confirming: "确认中...",
    sponsored: "已赞助！",
    idle: "赞助",
    userRejected: "用户拒绝交易",
    sponsorSuccess: "成功赞助候选人！",
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
    transactionCancelled: "Transacción cancelada",
    sponsorError: "Error de patrocinio",
    preparing: "Preparando...",
    confirming: "Confirming...",
    sponsored: "Patrocinado！",
    idle: "Patrocinar",
    userRejected: "Transacción rechazada por el usuario",
    sponsorSuccess: "¡Candidato patrocinado con éxito!",
  },
}

const NOUNS_DAO_DATA_CONTRACT = "0xf790A5f59678dd733fb3De93493A91f472ca1365"

export default function CandidateDetailPage() {
  const router = useRouter()
  const { id } = useParams()
  const candidateNumber = Number.parseInt(id)
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en")
  const [translatedDescription, setTranslatedDescription] = useState("")
  const [validityDays, setValidityDays] = useState(42)
  const [sponsorReason, setSponsorReason] = useState("")
  const [showSponsorDialog, setShowSponsorDialog] = useState(false)
  const [sponsorStatus, setSponsorStatus] = useState("idle")
  const [txHash, setTxHash] = useState("")
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const candidateData = useCandidateData(id)
  const proposalData = useProposalData(id)

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
        setTranslatedDescription(candidateData.fullDescription)
      }
    }

    translateDescription()
  }, [selectedLanguage, candidateData.fullDescription])

  const t = (key: string) => {
    return translations[selectedLanguage]?.[key] || translations.en[key] || key
  }

  const handleSponsorClick = async () => {
    if (!address) {
      alert("Please connect your wallet first")
      return
    }

    try {
      setSponsorStatus("preparing")

      const expirationTimestamp = Math.floor(Date.now() / 1000) + validityDays * 24 * 60 * 60

      const encodedProp = encodePacked(
        [
          { name: "targets", type: "address[]" },
          { name: "values", type: "uint256[]" },
          { name: "signatures", type: "string[]" },
          { name: "calldatas", type: "bytes[]" },
        ],
        [
          (candidateData.targets || []) as `0x${string}`[],
          (candidateData.values || []).map((v) => BigInt(v)),
          candidateData.signatures || [],
          (candidateData.calldatas || []) as `0x${string}`[],
        ],
      )

      const encodedPropHash = keccak256(encodedProp)

      const messageToSign = encodePacked(
        [
          { name: "expirationTimestamp", type: "uint256" },
          { name: "proposer", type: "address" },
          { name: "slug", type: "string" },
          { name: "proposalIdToUpdate", type: "uint256" },
          { name: "encodedPropHash", type: "bytes32" },
        ],
        [
          BigInt(expirationTimestamp),
          candidateData.proposer as `0x${string}`,
          candidateData.slug || "",
          BigInt(0),
          encodedPropHash,
        ],
      )

      const sigDigest = keccak256(messageToSign)

      setSponsorStatus("signing")

      const signature = await useSignMessage.signMessageAsync({
        message: { raw: sigDigest },
      })

      if (signature.length !== 132) {
        throw new Error(`Invalid signature length: expected 132 chars (0x + 65 bytes * 2), got ${signature.length}`)
      }

      setSponsorStatus("submitting")

      const hash = await useWriteContract.writeContractAsync({
        address: "0xf790A5f59678dd733fb3De93493A91f472ca1365",
        abi: NOUNS_PROPOSALS_ABI,
        functionName: "addSignature",
        args: [
          signature,
          BigInt(expirationTimestamp),
          candidateData.proposer as `0x${string}`,
          candidateData.slug || "",
          BigInt(0),
          encodedProp,
          "",
        ],
        chainId: 1, // Explicitly specify mainnet
      })

      setSponsorStatus("success")
      setTxHash(hash)
      alert("Successfully sponsored candidate!")
    } catch (error: any) {
      console.error("[v0] Sponsor error:", error)

      if (error.message?.includes("User rejected") || error.message?.includes("User denied") || error.code === 4001) {
        setSponsorStatus("idle")
        return
      }

      setSponsorStatus("error")
      alert(`Failed to sponsor candidate: ${error.message || "Unknown error"}`)
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

  if (candidateData.isLoading || proposalData.isLoading) {
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
            <Button onClick={() => disconnect()} variant="outline">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </Button>
          ) : (
            <WalletConnectButton /> // Use WalletConnect button
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 overflow-hidden">
        {/* Candidate Header */}
        <Card className="bg-gray-800 border-gray-700 p-6 overflow-hidden">
          <CardHeader>
            <CardTitle>
              {t("candidate")} #{candidateNumber}
            </CardTitle>
            <CardDescription>{candidateData.description}</CardDescription>
          </CardHeader>
          <CardContent>
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
              <Dialog open={showSponsorDialog} onOpenChange={setShowSponsorDialog}>
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
                          onChange={(e) => {
                            const value = Number.parseInt(e.target.value)
                            if (!isNaN(value) && value >= 1) {
                              setValidityDays(value)
                            }
                          }}
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
                      disabled={sponsorStatus !== "idle"}
                    >
                      {sponsorStatus === "preparing" && t("preparing")}
                      {sponsorStatus === "signing" && "Sign Message (No Gas)"}
                      {sponsorStatus === "submitting" && t("confirming")}
                      {sponsorStatus === "success" && t("sponsored")}
                      {sponsorStatus === "idle" && t("idle")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Transaction */}
              {txHash && (
                <div className="flex items-center gap-2 text-sm break-all flex-wrap">
                  <span className="text-gray-400">{t("transaction")}:</span>
                  <a
                    href={`https://etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Media Section */}
        {(images.length > 0 || videos.length > 0) && (
          <Card className="bg-gray-800 border-gray-700 p-6 overflow-hidden">
            <CardHeader>
              <CardTitle>{t("media")}</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <Card className="bg-gray-800 border-gray-700 p-6 overflow-hidden">
          <CardHeader>
            <CardTitle>{t("description")}</CardTitle>
          </CardHeader>
          <CardContent>
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
                  p: ({ node, ...props }) => (
                    <p className="text-gray-300 leading-relaxed mb-4 break-words" {...props} />
                  ),
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
