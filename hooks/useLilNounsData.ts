"use client"

import { useState, useEffect } from "react"
import { getProposals, getProposalVotes, getProposalStatus, type Proposal, type VoteCounts } from "@/lib/lilnouns-governor"
import { getCandidates, getCandidateBySlug, type Candidate } from "@/lib/lilnouns-candidates"
import { getCurrentBlock } from "@/lib/lilnouns-ethClient"

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

// Hook to fetch all Lil Nouns proposal IDs
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
        const proposals = await getProposals()
        const ids = proposals.map((p) => Number.parseInt(p.id))
        setTotalCount(ids.length)
        setProposalIds(ids.slice(0, limit))
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

// Hook to fetch proposal data for display in cards
export function useLilNounsProposalData(proposalId: number) {
  const [mounted, setMounted] = useState(false)
  const [currentBlock, setCurrentBlock] = useState<number>(0)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [votes, setVotes] = useState<VoteCounts | null>(null)
  const [status, setStatus] = useState<string>("PENDING")

  const [proposalData, setProposalData] = useState({
    id: proposalId,
    proposer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    sponsors: [] as `0x${string}`[],
    forVotes: BigInt(0),
    againstVotes: BigInt(0),
    abstainVotes: BigInt(0),
    state: 0,
    stateName: "Pending",
    quorum: BigInt(72),
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
    if (!mounted) return

    const fetchCurrentBlock = async () => {
      try {
        const block = await getCurrentBlock()
        setCurrentBlock(Number(block))
      } catch (error) {
        // Silently fail
      }
    }
    fetchCurrentBlock()
    const interval = setInterval(fetchCurrentBlock, 30000)
    return () => clearInterval(interval)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return

    const fetchProposalData = async () => {
      try {
        const proposals = await getProposals()
        const found = proposals.find((p) => p.id === proposalId.toString())

        if (found) {
          setProposal(found)

          // Get status
          const proposalStatus = await getProposalStatus(found)
          setStatus(proposalStatus)

          // Map status to state number
          const statusMap: Record<string, number> = {
            PENDING: 0,
            ACTIVE: 1,
            CANCELLED: 2,
            CANCELED: 2,
            DEFEATED: 3,
            SUCCEEDED: 4,
            QUEUED: 5,
            EXPIRED: 6,
            EXECUTED: 7,
            VETOED: 8,
            ENDED: 7,
          }
          const stateNum = statusMap[proposalStatus] ?? 0
          const stateName = PROPOSAL_STATE_NAMES[stateNum] || "Pending"

          // Get votes
          const proposalVotes = await getProposalVotes(proposalId.toString())
          setVotes(proposalVotes)

          setProposalData({
            id: proposalId,
            proposer: found.proposer as `0x${string}`,
            sponsors: [],
            forVotes: proposalVotes.forVotes,
            againstVotes: proposalVotes.againstVotes,
            abstainVotes: proposalVotes.abstainVotes,
            state: stateNum,
            stateName: stateName,
            quorum: BigInt(72),
            description: found.title,
            fullDescription: found.description,
            startBlock: found.startBlock,
            endBlock: found.endBlock,
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

// Hook to fetch all candidates
export function useLilNounsCandidateIds(limit = 20) {
  const [candidates, setCandidates] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchCandidatesData = async () => {
      try {
        const allCandidates = await getCandidates()
        setTotalCount(allCandidates.length)

        // Transform to match expected format
        const candidatesWithNumber = allCandidates.slice(0, limit).map((c, index) => ({
          id: c.slug,
          slug: c.slug,
          proposer: c.proposer,
          createdTimestamp: Number(c.createdBlock),
          candidateNumber: allCandidates.length - index,
          title: c.title,
          description: c.description,
          latestVersion: {
            content: {
              title: c.title,
              description: c.description,
            },
          },
        }))
        setCandidates(candidatesWithNumber)
      } catch (error) {
        console.error("Error fetching Lil Nouns candidates:", error)
        setCandidates([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCandidatesData()
  }, [mounted, limit])

  return { candidates, totalCount, isLoading }
}

// Hook to fetch a single candidate
export function useLilNounsCandidateData(candidateId: string) {
  const [mounted, setMounted] = useState(false)
  const [candidateData, setCandidateData] = useState({
    id: candidateId,
    slug: "",
    proposer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    sponsors: [] as Array<{
      sponsor: `0x${string}`
      reason: string
      createdBlock: bigint
      createdTimestamp: bigint
      expirationTimestamp: bigint
      canceled: boolean
    }>,
    description: `Candidate ${candidateId}`,
    fullDescription: "",
    createdTimestamp: 0,
    transactionHash: "",
    targets: [] as string[],
    values: [] as string[],
    signatures: [] as string[],
    calldatas: [] as string[],
    canceled: false,
    isLoading: true,
    error: false,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchCandidateData = async () => {
      try {
        const candidate = await getCandidateBySlug(decodeURIComponent(candidateId))

        if (candidate) {
          setCandidateData({
            id: candidateId,
            slug: candidate.slug,
            proposer: candidate.proposer as `0x${string}`,
            sponsors: [],
            description: candidate.title,
            fullDescription: candidate.description,
            createdTimestamp: Number(candidate.createdBlock),
            transactionHash: "",
            targets: candidate.targets,
            values: [],
            signatures: [],
            calldatas: [],
            canceled: false,
            isLoading: false,
            error: false,
          })
        } else {
          setCandidateData((prev) => ({ ...prev, isLoading: false, error: true }))
        }
      } catch (error) {
        console.error("Error fetching Lil Nouns candidate:", error)
        setCandidateData((prev) => ({ ...prev, isLoading: false, error: true }))
      }
    }

    fetchCandidateData()
  }, [candidateId, mounted])

  return candidateData
}

// Hook for proposal feedback (not available on-chain for Lil Nouns, return empty)
export function useLilNounsProposalFeedback(proposalId: number) {
  return { feedback: [], isLoading: false }
}

// Hook to fetch votes for a proposal
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
        // Get vote counts from on-chain
        const voteCounts = await getProposalVotes(proposalId.toString())

        // Return aggregated votes (individual votes would require more complex event parsing)
        const votesList = [
          {
            voter: "aggregate",
            support: 1,
            supportLabel: "For",
            votes: Number(voteCounts.forVotes),
            reason: "",
            blockNumber: 0,
          },
          {
            voter: "aggregate",
            support: 0,
            supportLabel: "Against",
            votes: Number(voteCounts.againstVotes),
            reason: "",
            blockNumber: 0,
          },
          {
            voter: "aggregate",
            support: 2,
            supportLabel: "Abstain",
            votes: Number(voteCounts.abstainVotes),
            reason: "",
            blockNumber: 0,
          },
        ]
        setVotes(votesList)
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

// Hook for candidate feedback (not available on-chain, return empty)
export function useLilNounsCandidateFeedback(slug: string) {
  return { feedback: [], isLoading: false }
}
