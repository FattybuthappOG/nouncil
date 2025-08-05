import { useState, useEffect } from "react"
import { useReadContract, useReadContracts } from "wagmi"
import { GOVERNOR_CONTRACT } from "@/lib/contracts"

// Nouns subgraph endpoint
const NOUNS_SUBGRAPH_URL = "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn"

export interface ProposalData {
  id: number
  state: number
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  deadline: bigint
  hasVoted: boolean
  totalVotes: bigint
  description?: string
  clientId?: number
  endBlock?: number
}

export interface SubgraphProposal {
  endBlock: number
  description: string
  clientId: number
  id: string
}

// GraphQL query for proposals
const PROPOSALS_QUERY = `
  query GetProposals {
    proposals(orderBy: endBlock, orderDirection: desc, first: 20) {
      endBlock
      description
      clientId
      id
    }
  }
`

export function useProposalData(proposalId: number, userAddress?: string) {
  const [proposalData, setProposalData] = useState<ProposalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subgraphProposals, setSubgraphProposals] = useState<SubgraphProposal[]>([])

  // Fetch proposals from subgraph
  const fetchSubgraphProposals = async () => {
    try {
      const response = await fetch(NOUNS_SUBGRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: PROPOSALS_QUERY,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
      }

      setSubgraphProposals(data.data.proposals || [])
    } catch (err) {
      console.error('Error fetching subgraph proposals:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch proposals from subgraph')
    }
  }

  // Read contract data for specific proposal
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

  // Fetch subgraph data on component mount
  useEffect(() => {
    fetchSubgraphProposals()
  }, [])

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

        // Find matching subgraph proposal
        const subgraphProposal = subgraphProposals.find(p => p.id === proposalId.toString())

        setProposalData({
          id: proposalId,
          state: state || 0,
          forVotes,
          againstVotes,
          abstainVotes,
          deadline: deadline || BigInt(0),
          hasVoted,
          totalVotes,
          description: subgraphProposal?.description,
          clientId: subgraphProposal?.clientId,
          endBlock: subgraphProposal?.endBlock,
        })
      }
    }

    setIsLoading(false)
  }, [contractData, contractLoading, contractError, proposalId, userAddress, subgraphProposals])

  return {
    proposalData,
    isLoading,
    error,
    subgraphProposals,
    refetch: () => {
      fetchSubgraphProposals()
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