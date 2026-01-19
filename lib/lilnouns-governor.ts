"use client"

import { getClient } from "./lilnouns-ethClient"

// Lil Nouns Governor Contract
const LILNOUNS_GOVERNOR = "0x5d2C31ce16924C2a71D317e5BbFd5ce387854039" as const

// Governor ABI - only the functions we need
const GOVERNOR_ABI = [
  {
    inputs: [],
    name: "proposalCount",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "proposalId", type: "uint256" }],
    name: "proposals",
    outputs: [
      { name: "id", type: "uint256" },
      { name: "proposer", type: "address" },
      { name: "proposalThreshold", type: "uint256" },
      { name: "quorumVotes", type: "uint256" },
      { name: "eta", type: "uint256" },
      { name: "startBlock", type: "uint256" },
      { name: "endBlock", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "againstVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
      { name: "canceled", type: "bool" },
      { name: "vetoed", type: "bool" },
      { name: "executed", type: "bool" },
      { name: "totalSupply", type: "uint256" },
      { name: "creationBlock", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "proposalId", type: "uint256" }],
    name: "state",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// Proposal states from the contract
const PROPOSAL_STATES = [
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

export interface LilNounsProposal {
  id: number
  proposer: string
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  quorumVotes: bigint
  startBlock: bigint
  endBlock: bigint
  eta: bigint
  canceled: boolean
  vetoed: boolean
  executed: boolean
  state: string
  stateNumber: number
  creationBlock: bigint
}

export type Proposal = {
  id: string
  proposer: string
  startBlock: bigint
  endBlock: bigint
  description: string
  title: string
  createdBlock: bigint
}

export type VoteCounts = {
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
}

// Get total proposal count
export async function getProposalCount(): Promise<number> {
  const client = getClient()
  
  try {
    const count = await client.readContract({
      address: LILNOUNS_GOVERNOR,
      abi: GOVERNOR_ABI,
      functionName: "proposalCount",
    })
    return Number(count)
  } catch (error) {
    console.error("Error getting proposal count:", error)
    return 0
  }
}

// Get a single proposal by ID with full data
export async function getProposalData(proposalId: number): Promise<LilNounsProposal | null> {
  const client = getClient()
  
  try {
    const [proposalData, stateNumber] = await Promise.all([
      client.readContract({
        address: LILNOUNS_GOVERNOR,
        abi: GOVERNOR_ABI,
        functionName: "proposals",
        args: [BigInt(proposalId)],
      }),
      client.readContract({
        address: LILNOUNS_GOVERNOR,
        abi: GOVERNOR_ABI,
        functionName: "state",
        args: [BigInt(proposalId)],
      }),
    ])
    
    return {
      id: Number(proposalData[0]),
      proposer: proposalData[1],
      quorumVotes: proposalData[3],
      eta: proposalData[4],
      startBlock: proposalData[5],
      endBlock: proposalData[6],
      forVotes: proposalData[7],
      againstVotes: proposalData[8],
      abstainVotes: proposalData[9],
      canceled: proposalData[10],
      vetoed: proposalData[11],
      executed: proposalData[12],
      creationBlock: proposalData[14],
      state: PROPOSAL_STATES[stateNumber] || "Unknown",
      stateNumber: stateNumber,
    }
  } catch (error) {
    console.error(`Error getting proposal ${proposalId}:`, error)
    return null
  }
}

// Get proposals in the old format for compatibility
export async function getProposals(): Promise<Proposal[]> {
  const count = await getProposalCount()
  if (count === 0) return []
  
  const proposals: Proposal[] = []
  
  // Fetch proposals in parallel batches of 5
  const batchSize = 5
  for (let i = count; i >= 1; i -= batchSize) {
    const batch = []
    for (let j = 0; j < batchSize && (i - j) >= 1; j++) {
      batch.push(getProposalData(i - j))
    }
    
    const results = await Promise.all(batch)
    for (const proposal of results) {
      if (proposal) {
        proposals.push({
          id: proposal.id.toString(),
          proposer: proposal.proposer,
          startBlock: proposal.startBlock,
          endBlock: proposal.endBlock,
          description: `Lil Nouns Proposal ${proposal.id}`,
          title: `Proposal ${proposal.id}`,
          createdBlock: proposal.creationBlock,
        })
      }
    }
    
    // Limit to first 50 for performance
    if (proposals.length >= 50) break
  }
  
  return proposals.sort((a, b) => Number(b.id) - Number(a.id))
}

// Get proposal IDs only (faster)
export async function getProposalIds(limit: number = 20): Promise<number[]> {
  const count = await getProposalCount()
  if (count === 0) return []
  
  const ids: number[] = []
  const startId = count
  const endId = Math.max(1, count - limit + 1)
  
  for (let i = startId; i >= endId; i--) {
    ids.push(i)
  }
  
  return ids
}

// Get vote counts for a proposal (reads directly from contract)
export async function getProposalVotes(proposalId: string): Promise<VoteCounts> {
  const proposal = await getProposalData(Number(proposalId))
  
  if (proposal) {
    return {
      forVotes: proposal.forVotes,
      againstVotes: proposal.againstVotes,
      abstainVotes: proposal.abstainVotes,
    }
  }
  
  return { forVotes: BigInt(0), againstVotes: BigInt(0), abstainVotes: BigInt(0) }
}

// Get proposal status
export async function getProposalStatus(proposal: Proposal): Promise<string> {
  const data = await getProposalData(Number(proposal.id))
  if (data) {
    return data.state.toUpperCase()
  }
  return "UNKNOWN"
}
