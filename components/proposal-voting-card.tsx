"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAccount, useWriteContract } from "wagmi"
import { ConnectKitButton } from "connectkit"
import { useProposalData, useUserVotingData } from "../hooks/useContractData"
import { PROPOSAL_STATES, CONTRACTS } from "../lib/contracts"

interface ProposalVotingCardProps {
  proposalId: number
  isDarkMode: boolean
  title?: string
  description?: string
}

export function ProposalVotingCard({ proposalId, isDarkMode, title, description }: ProposalVotingCardProps) {
  const { address, isConnected } = useAccount()
  const { proposal, state: proposalState } = useProposalData(proposalId)
  const { hasVoted, votingPower } = useUserVotingData(proposalId, address)
  const { writeContract, isPending: isVoting } = useWriteContract()

  const castVote = async (support: number) => {
    if (!address) {
      alert("Please connect your wallet to vote")
      return
    }

    try {
      await writeContract({
        ...CONTRACTS.GOVERNOR,
        functionName: "castVote",
        args: [BigInt(proposalId), support],
      })
    } catch (error) {
      console.error("Voting failed:", error)
    }
  }

  const getProposalStatusBadge = (state: number | null) => {
    if (state === null) return null
    const status = PROPOSAL_STATES[state as keyof typeof PROPOSAL_STATES]
    const colors = {
      Active: "bg-blue-100 text-blue-800",
      Succeeded: "bg-green-100 text-green-800",
      Defeated: "bg-red-100 text-red-800",
      Executed: "bg-purple-100 text-purple-800",
      Pending: "bg-yellow-100 text-yellow-800",
      Canceled: "bg-gray-100 text-gray-800",
      Expired: "bg-orange-100 text-orange-800",
      Queued: "bg-indigo-100 text-indigo-800",
    }
    return <Badge className={colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"}>{status}</Badge>
  }

  if (!proposal) {
    return (
      <div
        className={`flex items-start gap-3 p-3 sm:p-4 rounded-lg border transition-colors duration-200 ${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse flex-shrink-0"></div>
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-300 rounded animate-pulse mb-2"></div>
          <div className="h-3 bg-gray-300 rounded animate-pulse w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex items-start gap-3 p-3 sm:p-4 rounded-lg border transition-colors duration-200 ${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={`/placeholder.svg?height=32&width=32&query=proposal${proposalId}`} />
        <AvatarFallback className={isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}>
          {proposalId}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
          <span className={`font-medium text-sm sm:text-base ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
            Proposal {proposalId}: {title || `Governance Proposal ${proposalId}`}
          </span>
          {getProposalStatusBadge(proposalState)}
        </div>

        {description && (
          <p className={`text-sm mb-3 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{description}</p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm mb-3">
          <span className="text-green-600">For: {Number.parseFloat(proposal.forVotes).toFixed(2)} ETH</span>
          <span className="text-red-600">Against: {Number.parseFloat(proposal.againstVotes).toFixed(2)} ETH</span>
          <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            by {proposal.proposer?.slice(0, 6)}...{proposal.proposer?.slice(-4)}
          </span>
        </div>

        {/* Voting Interface */}
        {proposalState === 1 && ( // Only show voting if proposal is active
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3">
            {!isConnected ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Connect wallet to vote
                </span>
                <ConnectKitButton.Custom>
                  {({ show }) => (
                    <Button
                      size="sm"
                      onClick={show}
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                    >
                      Connect Wallet
                    </Button>
                  )}
                </ConnectKitButton.Custom>
              </div>
            ) : hasVoted ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Already Voted
              </Badge>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => castVote(1)}
                    disabled={isVoting}
                    className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                  >
                    {isVoting ? "Voting..." : "Vote For"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => castVote(0)}
                    disabled={isVoting}
                    className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none"
                  >
                    {isVoting ? "Voting..." : "Vote Against"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => castVote(2)}
                    disabled={isVoting}
                    variant="outline"
                    className="flex-1 sm:flex-none"
                  >
                    {isVoting ? "Voting..." : "Abstain"}
                  </Button>
                </div>
                <span className={`text-xs self-center ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Your power: {Number.parseFloat(votingPower).toFixed(2)} ETH
                </span>
              </div>
            )}
          </div>
        )}

        {proposalState !== 1 && proposalState !== null && (
          <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            Voting ended • Final result: {PROPOSAL_STATES[proposalState as keyof typeof PROPOSAL_STATES]}
          </div>
        )}
      </div>
    </div>
  )
}
