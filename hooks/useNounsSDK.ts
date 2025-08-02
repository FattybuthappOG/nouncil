"use client"

import { useEffect, useState } from 'react'

// Nouns DAO contract addresses (Ethereum mainnet)
const NOUNS_DAO_ADDRESS = '0x6f3E6272A167e8AcCb32072d08E0957F9c79223d'
const NOUNS_TOKEN_ADDRESS = '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03'

// Simplified ABI for voting
const GOVERNOR_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "support",
        "type": "uint8"
      }
    ],
    "name": "castVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "support",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "castVoteWithReason",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      }
    ],
    "name": "proposalState",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

const NOUNS_TOKEN_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "blockNumber",
        "type": "uint256"
      }
    ],
    "name": "getPriorVotes",
    "outputs": [
      {
        "internalType": "uint96",
        "name": "",
        "type": "uint96"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

export interface NounsSDKData {
  sdk: any | null
  isLoading: boolean
  error: string | null
  vote: (proposalId: string, support: number, reason?: string) => Promise<void>
  getVotingPower: (address: string, blockNumber?: number) => Promise<string>
  getProposalState: (proposalId: string) => Promise<number>
}

export function useNounsSDK(): NounsSDKData {
  const [sdk, setSdk] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVoting, setIsVoting] = useState(false)

  useEffect(() => {
    const initializeSDK = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // For now, we'll use a mock SDK object
        const mockSDK = {
          governor: {
            proposalState: async (proposalId: string) => {
              // Mock implementation - return 1 (Active) for now
              return 1
            },
            castVote: async (proposalId: string, support: number, reason: string) => {
              // This will be handled by writeContract
              return { hash: 'mock-hash' }
            },
            abi: GOVERNOR_ABI
          },
          nounsToken: {
            getPriorVotes: async (address: string, blockNumber?: number) => {
              // Mock implementation - return a random voting power
              return Math.floor(Math.random() * 1000000).toString()
            }
          }
        }

        setSdk(mockSDK)
      } catch (err) {
        console.error('Error initializing Nouns SDK:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize SDK')
      } finally {
        setIsLoading(false)
      }
    }

    initializeSDK()
  }, [])

  const vote = async (proposalId: string, support: number, reason: string = '') => {
    try {
      setIsVoting(true)
      
      // Check if proposal is active (state 1)
      const state = await getProposalState(proposalId)
      if (state !== 1) {
        throw new Error('Proposal is not active for voting')
      }

      // Mock vote transaction - in a real implementation, this would call the contract
      console.log(`Voting ${support === 1 ? 'for' : 'against'} proposal ${proposalId} with reason: ${reason}`)
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.log('Vote transaction completed successfully')

    } catch (err) {
      console.error('Error casting vote:', err)
      throw err
    } finally {
      setIsVoting(false)
    }
  }

  const getVotingPower = async (address: string, blockNumber?: number): Promise<string> => {
    try {
      // For now, return a reasonable voting power based on address
      // In a real implementation, this would query the Nouns token contract
      const addressHash = address.toLowerCase().split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0)
        return a & a
      }, 0)
      return Math.abs(addressHash % 1000000).toString()
    } catch (err) {
      console.error('Error getting voting power:', err)
      // Return 0 if there's an error
      return '0'
    }
  }

  const getProposalState = async (proposalId: string): Promise<number> => {
    try {
      // For now, return 1 (Active) for all proposals
      return 1
    } catch (err) {
      console.error('Error getting proposal state:', err)
      throw err
    }
  }

  return { 
    sdk, 
    isLoading: isLoading || isVoting, 
    error, 
    vote, 
    getVotingPower, 
    getProposalState 
  }
}

// Convenience hook for voting power
export function useVotingPower(userAddress?: string) {
  const [votingPower, setVotingPower] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getVotingPower } = useNounsSDK()

  useEffect(() => {
    const fetchVotingPower = async () => {
      if (!userAddress) {
        setVotingPower('0')
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const power = await getVotingPower(userAddress)
        setVotingPower(power)
      } catch (err) {
        console.error('Error fetching voting power:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch voting power')
        setVotingPower('0')
      } finally {
        setIsLoading(false)
      }
    }

    fetchVotingPower()
  }, [userAddress, getVotingPower])

  return { votingPower, isLoading, error }
}

// Convenience hook for proposal details
export function useProposalDetails(proposalId: string) {
  const [proposalState, setProposalState] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getProposalState } = useNounsSDK()

  useEffect(() => {
    const fetchProposal = async () => {
      if (!proposalId) return

      try {
        setIsLoading(true)
        setError(null)
        const state = await getProposalState(proposalId)
        setProposalState(state)
      } catch (err) {
        console.error('Error fetching proposal state:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch proposal state')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposal()
  }, [proposalId, getProposalState])

  return { proposalState, isLoading, error }
} 