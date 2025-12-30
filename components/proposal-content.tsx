"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ThumbsUp, ThumbsDown, Minus, ExternalLink } from "lucide-react"
import { useProposalData, useProposalVotes, useProposalFeedback } from "@/hooks/useContractData"
import { parseProposalDescription, getProposalStateLabel } from "@/lib/markdown-parser"
import { EnsDisplay } from "@/components/ens-display"
import { TransactionSimulator } from "@/components/transaction-simulator"
import { Card, CardContent } from "@/components/ui/card"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type LanguageCode = "en" | "zh"

const translations: Record<LanguageCode, Record<string, string>> = {
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
    activity: "Activity",
    loadingVotes: "Loading votes...",
    noVotesYet: "No votes yet",
    showAllVotes: "Show All",
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
    activity: "活动",
    loadingVotes: "加载投票...",
    noVotesYet: "暂无投票",
    showAllVotes: "显示全部",
  },
}

function MarkdownContent({ content, isDarkMode }: { content: string; isDarkMode: boolean }) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const handleImageError = (url: string) => {
    setFailedImages((prev) => new Set(prev).add(url))
  }

  return (
    <div
      className={`prose max-w-none ${isDarkMode ? "prose-invert" : ""} prose-headings:font-bold prose-a:text-blue-400 prose-img:rounded-lg prose-img:border prose-img:border-border`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: () => null,
          img: ({ src, alt }) => {
            if (!src || failedImages.has(src)) return null
            return (
              <img
                src={src || "/placeholder.svg"}
                alt={alt || "Image"}
                className="rounded-lg max-w-full h-auto border border-border my-4"
                loading="lazy"
                onError={() => handleImageError(src)}
              />
            )
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline break-all"
            >
              {children}
            </a>
          ),
          p: ({ children, node }) => {
            // Check if paragraph only contains an image
            const hasOnlyImage =
              node?.children?.length === 1 &&
              node.children[0].type === "element" &&
              (node.children[0] as any).tagName === "img"
            if (hasOnlyImage) {
              return <>{children}</>
            }
            return <p className="mb-4 break-words">{children}</p>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function ProposalContentInner({
  params,
  isDarkMode,
  setIsDarkMode,
}: {
  params: { id: string }
  isDarkMode: boolean
  setIsDarkMode: (value: boolean) => void
}) {
  const router = useRouter()
  const proposalId = params.id
  const [language] = useState<LanguageCode>("en")
  const [showAllVotes, setShowAllVotes] = useState(false)
  const t = translations[language]

  const proposal = useProposalData(Number(proposalId))
  const votes = useProposalVotes(Number(proposalId))
  const feedback = useProposalFeedback(Number(proposalId))

  if (proposal.isLoading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-6`}>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className={`h-8 ${isDarkMode ? "bg-[#252540]" : "bg-muted"} rounded w-3/4`} />
            <div className={`h-4 ${isDarkMode ? "bg-[#252540]" : "bg-muted"} rounded w-1/2`} />
            <div className={`h-64 ${isDarkMode ? "bg-[#252540]" : "bg-muted"} rounded`} />
          </div>
        </div>
      </div>
    )
  }

  if (proposal.error || !proposal.id) {
    return (
      <div className={`min-h-screen ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-6`}>
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" className="mb-6 gap-2" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Button>
          <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
            <CardContent className="pt-6">
              <p className="text-destructive">Error loading proposal data. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { title, body } = parseProposalDescription(proposal.fullDescription || proposal.description || "")
  const stateLabel = proposal.stateName || getProposalStateLabel(proposal.state?.toString() || "1")

  const forVotes = Number(proposal.forVotes || 0)
  const againstVotes = Number(proposal.againstVotes || 0)
  const abstainVotes = Number(proposal.abstainVotes || 0)
  const totalVotes = forVotes + againstVotes + abstainVotes

  const dynamicQuorum = Number(proposal.quorum || 0)
  const quorumMet = forVotes >= dynamicQuorum
  const quorumPercentage = dynamicQuorum > 0 ? Math.min((forVotes / dynamicQuorum) * 100, 100) : 0

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="sticky top-0 z-50 bg-[#1a1a2e]/95 backdrop-blur-sm border-b border-[#3a3a5a]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-gray-300 hover:text-white"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className={
                  stateLabel === "Active"
                    ? "bg-green-500/20 text-green-300"
                    : stateLabel === "Pending"
                      ? "bg-yellow-500/20 text-yellow-300"
                      : "bg-gray-500/20 text-gray-300"
                }
              >
                {stateLabel}
              </Badge>
              <Badge variant="outline" className={isDarkMode ? "border-[#3a3a5a] text-gray-300" : ""}>
                #{proposalId}
              </Badge>
            </div>

            <h1 className="text-2xl font-bold break-words">{title || proposal.description}</h1>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t.proposer}:</span>
              <EnsDisplay address={proposal.proposer || ""} showAvatar avatarSize={20} />
              <a
                href={`https://etherscan.io/address/${proposal.proposer}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold">{t.votingResults}</h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-400" />
                  <span>{t.for}</span>
                </div>
                <span className="font-mono">{forVotes}</span>
              </div>
              <Progress value={totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0} className="h-2 bg-[#3a3a5a]" />

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4 text-red-400" />
                  <span>{t.against}</span>
                </div>
                <span className="font-mono">{againstVotes}</span>
              </div>
              <Progress value={totalVotes > 0 ? (againstVotes / totalVotes) * 100 : 0} className="h-2 bg-[#3a3a5a]" />

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-gray-400" />
                  <span>{t.abstain}</span>
                </div>
                <span className="font-mono">{abstainVotes}</span>
              </div>
              <Progress value={totalVotes > 0 ? (abstainVotes / totalVotes) * 100 : 0} className="h-2 bg-[#3a3a5a]" />
            </div>

            <div className="pt-4 border-t border-[#3a3a5a]">
              <div className="flex justify-between items-center mb-2">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">{t.quorumProgress}</span>
                  <span className="text-xs text-muted-foreground">
                    FOR votes needed: {dynamicQuorum} (dynamic based on Against votes)
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-mono">
                    {forVotes} / {dynamicQuorum}
                  </span>
                  {quorumMet && <Badge className="bg-green-500/20 text-green-300 text-xs mt-1">Quorum Met</Badge>}
                </div>
              </div>
              <Progress value={quorumPercentage} className={`h-2 ${quorumMet ? "bg-green-500/30" : "bg-[#3a3a5a]"}`} />
              {againstVotes > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Quorum threshold increased by {againstVotes} Against votes
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">{t.description}</h2>
            <MarkdownContent content={body || proposal.fullDescription || ""} isDarkMode={isDarkMode} />
          </CardContent>
        </Card>

        {proposal.targets && proposal.targets.length > 0 && (
          <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">{t.transactionSimulator}</h2>
              <TransactionSimulator proposalId={Number(proposalId)} />
            </CardContent>
          </Card>
        )}

        <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t.activity}</h2>
              {votes.votes && votes.votes.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {votes.votes.length} vote{votes.votes.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {votes.isLoading ? (
              <p className="text-muted-foreground">{t.loadingVotes}</p>
            ) : votes.votes && votes.votes.length > 0 ? (
              <div className="space-y-3">
                {(showAllVotes ? votes.votes : votes.votes.slice(0, 10)).map(
                  (
                    vote: { voter: string; support: number; supportLabel: string; votes: string; reason?: string },
                    index: number,
                  ) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a2e]">
                      <div className="flex items-center gap-2">
                        {vote.support === 1 ? (
                          <ThumbsUp className="h-4 w-4 text-green-400" />
                        ) : vote.support === 0 ? (
                          <ThumbsDown className="h-4 w-4 text-red-400" />
                        ) : (
                          <Minus className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <EnsDisplay
                            address={vote.voter}
                            showAvatar
                            avatarSize={20}
                            className="font-medium truncate"
                          />
                          <span className="font-mono text-sm text-muted-foreground whitespace-nowrap">
                            {vote.votes} votes
                          </span>
                        </div>
                        {vote.reason && <p className="text-sm text-muted-foreground mt-1 break-words">{vote.reason}</p>}
                      </div>
                    </div>
                  ),
                )}
                {votes.votes.length > 10 && (
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-white"
                    onClick={() => setShowAllVotes(!showAllVotes)}
                  >
                    {showAllVotes ? "Show Less" : `Show All ${votes.votes.length} Votes`}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">{t.noVotesYet}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ProposalContent({
  params,
  isDarkMode,
  setIsDarkMode,
}: {
  params: { id: string }
  isDarkMode: boolean
  setIsDarkMode: (value: boolean) => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`min-h-screen ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-6`}>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className={`h-8 ${isDarkMode ? "bg-[#252540]" : "bg-muted"} rounded w-3/4`} />
            <div className={`h-4 ${isDarkMode ? "bg-[#252540]" : "bg-muted"} rounded w-1/2`} />
            <div className={`h-64 ${isDarkMode ? "bg-[#252540]" : "bg-muted"} rounded`} />
          </div>
        </div>
      </div>
    )
  }

  return <ProposalContentInner params={params} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
}
