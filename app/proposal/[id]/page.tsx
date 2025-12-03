"use client"

import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ThumbsUp, ThumbsDown, Minus, Users, ExternalLink } from "lucide-react"
import { useProposalData } from "@/hooks/useContractData"
import { parseProposalDescription, getProposalStateLabel } from "@/lib/markdown-parser"
import { useAccount } from "wagmi"
import { useState } from "react"

export default function ProposalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const proposalId = Number.parseInt(params.id as string)
  const { isConnected } = useAccount()
  const [hasVoted, setHasVoted] = useState(false)
  const [userVote, setUserVote] = useState<number | null>(null)

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

  const handleVote = (support: number) => {
    if (!isConnected) return
    setHasVoted(true)
    setUserVote(support)
    console.log(`Voting ${support} on proposal ${proposalId}`)
  }

  if (proposal.isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading proposal...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <img src="/images/logo.webp" alt="Nouncil Logo" className="w-8 h-8 object-contain" />
          <span className="text-gray-300 text-sm">Nouncil</span>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Proposal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Proposal {proposalId}
            </Badge>
            <Badge variant="outline" className={`text-${stateColor}-600 border-${stateColor}-600`}>
              {stateLabel}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
          <div className="flex flex-col gap-2 text-sm text-gray-400">
            {proposal.proposer && proposal.proposer !== "0x0000000000000000000000000000000000000000" && (
              <div className="flex items-center gap-4">
                <span>
                  Proposer: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
                </span>
                <a
                  href={`https://etherscan.io/address/${proposal.proposer}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                >
                  View on Etherscan <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {proposal.transactionHash && (
              <div className="flex items-center gap-4">
                <span>
                  Transaction: {proposal.transactionHash.slice(0, 10)}...{proposal.transactionHash.slice(-8)}
                </span>
                <a
                  href={`https://etherscan.io/tx/${proposal.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                >
                  View Transaction <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Media */}
        {media.length > 0 && (
          <div className="mb-8 space-y-4">
            {media.map((item, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden bg-gray-800">
                {item.type === "image" || item.type === "gif" ? (
                  <img src={item.url || "/placeholder.svg"} alt="Proposal media" className="w-full h-auto" />
                ) : (
                  <video src={item.url} controls className="w-full h-auto" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Voting Stats */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Voting Results</h2>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                  <span className="text-gray-300">For</span>
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
                  <ThumbsDown className="w-4 h-4 text-red-600" />
                  <span className="text-gray-300">Against</span>
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
                  <Minus className="w-4 h-4 text-yellow-600" />
                  <span className="text-gray-300">Abstain</span>
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
                  <span className="text-gray-300">Quorum Progress</span>
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

          {/* Voting Buttons */}
          <div className="flex gap-3 mt-6">
            {!isConnected ? (
              <div className="text-sm text-center w-full py-3 text-gray-400">Connect wallet to vote</div>
            ) : hasVoted ? (
              <div className="flex items-center gap-2 w-full justify-center py-3">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Voted {userVote === 1 ? "For" : userVote === 0 ? "Against" : "Abstain"}
                </Badge>
              </div>
            ) : proposal.state === 1 ? (
              <>
                <Button onClick={() => handleVote(1)} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Vote For
                </Button>
                <Button onClick={() => handleVote(0)} variant="destructive" className="flex-1">
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Vote Against
                </Button>
                <Button
                  onClick={() => handleVote(2)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Abstain
                </Button>
              </>
            ) : (
              <div className="text-sm text-center w-full py-3 text-gray-400">Voting is closed</div>
            )}
          </div>
        </div>

        {/* Description */}
        {content && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Description</h2>
            <div className="prose prose-invert max-w-none">
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">{content}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
