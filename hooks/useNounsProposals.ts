import { useState, useEffect } from 'react'

// TypeScript interfaces for type safety
export interface NounsVote {
  id: string
  voter: string
  support: number // 0 = against, 1 = for, 2 = abstain
  reason?: string
  weight: string
  blockNumber: number
  blockTimestamp: number
}

export interface NounsProposal {
  id: string
  title: string
  description: string
  status: string
  forVotes: string
  againstVotes: string
  abstainVotes: string
  totalVotes: string
  createdTimestamp: number
  createdBlock: number
  startBlock: number
  endBlock: number
  executionETA?: number
  votes: NounsVote[]
  proposer: string
  targets: string[]
  values: string[]
  signatures: string[]
  calldatas: string[]
}

// GraphQL endpoint for Nouns DAO subgraph
const endpoint = 'https://api.thegraph.com/subgraphs/name/nounsdao/nouns-subgraph'

// GraphQL queries
const PROPOSALS_QUERY = `
  query GetProposals($first: Int!, $skip: Int!) {
    proposals(
      first: $first
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
    ) {
      id
      title
      description
      status
      forVotes
      againstVotes
      abstainVotes
      totalVotes
      createdTimestamp
      createdBlock
      startBlock
      endBlock
      executionETA
      proposer
      targets
      values
      signatures
      calldatas
      votes {
        id
        voter
        support
        reason
        weight
        blockNumber
        blockTimestamp
      }
    }
  }
`

const SINGLE_PROPOSAL_QUERY = `
  query GetProposal($id: String!) {
    proposal(id: $id) {
      id
      title
      description
      status
      forVotes
      againstVotes
      abstainVotes
      totalVotes
      createdTimestamp
      createdBlock
      startBlock
      endBlock
      executionETA
      proposer
      targets
      values
      signatures
      calldatas
      votes {
        id
        voter
        support
        reason
        weight
        blockNumber
        blockTimestamp
      }
    }
  }
`

// Helper functions
export function getProposalStatus(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pending'
    case 'ACTIVE':
      return 'Active'
    case 'CANCELLED':
      return 'Cancelled'
    case 'DEFEATED':
      return 'Defeated'
    case 'SUCCEEDED':
      return 'Succeeded'
    case 'QUEUED':
      return 'Queued'
    case 'EXECUTED':
      return 'Executed'
    case 'EXPIRED':
      return 'Expired'
    default:
      return status
  }
}

export function getVoteSupport(support: number): string {
  switch (support) {
    case 0:
      return 'Against'
    case 1:
      return 'For'
    case 2:
      return 'Abstain'
    default:
      return 'Unknown'
  }
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Hook to fetch multiple proposals
export function useNounsProposals(first: number = 10, skip: number = 0) {
  const [proposals, setProposals] = useState<NounsProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch from GraphQL endpoint
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: PROPOSALS_QUERY,
            variables: { first, skip }
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.errors) {
          throw new Error(data.errors[0]?.message || 'GraphQL error')
        }

        setProposals(data.data?.proposals || [])
      } catch (err) {
        console.error('Error fetching proposals:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch proposals')
        setProposals([])
      } finally {
        setLoading(false)
      }
    }

    fetchProposals()
  }, [first, skip])

  return { proposals, loading, error }
}

// Hook to fetch a single proposal
export function useNounsProposal(proposalId: string) {
  const [proposal, setProposal] = useState<NounsProposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProposal = async () => {
      if (!proposalId) return
      
      try {
        setLoading(true)
        setError(null)
        
        // Fetch from GraphQL endpoint
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: SINGLE_PROPOSAL_QUERY,
            variables: { id: proposalId }
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.errors) {
          throw new Error(data.errors[0]?.message || 'GraphQL error')
        }

        setProposal(data.data?.proposal || null)
      } catch (err) {
        console.error('Error fetching proposal:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch proposal')
        setProposal(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProposal()
  }, [proposalId])

  return { proposal, loading, error }
} 