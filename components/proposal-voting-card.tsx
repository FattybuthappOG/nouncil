"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, ThumbsDown, Minus, Clock } from "lucide-react"
import { useAccount, useBlockNumber } from "wagmi"
import { useProposalData } from "@/hooks/useContractData"
import { parseProposalDescription, getProposalStateLabel } from "@/lib/markdown-parser"
import { useState } from "react"

interface ProposalVotingCardProps {
  proposalId: number
  isDarkMode: boolean
  proposalData?: any
}

export function ProposalVotingCard({ proposalId, isDarkMode, proposalData }: ProposalVotingCardProps) {
  const [hasVoted, setHasVoted] = useState(false)
  const [userVote, setUserVote] = useState<number | null>(null)
  const { isConnected } = useAccount()
  const proposal = useProposalData(proposalId)

  const { data: currentBlockData } = useBlockNumber({ watch: true })
  const currentBlock = Number(currentBlockData || 0)

  const { title, media } = parseProposalDescription(proposal.description || `Proposal ${proposalId}`)

  const votingEnded = currentBlock > Number(proposal.endBlock)
  const votingStarted = currentBlock >= Number(proposal.startBlock)
  const blocksRemaining = votingEnded ? 0 : Number(proposal.endBlock) - currentBlock
  const hoursRemaining = Math.floor((blocksRemaining * 12) / 3600)
  const daysRemaining = Math.floor(hoursRemaining / 24)

  // Calculate time since voting ended
  const blocksEnded = currentBlock - Number(proposal.endBlock)
  const hoursEnded = Math.floor((blocksEnded * 12) / 3600)
  const daysEnded = Math.floor(hoursEnded / 24)

  const { label: stateLabel, color: stateColor } = getProposalStateLabel(proposal.state)

  const handleVote = (support: number) => {
    if (!isConnected) return
    setHasVoted(true)
    setUserVote(support)
    console.log(`Voting ${support} on proposal ${proposalId}`)
  }

  const forNouns = Number(proposal.forVotes)
  const againstNouns = Number(proposal.againstVotes)
  const abstainNouns = Number(proposal.abstainVotes)
  const quorumNeeded = Number(proposal.quorum)
  const totalVotes = forNouns + againstNouns + abstainNouns
  const quorumMet = totalVotes >= quorumNeeded

  return (
    <Card
      onClick={() => (window.location.href = `/proposal/${proposalId}`)}
      className={`transition-colors duration-200 cursor-pointer hover:shadow-lg ${isDarkMode ? "bg-gray-800 border-gray-700 hover:border-gray-600" : "bg-white border-gray-200 hover:border-gray-300"}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                #{proposalId}
              </Badge>
              <Badge variant="outline" className={`text-${stateColor}-600 border-${stateColor}-600`}>
                {stateLabel}
              </Badge>
            </div>
            <CardTitle className={`text-lg mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>{title}</CardTitle>

            {currentBlock > 0 && (
              <div className={`flex items-center gap-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                <Clock className="w-4 h-4" />
                {!votingStarted && (
                  <span>
                    Voting starts in {Math.floor(((Number(proposal.startBlock) - currentBlock) * 12) / 3600)} hours
                  </span>
                )}
                {votingStarted && !votingEnded && daysRemaining > 0 && (
                  <span>
                    {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                  </span>
                )}
                {votingStarted && !votingEnded && daysRemaining === 0 && (
                  <span>
                    {hoursRemaining} hour{hoursRemaining !== 1 ? "s" : ""} remaining
                  </span>
                )}
                {votingEnded && daysEnded > 0 && (
                  <span>
                    Ended {daysEnded} day{daysEnded !== 1 ? "s" : ""} ago
                  </span>
                )}
                {votingEnded && daysEnded === 0 && hoursEnded > 0 && (
                  <span>
                    Ended {hoursEnded} hour{hoursEnded !== 1 ? "s" : ""} ago
                  </span>
                )}
                {votingEnded && hoursEnded === 0 && <span>Ended recently</span>}
              </div>
            )}
          </div>
        </div>

        {media.length > 0 && (
          <div className="mt-3 space-y-2">
            {media.slice(0, 2).map((item, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden">
                {item.type === "image" || item.type === "gif" ? (
                  <img src={item.url || "/placeholder.svg"} alt="" className="w-full h-auto max-h-64 object-cover" />
                ) : (
                  <video src={item.url} controls className="w-full h-auto max-h-64" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-around py-3 px-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4 text-green-600" />
              <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>For</span>
            </div>
            <span className={`text-lg font-bold ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>{forNouns}</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <ThumbsDown className="w-4 h-4 text-red-600" />
              <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Against</span>
            </div>
            <span className={`text-lg font-bold ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {againstNouns}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <Minus className="w-4 h-4 text-yellow-600" />
              <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Abstain</span>
            </div>
            <span className={`text-lg font-bold ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {abstainNouns}
            </span>
          </div>
        </div>

        <div className={`text-center text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          Quorum: {quorumNeeded} Nouns needed {quorumMet ? "✓" : ""}
        </div>

        {/* Voting Buttons */}
        <div className="flex gap-2 pt-2">
          {!isConnected ? (
            <div className={`text-sm text-center w-full py-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Connect wallet to vote
            </div>
          ) : hasVoted ? (
            <div className="flex items-center gap-2 w-full justify-center py-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Voted {userVote === 1 ? "For" : userVote === 0 ? "Against" : "Abstain"}
              </Badge>
            </div>
          ) : proposal.state === 1 ? (
            <>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleVote(1)
                }}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                For
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleVote(0)
                }}
                size="sm"
                variant="destructive"
                className="flex-1"
              >
                <ThumbsDown className="w-4 h-4 mr-1" />
                Against
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleVote(2)
                }}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <Minus className="w-4 h-4 mr-1" />
                Abstain
              </Button>
            </>
          ) : (
            <div className={`text-sm text-center w-full py-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Voting is closed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
