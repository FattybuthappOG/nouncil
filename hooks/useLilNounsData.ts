"use client"

import { useState, useEffect } from "react"

const PROPOSAL_STATE_NAMES = [
  "Pending",
  "Active",
  "Canceled",
  "Defeated",
  "Succeeded",
  "Queued",
  "Expired",
  "Executed",
  "Vetoed",
]

// Hook to fetch all Lil Nouns proposal IDs using API route
export function useLilNounsProposalIds(limit = 20) {
  const [proposalIds, setProposalIds] = useState<number[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchProposalIds = async () => {
      try {
        const response = await fetch(`/api/lilnouns/proposals?limit=${limit}`)
        const data = await response.json()
        
        if (data.proposals) {
          const ids = data.proposals.map((p: any) => p.id)
          setProposalIds(ids)
          setTotalCount(data.totalCount || ids.length)
        } else {
          setProposalIds([])
          setTotalCount(0)
        }
      } catch (error) {
        console.error("Error fetching Lil Nouns proposals:", error)
        setProposalIds([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposalIds()
  }, [mounted, limit])

  return { proposalIds, totalCount, isLoading }
}

// Hook to fetch proposal data for display in cards using API route
export function useLilNounsProposalData(proposalId: number) {
  const [mounted, setMounted] = useState(false)
  const [currentBlock, setCurrentBlock] = useState<number>(0)

  const [proposalData, setProposalData] = useState({
    id: proposalId,
    proposer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    sponsors: [] as `0x${string}`[],
    forVotes: BigInt(0),
    againstVotes: BigInt(0),
    abstainVotes: BigInt(0),
    state: 0,
    stateName: "Pending",
    quorum: BigInt(0),
    description: `Proposal ${proposalId}`,
    fullDescription: "",
    startBlock: BigInt(0),
    endBlock: BigInt(0),
    transactionHash: "",
    targets: [] as string[],
    values: [] as string[],
    signatures: [] as string[],
    calldatas: [] as string[],
    isLoading: true,
    error: false,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !proposalId) return

    const fetchProposalData = async () => {
      try {
        const response = await fetch(`/api/lilnouns/proposals?id=${proposalId}`)
        const proposal = await response.json()

        if (proposal && proposal.id) {
          setProposalData({
            id: proposalId,
            proposer: proposal.proposer as `0x${string}`,
            sponsors: [],
            forVotes: BigInt(proposal.forVotes || 0),
            againstVotes: BigInt(proposal.againstVotes || 0),
            abstainVotes: BigInt(proposal.abstainVotes || 0),
            state: proposal.stateNumber,
            stateName: proposal.state,
            quorum: BigInt(proposal.quorumVotes || 0),
            description: proposal.description || `Proposal ${proposalId}`,
            fullDescription: proposal.description || `Lil Nouns Proposal ${proposalId}`,
            startBlock: BigInt(proposal.startBlock || 0),
            endBlock: BigInt(proposal.endBlock || 0),
            transactionHash: "",
            targets: [],
            values: [],
            signatures: [],
            calldatas: [],
            isLoading: false,
            error: false,
          })
        } else {
          setProposalData((prev) => ({ ...prev, isLoading: false, error: true }))
        }
      } catch (error) {
        console.error("Error fetching Lil Nouns proposal:", error)
        setProposalData((prev) => ({ ...prev, isLoading: false, error: true }))
      }
    }

    fetchProposalData()
  }, [mounted, proposalId])

  return { ...proposalData, currentBlock }
}

// Hook to fetch all candidates (placeholder - requires subgraph)
export function useLilNounsCandidateIds(limit = 20) {
  // Candidates require a subgraph to enumerate - return empty
  return {
    candidates: [] as { id: string; slug: string; proposer: string }[],
    totalCount: 0,
    isLoading: false,
  }
}

// Hook to fetch a single candidate (placeholder - requires subgraph)
export function useLilNounsCandidateData(candidateId: string) {
  return {
    id: candidateId,
    slug: "",
    proposer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    sponsors: [] as any[],
    description: "",
    fullDescription: "",
    createdTimestamp: 0,
    transactionHash: "",
    targets: [] as string[],
    values: [] as string[],
    signatures: [] as string[],
    calldatas: [] as string[],
    canceled: false,
    isLoading: false,
    error: true, // Always error since we can't fetch without subgraph
  }
}

// Hook for proposal feedback (not available on-chain for Lil Nouns)
export function useLilNounsProposalFeedback(proposalId: number) {
  return { feedback: [], isLoading: false }
}

// Hook to fetch votes for a proposal using API route
export function useLilNounsVotes(proposalId: number) {
  const [votes, setVotes] = useState<
    Array<{
      voter: string
      support: number
      supportLabel: string
      votes: number
      reason: string
      blockNumber: number
    }>
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !proposalId) return

    const fetchVotesData = async () => {
      try {
        const response = await fetch(`/api/lilnouns/proposals?id=${proposalId}`)
        const proposal = await response.json()

        if (proposal) {
          // Return aggregated votes since we don't have individual voter data
          const votesList = [
            {
              voter: "Total For Votes",
              support: 1,
              supportLabel: "For",
              votes: Number(proposal.forVotes || 0),
              reason: "",
              blockNumber: 0,
            },
            {
              voter: "Total Against Votes",
              support: 0,
              supportLabel: "Against",
              votes: Number(proposal.againstVotes || 0),
              reason: "",
              blockNumber: 0,
            },
            {
              voter: "Total Abstain Votes",
              support: 2,
              supportLabel: "Abstain",
              votes: Number(proposal.abstainVotes || 0),
              reason: "",
              blockNumber: 0,
            },
          ]
          setVotes(votesList)
        }
      } catch (error) {
        console.error("Error fetching Lil Nouns votes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVotesData()
  }, [mounted, proposalId])

  return { votes, isLoading }
}

// Hook for candidate feedback (not available on-chain)
export function useLilNounsCandidateFeedback(slug: string) {
  return { feedback: [], isLoading: false }
}
