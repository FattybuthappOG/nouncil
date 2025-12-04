"use client"

import type React from "react"
import { useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ThumbsUp, ThumbsDown, Minus, Clock } from "lucide-react"
import { useAccount, useBlockNumber, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { useProposalData } from "@/hooks/useContractData"
import { parseProposalDescription, getProposalStateLabel } from "@/lib/markdown-parser"
import { GOVERNOR_CONTRACT } from "@/lib/contracts"
import { EnsDisplay } from "./ens-display"

interface ProposalVotingCardProps {
  proposalId: number
  isDarkMode: boolean
  proposalData?: any
  statusFilter?: string
}

export function ProposalVotingCard({
  proposalId,
  isDarkMode,
  proposalData,
  statusFilter = "all",
}: ProposalVotingCardProps) {
  const [voteReason, setVoteReason] = useState("")
  const [selectedSupport, setSelectedSupport] = useState<number | null>(null)
  const [showVoteForm, setShowVoteForm] = useState(false)

  const { isConnected } = useAccount()
  const proposal = useProposalData(proposalId)

  const { data: hash, writeContract, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  const { data: currentBlockData, isError: blockError } = useBlockNumber({
    watch: true,
    cacheTime: 10_000,
    query: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  })
  const currentBlock = currentBlockData ? Number(currentBlockData) : null

  const { title, media } = parseProposalDescription(proposal.description || `Proposal ${proposalId}`)

  const votingIsActive = proposal.state === 1 // Active state from Subgraph
  const showTiming = currentBlock !== null && !blockError

  const { label: stateLabel, color: stateColor } = getProposalStateLabel(proposal.state)

  const isVisible = statusFilter === "all" || stateLabel.toUpperCase() === statusFilter

  let timingDisplay = null
  if (showTiming && currentBlock) {
    const votingEnded = currentBlock > Number(proposal.endBlock)
    const votingStarted = currentBlock >= Number(proposal.startBlock)
    const blocksRemaining = votingEnded ? 0 : Number(proposal.endBlock) - currentBlock
    const hoursRemaining = Math.floor((blocksRemaining * 12) / 3600)
    const daysRemaining = Math.floor(hoursRemaining / 24)

    const blocksEnded = currentBlock - Number(proposal.endBlock)
    const hoursEnded = Math.floor((blocksEnded * 12) / 3600)
    const daysEnded = Math.floor(hoursEnded / 24)

    if (!votingStarted) {
      const hoursUntilStart = Math.floor(((Number(proposal.startBlock) - currentBlock) * 12) / 3600)
      timingDisplay = `Voting starts in ${hoursUntilStart} hours`
    } else if (votingStarted && !votingEnded && daysRemaining > 0) {
      timingDisplay = `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`
    } else if (votingStarted && !votingEnded && daysRemaining === 0) {
      timingDisplay = `${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""} remaining`
    } else if (votingEnded && daysEnded > 0) {
      timingDisplay = `Ended ${daysEnded} day${daysEnded !== 1 ? "s" : ""} ago`
    } else if (votingEnded && hoursEnded > 0) {
      timingDisplay = `Ended ${hoursEnded} hour${hoursEnded !== 1 ? "s" : ""} ago`
    } else if (votingEnded) {
      timingDisplay = "Ended recently"
    }
  }

  const handleVote = (support: number) => {
    if (!isConnected) return
    setSelectedSupport(support)
    setShowVoteForm(true)
  }

  const submitVote = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedSupport === null || !isConnected) return

    writeContract({
      address: GOVERNOR_CONTRACT.address,
      abi: GOVERNOR_CONTRACT.abi,
      functionName: "castRefundableVoteWithReason",
      args: [BigInt(proposalId), selectedSupport as 0 | 1 | 2, voteReason, 22],
    })
  }

  const forNouns = Number(proposal.forVotes)
  const againstNouns = Number(proposal.againstVotes)
  const abstainNouns = Number(proposal.abstainVotes)
  const quorumNeeded = Number(proposal.quorum)
  const totalVotes = forNouns + againstNouns + abstainNouns
  const quorumMet = totalVotes >= quorumNeeded

  return (
    <Card
      onClick={() => !showVoteForm && (window.location.href = `/proposal/${proposalId}`)}
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

            {proposal.proposer && proposal.proposer !== "0x0000000000000000000000000000000000000000" && (
              <div className={`text-sm mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                by <EnsDisplay address={proposal.proposer} className="inline" />
              </div>
            )}

            {timingDisplay && (
              <div className={`flex items-center gap-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                <Clock className="w-4 h-4" />
                <span>{timingDisplay}</span>
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

        <div className="pt-2" onClick={(e) => e.stopPropagation()}>
          {!isConnected ? (
            <div className={`text-sm text-center w-full py-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Connect wallet to vote
            </div>
          ) : isConfirmed ? (
            <div className="flex items-center gap-2 w-full justify-center py-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Vote Submitted!
              </Badge>
            </div>
          ) : votingIsActive ? (
            <>
              {!showVoteForm ? (
                <div className="flex gap-2">
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
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-300">
                      Voting:{" "}
                      <span className="font-semibold">
                        {selectedSupport === 1 ? "For" : selectedSupport === 0 ? "Against" : "Abstain"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowVoteForm(false)
                        setSelectedSupport(null)
                      }}
                      className="text-gray-400 hover:text-white h-8 px-2"
                    >
                      Cancel
                    </Button>
                  </div>
                  <Textarea
                    value={voteReason}
                    onChange={(e) => setVoteReason(e.target.value)}
                    placeholder="Reason for vote (optional)"
                    className="min-h-[60px] text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    onClick={submitVote}
                    disabled={isPending || isConfirming}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    {isPending || isConfirming ? "Submitting..." : "Submit Vote"}
                  </Button>
                </div>
              )}
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

export default ProposalVotingCard
