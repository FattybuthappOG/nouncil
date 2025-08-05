import { useState } from "react"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { GOVERNOR_CONTRACT } from "@/lib/contracts"

const CLIENT_ID = 22 // Always use 22 as clientId as specified

export enum VoteType {
  Against = 0,
  For = 1,
  Abstain = 2,
}

export function useVoting() {
  const [isVoting, setIsVoting] = useState(false)
  const [votingError, setVotingError] = useState<string | null>(null)

  const { 
    writeContract: writeVote, 
    data: voteHash, 
    isPending: isWritePending,
    error: writeError 
  } = useWriteContract()

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError 
  } = useWaitForTransactionReceipt({
    hash: voteHash,
  })

  const castVote = async (
    proposalId: number,
    support: VoteType,
    reason: string = ""
  ) => {
    try {
      setIsVoting(true)
      setVotingError(null)

      await writeVote({
        ...GOVERNOR_CONTRACT,
        functionName: "castRefundableVoteWithReason",
        args: [
          BigInt(proposalId),
          support,
          reason,
          CLIENT_ID, // Always use 22 as clientId
        ],
      })
    } catch (error) {
      console.error("Error casting vote:", error)
      setVotingError(error instanceof Error ? error.message : "Failed to cast vote")
      setIsVoting(false)
    }
  }

  // Reset voting state when transaction is confirmed or fails
  if ((isConfirmed || confirmError || writeError) && isVoting) {
    setIsVoting(false)
  }

  return {
    castVote,
    isVoting: isVoting || isWritePending || isConfirming,
    isConfirmed,
    voteHash,
    error: votingError || writeError?.message || confirmError?.message,
    VoteType,
  }
}