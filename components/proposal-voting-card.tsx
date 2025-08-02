"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThumbsUp, ThumbsDown, Minus, Clock, Users } from "lucide-react"
import { useState } from "react"

interface ProposalVotingCardProps {
  proposalId: number
  isDarkMode: boolean
  title: string
  description: string
}

export function ProposalVotingCard({ proposalId, isDarkMode, title, description }: ProposalVotingCardProps) {
  const [hasVoted, setHasVoted] = useState(false)
  const [userVote, setUserVote] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Mock voting data - in a real app, this would come from contract calls
  const votingData = {
    forVotes: Math.floor(Math.random() * 500000) + 100000,
    againstVotes: Math.floor(Math.random() * 200000) + 50000,
    abstainVotes: Math.floor(Math.random() * 50000) + 10000,
    totalVotes: 0,
    quorum: 400000,
    endTime: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days from now
  }

  votingData.totalVotes = votingData.forVotes + votingData.againstVotes + votingData.abstainVotes

  const forPercentage = (votingData.forVotes / votingData.totalVotes) * 100
  const againstPercentage = (votingData.againstVotes / votingData.totalVotes) * 100
  const abstainPercentage = (votingData.abstainVotes / votingData.totalVotes) * 100
  const quorumPercentage = (votingData.totalVotes / votingData.quorum) * 100

  const handleVote = (support: number) => {
    if (!isConnected) return
    setHasVoted(true)
    setUserVote(support)
    // In a real app, this would call the contract vote function
    console.log(`Voting ${support} on proposal ${proposalId}`)
  }

  const formatTimeRemaining = (endTime: number) => {
    const now = Date.now()
    const diff = endTime - now
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h remaining`
    return "Ending soon"
  }

  return (
    <Card
      className={`transition-colors duration-200 ${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Proposal {proposalId}
              </Badge>
              <Badge variant="outline" className="text-green-600 border-green-600">
                Active
              </Badge>
            </div>
            <CardTitle className={`text-lg mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>{title}</CardTitle>
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{description}</p>
          </div>
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={`/placeholder.svg?height=40&width=40&query=proposal-${proposalId}`} />
            <AvatarFallback className={isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}>
              P{proposalId}
            </AvatarFallback>
          </Avatar>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voting Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-green-600" />
              <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                For ({votingData.forVotes.toLocaleString()})
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
                Against ({votingData.againstVotes.toLocaleString()})
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
                Abstain ({votingData.abstainVotes.toLocaleString()})
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

        {/* Quorum Progress */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                Quorum ({votingData.totalVotes.toLocaleString()} / {votingData.quorum.toLocaleString()})
              </span>
            </div>
            <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {quorumPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={Math.min(quorumPercentage, 100)} className="h-2 bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${
                quorumPercentage >= 100 ? "bg-green-600" : "bg-blue-600"
              }`}
              style={{ width: `${Math.min(quorumPercentage, 100)}%` }}
            />
          </Progress>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4" />
          <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
            {formatTimeRemaining(votingData.endTime)}
          </span>
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
          ) : (
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
          )}
        </div>
      </CardContent>
    </Card>
  )
}
