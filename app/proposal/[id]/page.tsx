"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ThumbsUp, ThumbsDown, Minus, Users, ExternalLink, Clock } from "lucide-react"
import { useProposalData, useProposalVotes } from "@/hooks/useContractData"
import { parseProposalDescription, getProposalStateLabel } from "@/lib/markdown-parser"
import { useAccount } from "wagmi"
import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import { EnsDisplay } from "@/components/ens-display"
import { TransactionSimulator } from "@/components/transaction-simulator"
import { Card, CardContent } from "@/components/ui/card"

const translations = {
  en: {
    back: "Back",
    proposer: "Proposer",
    sponsors: "Sponsors",
    viewOnEtherscan: "View on Etherscan",
    votingResults: "Voting Results",
    for: "For",
    against: "Against",
    abstain: "Abstain",
    quorumProgress: "Quorum Progress",
    castYourVote: "Cast your vote:",
    voting: "Voting",
    change: "Change",
    reasonForVote: "Reason for vote (optional but encouraged):",
    explainYourVote: "Explain your vote reasoning...",
    submitVote: "Submit Vote",
    submittingVote: "Submitting Vote...",
    votingClosed: "Voting is closed",
    votingStarts: "Voting starts in",
    votingEnds: "Voting ends in",
    days: "days",
    hours: "hours",
    minutes: "minutes",
    description: "Description",
    transactionSimulator: "Transaction Simulator",
    connectToVote: "Connect wallet to vote",
    votingHistory: "Voting History",
    loadingVotes: "Loading votes...",
    noVotesYet: "No votes yet",
  },
  zh: {
    back: "返回",
    proposer: "提议者",
    sponsors: "赞助者",
    viewOnEtherscan: "在 Etherscan 上查看",
    votingResults: "投票结果",
    for: "赞成",
    against: "反对",
    abstain: "弃权",
    quorumProgress: "法定人数进度",
    castYourVote: "投出您的票：",
    voting: "投票中",
    change: "更改",
    reasonForVote: "投票理由（可选但建议填写）：",
    explainYourVote: "解释您的投票理由...",
    submitVote: "提交投票",
    submittingVote: "正在提交投票...",
    votingClosed: "投票已关闭",
    votingStarts: "投票开始于",
    votingEnds: "投票结束于",
    days: "天",
    hours: "小时",
    minutes: "分钟",
    description: "描述",
    transactionSimulator: "交易模拟器",
    connectToVote: "连接钱包以投票",
    votingHistory: "投票历史",
    loadingVotes: "加载投票...",
    noVotesYet: "暂无投票",
  },
  es: {
    back: "Volver",
    proposer: "Proponente",
    sponsors: "Patrocinadores",
    viewOnEtherscan: "Ver en Etherscan",
    votingResults: "Resultados de Votación",
    for: "A favor",
    against: "En contra",
    abstain: "Abstención",
    quorumProgress: "Progreso del Quórum",
    castYourVote: "Emite tu voto:",
    voting: "Votando",
    change: "Cambiar",
    reasonForVote: "Razón del voto (opcional pero recomendado):",
    explainYourVote: "Explica tu razonamiento de voto...",
    submitVote: "Enviar Voto",
    submittingVote: "Enviando Voto...",
    votingClosed: "La votación está cerrada",
    votingStarts: "La votación comienza en",
    votingEnds: "La votación termina en",
    days: "días",
    hours: "horas",
    minutes: "minutos",
    description: "Descripción",
    transactionSimulator: "Simulador de Transacciones",
    connectToVote: "Conecta tu billetera para votar",
    votingHistory: "Historial de Votación",
    loadingVotes: "Cargando votos...",
    noVotesYet: "No hay votos aún",
  },
}

type LanguageCode = keyof typeof translations

