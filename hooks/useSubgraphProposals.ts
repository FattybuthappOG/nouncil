import { useState, useEffect } from "react"

// Nouns subgraph endpoint
const NOUNS_SUBGRAPH_URL = "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn"

export interface SubgraphProposal {
  endBlock: number
  description: string
  clientId: number
  id: string
  startBlock?: number
  createdTimestamp?: number
  proposer?: string
  status?: string
  forVotes?: string
  againstVotes?: string
  abstainVotes?: string
  totalVotes?: string
}

// GraphQL query for proposals with more details
const PROPOSALS_QUERY = `
  query GetProposals($first: Int!, $skip: Int!) {
    proposals(
      orderBy: endBlock, 
      orderDirection: desc, 
      first: $first, 
      skip: $skip
    ) {
      id
      endBlock
      startBlock
      description
      clientId
      createdTimestamp
      proposer
      status
      forVotes
      againstVotes
      abstainVotes
      totalVotes
    }
  }
`

export function useSubgraphProposals(first: number = 20, skip: number = 0) {
  const [proposals, setProposals] = useState<SubgraphProposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProposals = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(NOUNS_SUBGRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: PROPOSALS_QUERY,
          variables: {
            first,
            skip,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
      }

      setProposals(data.data.proposals || [])
    } catch (err) {
      console.error('Error fetching subgraph proposals:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch proposals from subgraph')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProposals()
  }, [first, skip])

  const refetch = () => {
    fetchProposals()
  }

  return {
    proposals,
    isLoading,
    error,
    refetch,
  }
}

// Helper function to get proposal title from description
export function getProposalTitle(description: string): string {
  // Extract title from description (usually first line)
  const lines = description.split('\n')
  const firstLine = lines[0]?.trim()
  
  if (firstLine && firstLine.length > 0) {
    return firstLine
  }
  
  return "Untitled Proposal"
}

// Helper function to format proposal description
export function formatProposalDescription(description: string): string {
  // Remove the title line and return the rest
  const lines = description.split('\n')
  const contentLines = lines.slice(1).filter(line => line.trim().length > 0)
  
  if (contentLines.length === 0) {
    return "No description available"
  }
  
  return contentLines.join('\n').trim()
} 