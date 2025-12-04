"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ThumbsUp, ThumbsDown, Minus, Users, ExternalLink, Clock } from "lucide-react"
import { useProposalData } from "@/hooks/useContractData"
import { parseProposalDescription, getProposalStateLabel } from "@/lib/markdown-parser"
import { useAccount } from "wagmi"
import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import { EnsDisplay } from "@/components/ens-display"
import { TransactionSimulator } from "@/components/transaction-simulator"
import { Card } from "@/components/ui/card"

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
  },
}

type LanguageCode = keyof typeof translations

export default function ProposalDetailPage({ params }: { params: { id: string } }) {
  const proposalId = params.id
  const [selectedSupport, setSelectedSupport] = useState<0 | 1 | 2 | null>(null)
  const [voteReason, setVoteReason] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en")
  const [translatedContent, setTranslatedContent] = useState("")

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

    console.log("[v0] Submitting vote:", {
      proposalId,
      support: selectedSupport,
      reason: voteReason,
      clientId: 22,
    })

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
      return
    }

    const translateContent = async () => {
      try {
        const response = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(content.slice(0, 500))}&langpair=en|${selectedLanguage}`,
        )
        const data = await response.json()
        if (data.responseStatus === 200 && data.responseData.translatedText) {
          setTranslatedContent(data.responseData.translatedText)
        }
      } catch (error) {
        console.error("Translation error:", error)
        setTranslatedContent(content)
      }
    }

    translateContent()
  }, [selectedLanguage, content])

  if (proposal.isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading proposal...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("back")}
            </Button>
            <img src="/images/logo.webp" alt="Nouncil Logo" className="w-8 h-8 object-contain" />
            <span className="text-gray-300 text-sm hidden sm:inline">Nouncil</span>
          </div>

          {/* Wallet Connection */}
          {/* {isConnected ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="hidden sm:inline">
                  <EnsDisplay address={address} />
                </span>
              </div>
              <Button
                onClick={() => disconnect()}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-gray-700"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowWalletDialog(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Connect Wallet
            </Button>
          )} */}
        </div>
      </header>

      {/* Wallet Dialog */}
      {/* {showWalletDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => {
                    connect({ connector })
                    setShowWalletDialog(false)
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-left border border-gray-600"
                >
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <span className="font-medium text-white">{connector.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWalletDialog(false)}
              className="w-full mt-4 p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )} */}

      <div className="max-w-4xl mx-auto px-4 py-8 overflow-hidden">
        {/* Proposal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Proposal {proposalId}
            </Badge>
            <Badge variant="outline" className={`text-${stateColor}-400 border-${stateColor}-400`}>
              {stateLabel}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 break-words">{title}</h1>
          <div className="flex flex-col gap-2 text-sm text-gray-400">
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
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                {proposal.state === 0 && proposal.startBlock
                  ? `${t("votingStarts")} ${proposal.startBlock}`
                  : proposal.endBlock
                    ? `${t("votingEnds")} ${proposal.endBlock}`
                    : null}
              </div>
            )}
          </div>
        </div>

        {/* Media */}
        {media.length > 0 && (
          <div className="mb-8 space-y-4">
            {media.map((item, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden bg-gray-800">
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

        {/* Voting Stats */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">{t("votingResults")}</h2>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-green-500" />
                  <span className="text-gray-300">{t("for")}</span>
                </div>
                <span className="font-medium text-white">
                  {Number(proposal.forVotes).toLocaleString()} ({forPercentage.toFixed(1)}%)
                </span>
              </div>
              <Progress value={forPercentage} className="h-3 bg-gray-700">
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
                  <span className="text-gray-300">{t("against")}</span>
                </div>
                <span className="font-medium text-white">
                  {Number(proposal.againstVotes).toLocaleString()} ({againstPercentage.toFixed(1)}%)
                </span>
              </div>
              <Progress value={againstPercentage} className="h-3 bg-gray-700">
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
                  <span className="text-gray-300">{t("abstain")}</span>
                </div>
                <span className="font-medium text-white">
                  {Number(proposal.abstainVotes).toLocaleString()} ({abstainPercentage.toFixed(1)}%)
                </span>
              </div>
              <Progress value={abstainPercentage} className="h-3 bg-gray-700">
                <div
                  className="h-full bg-yellow-600 rounded-full transition-all"
                  style={{ width: `${abstainPercentage}%` }}
                />
              </Progress>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">{t("quorumProgress")}</span>
                </div>
                <span className="font-medium text-white">
                  {totalVotes.toLocaleString()} / {Number(proposal.quorum).toLocaleString()} (
                  {quorumPercentage.toFixed(1)}%)
                </span>
              </div>
              <Progress value={Math.min(quorumPercentage, 100)} className="h-3 bg-gray-700">
                <div
                  className={`h-full rounded-full transition-all ${quorumPercentage >= 100 ? "bg-green-600" : "bg-blue-600"}`}
                  style={{ width: `${Math.min(quorumPercentage, 100)}%` }}
                />
              </Progress>
            </div>
          </div>

          {/* Voting Actions */}
          {!isConnected ? (
            <div className="text-sm text-center w-full py-3 mt-6 text-gray-400">{t("connectToVote")}</div>
          ) : proposal.state === 1 ? (
            <div className="mt-6 space-y-4">
              {selectedSupport === null ? (
                <>
                  <div className="text-sm text-gray-300 mb-2">{t("castYourVote")}</div>
                  <div className="flex gap-3">
                    <Button onClick={() => handleVote(1)} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      {t("for")}
                    </Button>
                    <Button onClick={() => handleVote(0)} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      {t("against")}
                    </Button>
                    <Button
                      onClick={() => handleVote(2)}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <Minus className="w-4 h-4 mr-2" />
                      {t("abstain")}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-300">
                      {t("voting")}:{" "}
                      <span className="font-semibold text-white">
                        {selectedSupport === 1 ? t("for") : selectedSupport === 0 ? t("against") : t("abstain")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSupport(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      {t("change")}
                    </Button>
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">{t("reasonForVote")}</label>
                    <Textarea
                      value={voteReason}
                      onChange={(e) => setVoteReason(e.target.value)}
                      placeholder={t("explainYourVote")}
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 min-h-[100px]"
                    />
                  </div>
                  {/* <Button
                    onClick={submitVote}
                    disabled={isPending || isConfirming}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isPending || isConfirming ? t("submittingVote") : t("submitVote")}
                  </Button> */}
                </>
              )}
            </div>
          ) : (
            <div className="text-sm text-center w-full py-3 mt-6 text-gray-400">{t("votingClosed")}</div>
          )}
        </div>

        {/* Description */}
        {translatedContent && (
          <Card className="bg-gray-800 border-gray-700 p-6 overflow-hidden">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">{t("description")}</h2>
            <div className="prose prose-invert prose-lg max-w-none break-words overflow-hidden">
              <ReactMarkdown
                skipHtml={true}
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-white mb-4 mt-8" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-white mb-3 mt-6" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-xl font-semibold text-white mb-2 mt-4" {...props} />,
                  h4: ({ node, ...props }) => (
                    <h4 className="text-lg font-semibold text-gray-200 mb-2 mt-3" {...props} />
                  ),
                  p: ({ node, ...props }) => <p className="text-gray-300 mb-4 leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2" {...props} />
                  ),
                  li: ({ node, ...props }) => <li className="text-gray-300" {...props} />,
                  a: ({ node, ...props }) => (
                    <a
                      className="text-blue-400 hover:text-blue-300 underline transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-400 my-4" {...props} />
                  ),
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code className="bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded text-sm" {...props} />
                    ) : (
                      <code
                        className="block bg-gray-700 text-gray-200 p-4 rounded-lg my-4 overflow-x-auto"
                        {...props}
                      />
                    ),
                  img: ({ node, ...props }) => <img className="rounded-lg my-4 max-w-full h-auto" {...props} />,
                }}
              >
                {translatedContent}
              </ReactMarkdown>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
