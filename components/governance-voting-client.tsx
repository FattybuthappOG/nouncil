"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { ConnectKitButton } from "connectkit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThumbsUp, ThumbsDown, Minus, Clock, Users, ExternalLink, RefreshCw } from "lucide-react"
import { useProposalData, useProposalCount, PROPOSAL_STATES } from "@/hooks/useProposalData"
import { useSubgraphProposals, getProposalTitle, formatProposalDescription } from "@/hooks/useSubgraphProposals"
import { useVoting, VoteType } from "@/hooks/useVoting"
import { formatDistanceToNow } from "date-fns"

interface GovernanceVotingClientProps {
  isDarkMode?: boolean
}

export function GovernanceVotingClient({ isDarkMode = true }: GovernanceVotingClientProps) {
  const { address, isConnected } = useAccount()
  const { proposalCount } = useProposalCount()
  const [selectedProposal, setSelectedProposal] = useState<number>(1)
  const [voteReason, setVoteReason] = useState("")
  const [showVoteForm, setShowVoteForm] = useState(false)
  const [selectedVoteType, setSelectedVoteType] = useState<VoteType | null>(null)

  // Fetch subgraph proposals
  const { proposals: subgraphProposals, isLoading: subgraphLoading, error: subgraphError } = useSubgraphProposals(50, 0)

  const { proposalData, isLoading, error, refetch } = useProposalData(
    selectedProposal,
    address
  )
  
  const { castVote, isVoting, isConfirmed, voteHash, error: votingError } = useVoting()

  // Auto-select the latest proposal when component loads
  useEffect(() => {
    if (subgraphProposals.length > 0 && selectedProposal === 1) {
      const latestProposal = subgraphProposals[0]
      setSelectedProposal(Number(latestProposal.id))
    }
  }, [subgraphProposals, selectedProposal])

  // Reset vote form when vote is confirmed
  useEffect(() => {
    if (isConfirmed) {
      setShowVoteForm(false)
      setVoteReason("")
      setSelectedVoteType(null)
      refetch()
    }
  }, [isConfirmed, refetch])

  const handleVote = async () => {
    if (!selectedVoteType || !proposalData) return
    
    try {
      await castVote(proposalData.id, selectedVoteType, voteReason)
    } catch (error) {
      console.error("Failed to vote:", error)
    }
  }

  const formatVotes = (votes: bigint) => {
    const votesNumber = Number(votes)
    if (votesNumber >= 1000000) {
      return `${(votesNumber / 1000000).toFixed(1)}M`
    } else if (votesNumber >= 1000) {
      return `${(votesNumber / 1000).toFixed(1)}K`
    }
    return votesNumber.toString()
  }

  const getProposalStatus = (state: number) => {
    const status = PROPOSAL_STATES[state as keyof typeof PROPOSAL_STATES] || "Unknown"
    const colors = {
      Pending: "bg-yellow-100 text-yellow-800",
      Active: "bg-green-100 text-green-800",
      Canceled: "bg-gray-100 text-gray-800",
      Defeated: "bg-red-100 text-red-800",
      Succeeded: "bg-blue-100 text-blue-800",
      Queued: "bg-purple-100 text-purple-800",
      Expired: "bg-gray-100 text-gray-800",
      Executed: "bg-green-100 text-green-800",
    }
    return { status, color: colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800" }
  }

  const isVotingOpen = proposalData?.state === 1 // Active state

  const renderProposalSelector = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      {subgraphProposals.slice(0, 10).map((proposal) => {
        const proposalId = Number(proposal.id)
        const title = getProposalTitle(proposal.description)
        return (
          <Button
            key={proposalId}
            variant={selectedProposal === proposalId ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedProposal(proposalId)}
            className={isDarkMode ? "border-gray-600" : ""}
          >
            #{proposalId}
          </Button>
        )
      })}
    </div>
  )

  const renderVotingResults = () => {
    if (!proposalData) return null

    const totalVotes = Number(proposalData.totalVotes)
    const forVotes = Number(proposalData.forVotes)
    const againstVotes = Number(proposalData.againstVotes)
    const abstainVotes = Number(proposalData.abstainVotes)

    const forPercentage = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0
    const againstPercentage = totalVotes > 0 ? (againstVotes / totalVotes) * 100 : 0
    const abstainPercentage = totalVotes > 0 ? (abstainVotes / totalVotes) * 100 : 0

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
            Voting Results
          </h3>
          <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            {formatVotes(proposalData.totalVotes)} total votes
          </span>
        </div>

        {/* For votes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-green-600" />
              <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                For ({formatVotes(proposalData.forVotes)})
              </span>
            </div>
            <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {forPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={forPercentage} className="h-2" />
        </div>

        {/* Against votes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-red-600" />
              <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                Against ({formatVotes(proposalData.againstVotes)})
              </span>
            </div>
            <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {againstPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={againstPercentage} className="h-2" />
        </div>

        {/* Abstain votes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Minus className="w-4 h-4 text-gray-600" />
              <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                Abstain ({formatVotes(proposalData.abstainVotes)})
              </span>
            </div>
            <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              {abstainPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={abstainPercentage} className="h-2" />
        </div>
      </div>
    )
  }

  const renderVotingSection = () => {
    if (!isConnected) {
      return (
        <div className="text-center py-6">
          <p className={`mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            Connect your wallet to vote on proposals
          </p>
          <ConnectKitButton />
        </div>
      )
    }

    if (!isVotingOpen) {
      return (
        <div className={`text-center py-4 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          Voting is not currently open for this proposal
        </div>
      )
    }

    if (proposalData?.hasVoted) {
      return (
        <div className={`text-center py-4 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          You have already voted on this proposal
        </div>
      )
    }

    if (!showVoteForm) {
      return (
        <div className="space-y-3">
          <Button
            onClick={() => setShowVoteForm(true)}
            className="w-full"
            disabled={isVoting}
          >
            Cast Your Vote
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={selectedVoteType === VoteType.For ? "default" : "outline"}
            onClick={() => setSelectedVoteType(VoteType.For)}
            className="flex items-center gap-2"
            disabled={isVoting}
          >
            <ThumbsUp className="w-4 h-4" />
            For
          </Button>
          <Button
            variant={selectedVoteType === VoteType.Against ? "default" : "outline"}
            onClick={() => setSelectedVoteType(VoteType.Against)}
            className="flex items-center gap-2"
            disabled={isVoting}
          >
            <ThumbsDown className="w-4 h-4" />
            Against
          </Button>
          <Button
            variant={selectedVoteType === VoteType.Abstain ? "default" : "outline"}
            onClick={() => setSelectedVoteType(VoteType.Abstain)}
            className="flex items-center gap-2"
            disabled={isVoting}
          >
            <Minus className="w-4 h-4" />
            Abstain
          </Button>
        </div>

        <Textarea
          placeholder="Add a reason for your vote (optional)"
          value={voteReason}
          onChange={(e) => setVoteReason(e.target.value)}
          className={`resize-none ${isDarkMode ? "bg-gray-800 border-gray-600" : ""}`}
          disabled={isVoting}
        />

        <div className="flex gap-2">
          <Button
            onClick={handleVote}
            disabled={!selectedVoteType || isVoting}
            className="flex-1"
          >
            {isVoting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Voting...
              </>
            ) : (
              "Submit Vote"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowVoteForm(false)
              setSelectedVoteType(null)
              setVoteReason("")
            }}
            disabled={isVoting}
          >
            Cancel
          </Button>
        </div>

        {votingError && (
          <div className="text-red-600 text-sm">{votingError}</div>
        )}

        {voteHash && (
          <div className="text-sm">
            <a
              href={`https://etherscan.io/tx/${voteHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View transaction <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    )
  }

  if (subgraphLoading || isLoading) {
    return (
      <Card className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <CardContent className="p-6">
          <div className="text-center">Loading proposal data from Nouns subgraph...</div>
        </CardContent>
      </Card>
    )
  }

  if (subgraphError || error) {
    return (
      <Card className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error: {subgraphError || error}
            <div className="text-sm mt-2">
              Failed to load data from Nouns subgraph. Please try again later.
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!proposalData || subgraphProposals.length === 0) {
    return (
      <Card className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <CardContent className="p-6">
          <div className="text-center">No proposal data available from Nouns subgraph</div>
        </CardContent>
      </Card>
    )
  }

  const { status, color } = getProposalStatus(proposalData.state)
  
  // Find the current proposal in subgraph data
  const currentSubgraphProposal = subgraphProposals.find(p => Number(p.id) === proposalData.id)
  const proposalTitle = currentSubgraphProposal ? getProposalTitle(currentSubgraphProposal.description) : `Proposal ${proposalData.id}`
  const proposalDescription = currentSubgraphProposal ? formatProposalDescription(currentSubgraphProposal.description) : "No description available"

  return (
    <div className="space-y-6">
      <Card className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={`${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              Nouns DAO Governance Voting Client
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={color}>{status}</Badge>
              <a
                href={`https://etherscan.io/address/0x6f3E6272A167e8AcCb32072d08E0957F9c79223d`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderProposalSelector()}
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className={`font-semibold mb-4 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                {proposalTitle}
              </h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
                  <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                    Deadline: {formatDistanceToNow(new Date(Number(proposalData.deadline) * 1000), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
                  <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                    Contract: 0x6f3E...223d
                  </span>
                </div>
                {currentSubgraphProposal?.clientId && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                      Client ID: {currentSubgraphProposal.clientId}
                    </span>
                  </div>
                )}
              </div>

              <div className={`text-sm mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                {proposalDescription}
              </div>

              {renderVotingResults()}
            </div>

            <div>
              <h3 className={`font-semibold mb-4 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                Cast Your Vote
              </h3>
              {renderVotingSection()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}