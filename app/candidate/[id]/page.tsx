"use client"

import { DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogTrigger, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { useCandidateData, useCandidateSignatures, useProposalData } from "@/hooks/useContractData"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Clock, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAccount, useSignMessage, useWriteContract, useDisconnect } from "wagmi"
import { keccak256, encodePacked } from "viem"
import { NOUNS_PROPOSALS_ABI } from "@/constants/abi"
import ReactMarkdown from "react-markdown" // Declare ReactMarkdown variable
import { parseMarkdownMedia } from "@/utils/markdown" // Declare parseMarkdownMedia variable
import EnsDisplay from "@/components/ens-display" // Declare EnsDisplay variable
import { useState, useEffect } from "react" // Import useState and useEffect

type LanguageCode = keyof typeof translations

type CandidateDetailPageProps = {
  params: { id: string }
}

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

export default function CandidateDetailPage({ params }: CandidateDetailPageProps) {
  const router = useRouter()
  const { id } = params
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
  const { signatures, isLoading: signaturesLoading } = useCandidateSignatures(id)

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

  useEffect(() => {
    if (candidateData?.fullDescription) {
      console.log("[v0] Candidate fullDescription:", candidateData.fullDescription?.substring(0, 200))
      setTranslatedDescription(candidateData.fullDescription)
    }
  }, [candidateData])

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
        chainId: 1,
      })

      setSponsorStatus("success")
      setTxHash(hash)
      alert("Successfully sponsored candidate!")
    } catch (error: any) {
      console.error("[v0] Sponsor error:", error)

      let errorMessage = "Unknown error"

      try {
        if (typeof error === "string") {
          errorMessage = error
        } else if (error?.message) {
          errorMessage = String(error.message)
        } else if (error?.toString && typeof error.toString === "function") {
          errorMessage = error.toString()
        } else {
          errorMessage = JSON.stringify(error)
        }
      } catch (stringifyError) {
        errorMessage = "Failed to process error message"
      }

      const errorString = String(errorMessage).toLowerCase()
      if (
        errorString.includes("user rejected") ||
        errorString.includes("user denied") ||
        errorString.includes("user cancelled") ||
        error.code === 4001
      ) {
        setSponsorStatus("idle")
        return
      }

      setSponsorStatus("error")
      alert(`Failed to sponsor candidate: ${errorMessage}`)
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">{t("loadingCandidate")}</div>
      </div>
    )
  }

  const { images, videos } = parseMarkdownMedia(candidateData.fullDescription)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 overflow-hidden">
        {/* Candidate Header */}
        <Card className="bg-card border-border p-6 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-foreground">
              {t("candidate")} #{candidateNumber}
            </CardTitle>
            <CardDescription className="text-muted-foreground">{candidateData.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="secondary">
                      {t("candidate")} #{candidateNumber}
                    </Badge>
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-2 break-words">{candidateData.description}</h1>
                  <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTimeAgo(candidateData.createdTimestamp)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Proposer Info */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border break-all flex-wrap">
                <span className="text-sm text-muted-foreground">{t("proposer")}:</span>
                <EnsDisplay address={candidateData.proposer} />
                <a
                  href={`https://etherscan.io/address/${candidateData.proposer}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Sponsors Section */}
              {candidateData.sponsors && candidateData.sponsors.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border break-all flex-wrap">
                  <span className="text-sm text-muted-foreground">
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
                          className="text-sm text-primary hover:underline flex items-center gap-1"
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
                <DialogContent className="bg-card border-border text-foreground">
                  <DialogHeader>
                    <DialogTitle>{t("sponsorCandidate")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="validity" className="text-foreground">
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
                          className="bg-muted border-border text-foreground"
                        />
                        <span className="text-muted-foreground">{t("days")}</span>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="reason" className="text-foreground">
                        {t("sponsorReason")}
                      </Label>
                      <Textarea
                        id="reason"
                        value={sponsorReason}
                        onChange={(e) => setSponsorReason(e.target.value)}
                        placeholder={t("explainWhy")}
                        className="bg-muted border-border text-foreground mt-2"
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

              {/* Sponsor History Section */}
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-4">Sponsor History</h3>

                  {signaturesLoading ? (
                    <div className="text-muted-foreground text-center py-8">Loading sponsors...</div>
                  ) : signatures.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">No sponsors yet</div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {signatures.map((sig, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-4 rounded-lg bg-muted border border-border"
                        >
                          <div className="flex-shrink-0">
                            <Users className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <EnsDisplay address={sig.signer as `0x${string}`} />
                              {sig.canceled && (
                                <Badge variant="secondary" className="bg-red-600/20 text-red-400">
                                  Canceled
                                </Badge>
                              )}
                            </div>
                            {sig.reason && (
                              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap break-words">
                                {sig.reason}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Expires: {new Date(sig.expirationTimestamp * 1000).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transaction */}
              {txHash && (
                <div className="flex items-center gap-2 text-sm break-all flex-wrap">
                  <span className="text-muted-foreground">{t("transaction")}:</span>
                  <a
                    href={`https://etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
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
          <Card className="bg-card border-border p-6 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-foreground">{t("media")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img || "/placeholder.svg"}
                    alt={`Candidate media ${idx + 1}`}
                    className="w-full max-w-full rounded-lg border border-border"
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
        <Card className="bg-card border-border p-6 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-foreground">{t("description")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`prose dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground`}
            >
              <ReactMarkdown>{translatedDescription || candidateData.fullDescription}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
