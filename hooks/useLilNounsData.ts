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

const LILNOUNS_GOVERNOR = "0x5d2C31ce16924C2a71D317e5BbFd5ce387854039"
const RPC_URLS = [
  "https://eth.llamarpc.com",
  "https://cloudflare-eth.com",
  "https://rpc.ankr.com/eth",
  "https://eth.public-rpc.com",
]

// Helper: find a working RPC
async function getWorkingRpc(): Promise<string> {
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
      })
      if (res.ok) return url
    } catch { continue }
  }
  return RPC_URLS[0]
}

// Helper: make an eth_call
async function ethCall(rpcUrl: string, to: string, data: string): Promise<string> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to, data }, "latest"],
      id: 1,
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.result as string
}

// Direct contract fallback: fetch proposal IDs
async function fetchLilNounsIdsFromContract(limit: number): Promise<{ ids: number[]; total: number }> {
  const rpc = await getWorkingRpc()
  const countResult = await ethCall(rpc, LILNOUNS_GOVERNOR, "0xda35c664") // proposalCount()
  const totalCount = Number.parseInt(countResult, 16)
  if (totalCount === 0) return { ids: [], total: 0 }

  const ids: number[] = []
  for (let i = totalCount; i >= 1 && ids.length < limit; i--) {
    ids.push(i)
  }
  return { ids, total: totalCount }
}

// Direct contract fallback: fetch single proposal data
async function fetchLilNounsProposalFromContract(proposalId: number) {
  const rpc = await getWorkingRpc()
  const paddedId = proposalId.toString(16).padStart(64, "0")

  // proposals(uint256) = 0x013cf08b
  // state(uint256) = 0x3e4f49e6
  const [proposalResult, stateResult] = await Promise.all([
    ethCall(rpc, LILNOUNS_GOVERNOR, "0x013cf08b" + paddedId),
    ethCall(rpc, LILNOUNS_GOVERNOR, "0x3e4f49e6" + paddedId),
  ])

  const hex = proposalResult.slice(2)
  const decode = (offset: number) => hex.slice(offset * 64, (offset + 1) * 64)
  const decodeAddr = (offset: number) => "0x" + decode(offset).slice(24)
  const decodeBigInt = (offset: number) => BigInt("0x" + decode(offset))

  const stateNum = Number.parseInt(stateResult, 16)

  return {
    id: proposalId,
    proposer: decodeAddr(1),
    quorumVotes: decodeBigInt(3).toString(),
    startBlock: decodeBigInt(5).toString(),
    endBlock: decodeBigInt(6).toString(),
    forVotes: decodeBigInt(7).toString(),
    againstVotes: decodeBigInt(8).toString(),
    abstainVotes: decodeBigInt(9).toString(),
    state: PROPOSAL_STATE_NAMES[stateNum] || "Unknown",
    stateNumber: stateNum,
    description: `Lil Nouns Proposal ${proposalId}`,
  }
}

// Hook to fetch all Lil Nouns proposal IDs using API route with contract fallback
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
        
        if (!response.ok) {
          throw new Error(`API route failed: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.proposals && data.proposals.length > 0) {
          const ids = data.proposals.map((p: any) => p.id)
          setProposalIds(ids)
          setTotalCount(data.totalCount || ids.length)
        } else if (data.error) {
          throw new Error(data.error)
        } else {
          throw new Error("No proposals returned from API")
        }
      } catch (error) {
        console.error("API route failed, falling back to direct contract:", error)
        try {
          const result = await fetchLilNounsIdsFromContract(limit)
          setProposalIds(result.ids)
          setTotalCount(result.total)
        } catch (fallbackError) {
          console.error("Contract fallback also failed:", fallbackError)
          setProposalIds([])
          setTotalCount(0)
        }
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
      let proposal: any = null
      
      // Try API route first
      try {
        const response = await fetch(`/api/lilnouns/proposals?id=${proposalId}`)
        if (!response.ok) throw new Error(`API route failed: ${response.status}`)
        proposal = await response.json()
        if (!proposal || !proposal.id) throw new Error("No proposal data from API")
      } catch (apiError) {
        console.error("API route failed, falling back to contract:", apiError)
        // Fallback: fetch directly from contract
        try {
          proposal = await fetchLilNounsProposalFromContract(proposalId)
        } catch (contractError) {
          console.error("Contract fallback also failed:", contractError)
          setProposalData((prev) => ({ ...prev, isLoading: false, error: true }))
          return
        }
      }

      if (proposal && proposal.id) {
        setProposalData({
          id: proposalId,
          proposer: (proposal.proposer || "0x0000000000000000000000000000000000000000") as `0x${string}`,
          sponsors: [],
          forVotes: BigInt(proposal.forVotes || 0),
          againstVotes: BigInt(proposal.againstVotes || 0),
          abstainVotes: BigInt(proposal.abstainVotes || 0),
          state: proposal.stateNumber ?? 0,
          stateName: proposal.state || "Unknown",
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
      let proposal: any = null
      
      // Try API route first
      try {
        const response = await fetch(`/api/lilnouns/proposals?id=${proposalId}`)
        if (!response.ok) throw new Error(`API failed: ${response.status}`)
        proposal = await response.json()
        if (!proposal || proposal.error) throw new Error("No data from API")
      } catch (apiError) {
        // Fallback to contract
        try {
          proposal = await fetchLilNounsProposalFromContract(proposalId)
        } catch (contractError) {
          console.error("Both API and contract failed for votes:", contractError)
        }
      }

      if (proposal) {
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
      setIsLoading(false)
    }

    fetchVotesData()
  }, [mounted, proposalId])

  return { votes, isLoading }
}

// Hook for candidate feedback (not available on-chain)
export function useLilNounsCandidateFeedback(slug: string) {
  return { feedback: [], isLoading: false }
}
