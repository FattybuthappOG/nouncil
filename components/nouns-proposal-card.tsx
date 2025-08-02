"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Vote, Clock, User, MessageSquare } from "lucide-react"
import { NounsProposal, getProposalStatus, getVoteSupport, formatTimestamp } from "@/hooks/useNounsProposals"
import { useNounsSDK } from "@/hooks/useNounsSDK"
import { useState } from "react"

interface NounsProposalCardProps {
  proposal: NounsProposal
  isDarkMode: boolean
  onVote?: (proposalId: string, support: number) => void
}

export function NounsProposalCard({ proposal, isDarkMode, onVote }: NounsProposalCardProps) {
  const [isConnected, setIsConnected] = useState(false)
  const { vote, isLoading: isVoting } = useNounsSDK()
  const status = getProposalStatus(proposal.status)
  const statusColor = proposal.status === 'ACTIVE' ? 'text-green-600' : 
                     proposal.status === 'SUCCEEDED' ? 'text-blue-600' : 
                     proposal.status === 'DEFEATED' ? 'text-red-600' : 
                     'text-gray-600'
  const totalVotes = parseInt(proposal.forVotes) + parseInt(proposal.againstVotes) + parseInt(proposal.abstainVotes)
  const forVotesPercent = totalVotes > 0 ? (parseInt(proposal.forVotes) / totalVotes) * 100 : 0
  const againstVotesPercent = totalVotes > 0 ? (parseInt(proposal.againstVotes) / totalVotes) * 100 : 0

  const handleVote = async (support: number) => {
    if (!isConnected) {
      alert('Please connect your wallet to vote')
      return
    }

    try {
      await vote(proposal.id, support)
      if (onVote) {
        onVote(proposal.id, support)
      }
    } catch (error) {
      console.error('Error voting:', error)
      alert(`Error voting: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <Card className={`transition-colors duration-200 ${
      isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                className={`${statusColor} ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}
              >
                {status}
              </Badge>
              <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Proposal {proposal.id}
              </span>
            </div>
            
            <h3 className={`font-semibold text-lg mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {proposal.title || `Proposal ${proposal.id}`}
            </h3>
            
            <p className={`text-sm line-clamp-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              {proposal.description || "No description available"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Proposal Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className={`text-lg font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {parseInt(proposal.forVotes).toLocaleString()}
            </div>
            <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              For Votes
            </div>
          </div>
          
          <div className="text-center">
            <div className={`text-lg font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {parseInt(proposal.againstVotes).toLocaleString()}
            </div>
            <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Against
            </div>
          </div>
          
          <div className="text-center">
            <div className={`text-lg font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {parseInt(proposal.abstainVotes).toLocaleString()}
            </div>
            <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Abstain
            </div>
          </div>
          
          <div className="text-center">
            <div className={`text-lg font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {proposal.votes.length}
            </div>
            <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Voters
            </div>
          </div>
        </div>

        {/* Vote Progress Bars */}
        {totalVotes > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                For: {forVotesPercent.toFixed(1)}%
              </span>
              <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                Against: {againstVotesPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${forVotesPercent}%` }}
              />
              <div 
                className="bg-red-500 h-full transition-all duration-300"
                style={{ width: `${againstVotesPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Recent Votes */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Vote className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
            <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Recent Votes
            </span>
          </div>
          
          {proposal.votes.slice(0, 3).map((vote) => {
            const voteInfo = getVoteSupport(vote.support)
            return (
              <div key={vote.id} className="flex items-center gap-2 text-sm">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={`/placeholder.svg?height=24&width=24&query=${vote.voter}`} />
                  <AvatarFallback className={isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}>
                    {vote.voter.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={`font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  {vote.voter.slice(0, 6)}...{vote.voter.slice(-4)}
                </span>
                <span className={`font-medium ${voteInfo === 'For' ? 'text-green-600' : voteInfo === 'Against' ? 'text-red-600' : 'text-yellow-600'}`}>
                  {voteInfo}
                </span>
                <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {parseInt(vote.weight).toLocaleString()} votes
                </span>
              </div>
            )
          })}
        </div>

        {/* Proposal Metadata */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                {formatTimestamp(proposal.createdTimestamp)}
              </span>
            </div>
          </div>
          
          {proposal.status === 'ACTIVE' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white"
                onClick={() => handleVote(1)}
                disabled={isVoting || !isConnected}
              >
                {isVoting ? 'Voting...' : 'Vote For'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                onClick={() => handleVote(0)}
                disabled={isVoting || !isConnected}
              >
                {isVoting ? 'Voting...' : 'Vote Against'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 