import { useState, useEffect } from "react"
import { useReadContract, useReadContracts } from "wagmi"
import { GOVERNOR_CONTRACT } from "@/lib/contracts"

export interface ProposalData {
  id: number
  state: number
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  deadline: bigint
  hasVoted: boolean
  totalVotes: bigint
}

export function useProposalData(proposalId: number, userAddress?: string) {
  const [proposalData, setProposalData] = useState<ProposalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Read multiple contract functions in parallel
  const { data: contractData, isLoading: contractLoading, error: contractError } = useReadContracts({
    contracts: [
      {
        ...GOVERNOR_CONTRACT,
        functionName: "state",
        args: [BigInt(proposalId)],
      },
      {
        ...GOVERNOR_CONTRACT,
        functionName: "proposalVotes",
        args: [BigInt(proposalId)],
      },
      {
        ...GOVERNOR_CONTRACT,
        functionName: "proposalDeadline",
        args: [BigInt(proposalId)],
      },
      ...(userAddress ? [{
        ...GOVERNOR_CONTRACT,
        functionName: "hasVoted",
        args: [BigInt(proposalId), userAddress as `0x${string}`],
      }] : []),
    ],
  })

  useEffect(() => {
    if (contractLoading) {
      setIsLoading(true)
      return
    }

    if (contractError) {
      setError(contractError.message)
      setIsLoading(false)
      return
    }

    if (contractData && contractData.length >= 3) {
      const state = contractData[0]?.result as number
      const votes = contractData[1]?.result as [bigint, bigint, bigint]
      const deadline = contractData[2]?.result as bigint
      const hasVoted = userAddress ? (contractData[3]?.result as boolean) : false

      if (votes && votes.length === 3) {
        const [againstVotes, forVotes, abstainVotes] = votes
        const totalVotes = forVotes + againstVotes + abstainVotes

        setProposalData({
          id: proposalId,
          state: state || 0,
          forVotes,
          againstVotes,
          abstainVotes,
          deadline: deadline || BigInt(0),
          hasVoted,
          totalVotes,
        })
      }
    }

    setIsLoading(false)
  }, [contractData, contractLoading, contractError, proposalId, userAddress])

  return {
    proposalData,
    isLoading,
    error,
    refetch: () => {
      // You can implement refetch logic here if needed
    },
  }
}

export function useProposalCount() {
  const { data: proposalCount, isLoading, error } = useReadContract({
    ...GOVERNOR_CONTRACT,
    functionName: "proposalCount",
  })

  return {
    proposalCount: proposalCount ? Number(proposalCount) : 0,
    isLoading,
    error,
  }
}

export const PROPOSAL_STATES = {
  0: "Pending",
  1: "Active", 
  2: "Canceled",
  3: "Defeated",
  4: "Succeeded", 
  5: "Queued",
  6: "Expired",
  7: "Executed",
} as const

export type ProposalState = keyof typeof PROPOSAL_STATES