export default function ProposalDetailPage({ params }: { params: { id: string } }) {
  const proposalId = params.id
  const [selectedSupport, setSelectedSupport] = useState<0 | 1 | 2 | null>(null)
  const [voteReason, setVoteReason] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en")
  const [translatedContent, setTranslatedContent] = useState("")
  const [translatedDescription, setTranslatedDescription] = useState("")

  const { address, isConnected } = useAccount()
  const router = useRouter()

  useEffect(() => {
    const savedLanguage = localStorage.getItem("nouns-language") as LanguageCode
    if (savedLanguage && translations[savedLanguage]) {
      setSelectedLanguage(savedLanguage)
    }
  }, [])

  const t = (key: string) => {
    return translations[selectedLanguage]?.[key] || translations.en[key] || key
  }

  const proposal = useProposalData(proposalId)
  const { votes, isLoading: votesLoading } = useProposalVotes(Number(proposalId))
  const { title, content, media } = parseProposalDescription(
    proposal.fullDescription || proposal.description || `Proposal ${proposalId}`,
  )
  const { label: stateLabel, color: stateColor } = getProposalStateLabel(proposal.state)

  const totalVotes = Number(proposal.forVotes) + Number(proposal.againstVotes) + Number(proposal.abstainVotes)
  const forPercentage = totalVotes > 0 ? (Number(proposal.forVotes) / totalVotes) * 100 : 0
  const againstPercentage = totalVotes > 0 ? (Number(proposal.againstVotes) / totalVotes) * 100 : 0
  const abstainPercentage = totalVotes > 0 ? (Number(proposal.abstainVotes) / totalVotes) * 100 : 0
  const quorumPercentage = Number(proposal.quorum) > 0 ? (totalVotes / Number(proposal.quorum)) * 100 : 0

  const handleVote = async (support: number) => {
    if (!isConnected) {
      // setShowWalletDialog(true)
      return
    }
    setSelectedSupport(support as 0 | 1 | 2)
  }

  const submitVote = () => {
    if (selectedSupport === null || !isConnected) return

    // writeContract({
    //   address: GOVERNOR_CONTRACT.address,
    //   abi: GOVERNOR_CONTRACT.abi,
    //   functionName: "castRefundableVoteWithReason",
    //   args: [BigInt(proposalId), selectedSupport as 0 | 1 | 2, voteReason, 22],
    // })
  }

  useEffect(() => {
    if (selectedLanguage === "en") {
      setTranslatedContent(content)
      setTranslatedDescription(proposal.fullDescription || "")
      return
    }

    // Check cache first
    const cacheKey = `proposal-${proposalId}-${selectedLanguage}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      setTranslatedContent(cached)
      return
    }

    // Debounce translation API call
    const timer = setTimeout(async () => {
      try {
        const textToTranslate = content.slice(0, 300)
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|${selectedLanguage}`,
        )
        const data = await response.json()
        if (data.responseStatus === 200 && data.responseData.translatedText) {
          const translated = data.responseData.translatedText
          setTranslatedContent(translated)
          sessionStorage.setItem(cacheKey, translated)
        } else {
          setTranslatedContent(content)
        }

        const descriptionResponse = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(proposal.fullDescription || "")}&langpair=en|${selectedLanguage}`,
        )
        const descriptionData = await descriptionResponse.json()
        if (descriptionData.responseStatus === 200 && descriptionData.responseData.translatedText) {
          setTranslatedDescription(descriptionData.responseData.translatedText)
        } else {
          setTranslatedDescription(proposal.fullDescription || "")
        }
      } catch (error) {
        setTranslatedDescription(proposal.fullDescription || "")
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [selectedLanguage, content, proposalId, proposal.fullDescription])

  if (proposal.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading proposal...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <header className="bg-card border-border px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="text-muted-foreground hover:text-foreground hover:bg-border"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("back")}
            </Button>
            <img src="/images/logo.webp" alt="Nouncil Logo" className="w-8 h-8 object-contain" />
            <span className="text-muted-foreground text-sm hidden sm:inline">Nouncil</span>
          </div>

          {/* Wallet Connection */}
          {/* {isConnected ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="hidden sm:inline">
                  <EnsDisplay address={address} />
                </span>
              </div>
              <Button
                onClick={() => disconnect()}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-border"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowWalletDialog(true)}
              size="sm"
              className="bg-primary hover:bg-primary/80 text-background"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </path>
            </svg>
              Connect Wallet
            </Button>
          )} */}
        </div>
      </header>

      {/* Wallet Dialog */}
      {/* {showWalletDialog && (
        <div className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 max-w-md w-full border border-border shadow-2xl">
            <h2 className="text-xl font-bold text-foreground mb-4">Connect Your Wallet</h2>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => {
                    connect({ connector })
                    setShowWalletDialog(false)
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-lg bg-border hover:bg-border/80 transition-colors text-left border border-border"
                >
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </path>
                </svg>
                  <span className="font-medium text-foreground">{connector.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWalletDialog(false)}
              className="w-full mt-4 p-3 rounded-lg bg-border hover:bg-border/80 text-muted-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )} */}

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back")}
        </Button>

        {/* Description */}
        {translatedDescription && (
          <Card className="bg-card border-border p-6 overflow-hidden">
            <h2 className="text-xl font-semibold text-foreground mb-4">{t("description")}</h2>
            <div className="prose dark:prose-invert prose-neutral prose-lg max-w-none break-words overflow-hidden">
              <ReactMarkdown
                skipHtml={true}
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold text-foreground mb-4 mt-8" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold text-foreground mb-3 mt-6" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-semibold text-foreground mb-2 mt-4" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-lg font-semibold text-foreground mb-2 mt-3" {...props} />
                  ),
                  p: ({ node, ...props }) => <p className="text-muted-foreground mb-4 leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside text-muted-foreground mb-4 space-y-2" {...props} />
                  ),
                  li: ({ node, ...props }) => <li className="text-muted-foreground" {...props} />,
                  a: ({ node, ...props }) => (
                    <a
                      className="text-primary hover:underline transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      className="border-l-4 border-border pl-4 italic text-muted-foreground my-4"
                      {...props}
                    />
                  ),
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code className="bg-border text-foreground px-1.5 py-0.5 rounded text-sm" {...props} />
                    ) : (
                      <code
                        className="block bg-border text-foreground p-4 rounded-lg my-4 overflow-x-auto"
                        {...props}
                      />
                    ),
                  img: ({ node, ...props }) => <img className="rounded-lg my-4 max-w-full h-auto" {...props} />,
                }}
              >
                {translatedDescription}
              </ReactMarkdown>
            </div>
          </Card>
        )}

        {/* Media */}
        {media.length > 0 && (
          <div className="space-y-4">
            {media.map((item, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden bg-card">
                {item.type === "image" && (
                  <img
                    src={item.url || "/placeholder.svg"}
                    alt={`Proposal media ${idx + 1}`}
                    className="w-full h-auto object-cover"
                  />
                )}
                {item.type === "gif" && (
                  <img
                    src={item.url || "/placeholder.svg"}
                    alt={`Proposal GIF ${idx + 1}`}
                    className="w-full h-auto object-cover"
                  />
                )}
                {item.type === "video" && (
                  <video src={item.url} controls className="w-full h-auto" preload="metadata">
                    Your browser does not support the video tag.
                  </video>
                )}
                {item.type === "youtube" && item.embedUrl && (
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      src={item.embedUrl}
                      className="absolute top-0 left-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`YouTube video ${idx + 1}`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Transaction Simulator */}
        <TransactionSimulator proposalId={proposalId} />

        {/* Header Card */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <Badge variant="outline" className={`text-${stateColor}-400 border-${stateColor}-400`}>
                {stateLabel}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4 break-words">{title}</h1>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {proposal.proposer && proposal.proposer !== "0x0000000000000000000000000000000000000000" && (
                <div className="flex items-center gap-4 flex-wrap break-all">
                  <span>
                    {t("proposer")}: <EnsDisplay address={proposal.proposer} className="inline" />
                  </span>
                  <a
                    href={`https://etherscan.io/address/${proposal.proposer}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-70 transition-opacity"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {proposal.sponsors && proposal.sponsors.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap break-all">
                  <span>
                    {t("sponsors")} ({proposal.sponsors.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {proposal.sponsors.map((sponsor, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <EnsDisplay address={sponsor} />
                        <a
                          href={`https://etherscan.io/address/${sponsor}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-70 transition-opacity"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Voting Timing */}
              {(proposal.startBlock || proposal.endBlock) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {proposal.state === 0 && proposal.startBlock
                    ? `${t("votingStarts")} ${proposal.startBlock}`
                    : proposal.endBlock
                      ? `${t("votingEnds")} ${proposal.endBlock}`
                      : null}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Voting History Section */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">{t("votingHistory")}</h2>

            {votesLoading ? (
              <div className="text-muted-foreground text-center py-8">{t("loadingVotes")}</div>
            ) : votes.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">{t("noVotesYet")}</div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {votes.map((vote, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-muted border border-border">
                    <div className="flex-shrink-0">
                      {vote.support === 1 ? (
                        <ThumbsUp className="w-5 h-5 text-green-500" />
                      ) : vote.support === 0 ? (
                        <ThumbsDown className="w-5 h-5 text-red-500" />
                      ) : (
                        <Minus className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <EnsDisplay address={vote.voter as `0x${string}`} />
                        <Badge
                          variant="secondary"
                          className={
                            vote.support === 1
                              ? "bg-green-600/20 text-green-400"
                              : vote.support === 0
                                ? "bg-red-600/20 text-red-400"
                                : "bg-yellow-600/20 text-yellow-400"
                          }
                        >
                          {vote.supportLabel}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {Number(vote.votes).toLocaleString()} votes
                        </span>
                      </div>
                      {vote.reason && (
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap break-words">
                          {vote.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voting Stats */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">{t("votingResults")}</h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-green-500" />
                    <span className="text-muted-foreground">{t("for")}</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {Number(proposal.forVotes).toLocaleString()} ({forPercentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={forPercentage} className="h-3 bg-border">
                  <div
                    className="h-full bg-green-600 rounded-full transition-all"
                    style={{ width: `${forPercentage}%` }}
                  />
                </Progress>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4 text-red-500" />
                    <span className="text-muted-foreground">{t("against")}</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {Number(proposal.againstVotes).toLocaleString()} ({againstPercentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={againstPercentage} className="h-3 bg-border">
                  <div
                    className="h-full bg-red-600 rounded-full transition-all"
                    style={{ width: `${againstPercentage}%` }}
                  />
                </Progress>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <Minus className="w-4 h-4 text-yellow-500" />
                    <span className="text-muted-foreground">{t("abstain")}</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {Number(proposal.abstainVotes).toLocaleString()} ({abstainPercentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={abstainPercentage} className="h-3 bg-border">
                  <div
                    className="h-full bg-yellow-600 rounded-full transition-all"
                    style={{ width: `${abstainPercentage}%` }}
                  />
                </Progress>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-muted-foreground">{t("quorumProgress")}</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {totalVotes.toLocaleString()} / {Number(proposal.quorum).toLocaleString()} (
                    {quorumPercentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={Math.min(quorumPercentage, 100)} className="h-3 bg-border">
                  <div
                    className={`h-full rounded-full transition-all ${quorumPercentage >= 100 ? "bg-green-600" : "bg-blue-600"}`}
                    style={{ width: `${Math.min(quorumPercentage, 100)}%` }}
                  />
                </Progress>
              </div>
            </div>

            {/* Voting Actions */}
            {!isConnected ? (
              <div className="text-sm text-center w-full py-3 mt-6 text-muted-foreground">{t("connectToVote")}</div>
            ) : proposal.state === 1 ? (
              <div className="mt-6 space-y-4">
                {selectedSupport === null ? (
                  <>
                    <div className="text-sm text-muted-foreground mb-2">{t("castYourVote")}</div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleVote(1)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-background"
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        {t("for")}
                      </Button>
                      <Button
                        onClick={() => handleVote(0)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-background"
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        {t("against")}
                      </Button>
                      <Button
                        onClick={() => handleVote(2)}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-background"
                      >
                        <Minus className="w-4 h-4 mr-2" />
                        {t("abstain")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {t("voting")}:{" "}
                        <span className="font-semibold text-foreground">
                          {selectedSupport === 1 ? t("for") : selectedSupport === 0 ? t("against") : t("abstain")}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSupport(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {t("change")}
                      </Button>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">{t("reasonForVote")}</label>
                      <Textarea
                        value={voteReason}
                        onChange={(e) => setVoteReason(e.target.value)}
                        placeholder={t("explainYourVote")}
                        className="bg-border border-border text-background placeholder:text-muted-foreground min-h-[100px]"
                      />
                    </div>
                    {/* <Button
                      onClick={submitVote}
                      disabled={isPending || isConfirming}
                      className="w-full bg-primary hover:bg-primary/80 text-background"
                    >
                      {isPending || isConfirming ? t("submittingVote") : t("submitVote")}
                    </Button> */}
                  </>
                )}
              </div>
            ) : (
              <div className="text-sm text-center w-full py-3 mt-6 text-muted-foreground">{t("votingClosed")}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
