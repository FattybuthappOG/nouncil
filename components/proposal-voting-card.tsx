"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ThumbsUp, ThumbsDown, Minus, Users } from "lucide-react"
import { useAccount } from "wagmi"
import { useProposalData } from "@/hooks/useContractData"
import { parseProposalDescription, getProposalStateLabel } from "@/lib/markdown-parser"
import { useState } from "react"

interface ProposalVotingCardProps {
  proposalId: number
  isDarkMode: boolean
  proposalData?: any // Made useProposalData hook call optional to support prop-based data
}

export function ProposalVotingCard({ proposalId, isDarkMode, proposalData }: ProposalVotingCardProps) {
  const [hasVoted, setHasVoted] = useState(false)
  const [userVote, setUserVote] = useState<number | null>(null)
  const { isConnected } = useAccount()
  const proposal = useProposalData(proposalId)

  const { title, media } = parseProposalDescription(proposal.description || `Proposal ${proposalId}`)

  const totalVotes = Number(proposal.forVotes) + Number(proposal.againstVotes) + Number(proposal.abstainVotes)
  const forPercentage = totalVotes > 0 ? (Number(proposal.forVotes) / totalVotes) * 100 : 0
  const againstPercentage = totalVotes > 0 ? (Number(proposal.againstVotes) / totalVotes) * 100 : 0
  const abstainPercentage = totalVotes > 0 ? (Number(proposal.abstainVotes) / totalVotes) * 100 : 0
  const quorumPercentage = Number(proposal.quorum) > 0 ? (totalVotes / Number(proposal.quorum)) * 100 : 0

  const { label: stateLabel, color: stateColor } = getProposalStateLabel(proposal.state)

  const handleVote = (support: number) => {
    if (!isConnected) return
    setHasVoted(true)
    setUserVote(support)
    console.log(`Voting ${support} on proposal ${proposalId}`)
  }

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
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-green-600" />
              <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                For ({Number(proposal.forVotes).toLocaleString()})
              </span>
            </div>
            <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {forPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={forPercentage} className="h-2 bg-gray-200">
            <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${forPercentage}%` }} />
          </Progress>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-red-600" />
              <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                Against ({Number(proposal.againstVotes).toLocaleString()})
              </span>
            </div>
            <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {againstPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={againstPercentage} className="h-2 bg-gray-200">
            <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${againstPercentage}%` }} />
          </Progress>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Minus className="w-4 h-4 text-yellow-600" />
              <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                Abstain ({Number(proposal.abstainVotes).toLocaleString()})
              </span>
            </div>
            <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {abstainPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={abstainPercentage} className="h-2 bg-gray-200">
            <div
              className="h-full bg-yellow-600 rounded-full transition-all"
              style={{ width: `${abstainPercentage}%` }}
            />
          </Progress>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                Quorum ({totalVotes.toLocaleString()} / {Number(proposal.quorum).toLocaleString()})
              </span>
            </div>
            <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {quorumPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={Math.min(quorumPercentage, 100)} className="h-2 bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${quorumPercentage >= 100 ? "bg-green-600" : "bg-blue-600"}`}
              style={{ width: `${Math.min(quorumPercentage, 100)}%` }}
            />
          </Progress>
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
                onClick={() => handleVote(1)}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                For
              </Button>
              <Button onClick={() => handleVote(0)} size="sm" variant="destructive" className="flex-1">
                <ThumbsDown className="w-4 h-4 mr-1" />
                Against
              </Button>
              <Button onClick={() => handleVote(2)} size="sm" variant="outline" className="flex-1">
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
