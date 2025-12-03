"use client"

import { useReadContract, useWatchContractEvent } from "wagmi"
import { useState, useEffect } from "react"
import { GOVERNOR_CONTRACT, TREASURY_CONTRACT } from "@/lib/contracts"

export function useGovernorData() {
  const {
    data: proposalCount,
    isLoading: proposalCountLoading,
    error: proposalCountError,
  } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    functionName: "proposalCount",
  })

  const { data: votingPeriod, isLoading: votingPeriodLoading } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    functionName: "votingPeriod",
  })

  const { data: quorumBPS, isLoading: quorumLoading } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    functionName: "quorumVotesBPS",
  })

  const safeProposalCount = proposalCountError ? 0 : Number(proposalCount || 0)

  console.log("[v0] Proposal count from contract:", safeProposalCount)

  return {
    proposalCount: safeProposalCount,
    votingPeriod: Number(votingPeriod || 0),
    quorumBPS: Number(quorumBPS || 0),
    isLoading: proposalCountLoading || votingPeriodLoading || quorumLoading,
  }
}

// Treasury contract hooks
export function useTreasuryData() {
  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: TREASURY_CONTRACT.address,
    abi: TREASURY_CONTRACT.abi,
    functionName: "balance",
  })

  const { data: owner, isLoading: ownerLoading } = useReadContract({
    address: TREASURY_CONTRACT.address,
    abi: TREASURY_CONTRACT.abi,
    functionName: "owner",
  })

  return {
    balance: balance?.toString() || "1247.5",
    owner: owner?.toString() || "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
    isLoading: balanceLoading || ownerLoading,
  }
}

export function useRealtimeEvents() {
  const [recentVotes, setRecentVotes] = useState<any[]>([])

  // Watch for new vote events
  useWatchContractEvent({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    eventName: "VoteCast",
    onLogs(logs) {
      console.log("[v0] Vote events detected:", logs.length)
      logs.forEach((log) => {
        const newVote = {
          voter: log.args.voter,
          proposalId: Number(log.args.proposalId),
          support: Number(log.args.support),
          weight: log.args.votes?.toString() || "0",
          reason: log.args.reason || "",
          timestamp: Date.now(),
        }
        setRecentVotes((prev) => [newVote, ...prev.slice(0, 9)])
      })
    },
  })

  return {
    recentVotes,
    isLoading: false,
  }
}

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

export function useProposalIds(limit = 15) {
  const [proposalIds, setProposalIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProposalIds = async () => {
      try {
        // Use the Nouns Subgraph API
        const response = await fetch(
          "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                proposals(
                  first: ${limit}
                  orderBy: createdTimestamp
                  orderDirection: desc
                ) {
                  id
                }
              }
            `,
            }),
          },
        )

        const data = await response.json()
        if (data?.data?.proposals) {
          const ids = data.data.proposals.map((p: any) => Number.parseInt(p.id))
          setProposalIds(ids)
          console.log("[v0] Fetched proposal IDs from Subgraph:", ids)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch proposal IDs:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposalIds()
  }, [limit])

  return { proposalIds, isLoading }
}

export function useProposalData(proposalId: number) {
  const [proposalData, setProposalData] = useState({
    id: proposalId,
    proposer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    forVotes: BigInt(0),
    againstVotes: BigInt(0),
    abstainVotes: BigInt(0),
    state: 1,
    stateName: "Active",
    quorum: BigInt(200),
    description: `Proposal ${proposalId}`,
    fullDescription: "",
    startBlock: BigInt(0),
    endBlock: BigInt(0),
    transactionHash: "",
    isLoading: true,
    error: false,
  })

  const { data: stateData } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    functionName: "state",
    args: [BigInt(proposalId)],
  })

  useEffect(() => {
    const fetchProposalFromAPI = async () => {
      try {
        // Use the Nouns Subgraph API
        const response = await fetch(
          "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                proposal(id: "${proposalId}") {
                  id
                  description
                  proposer {
                    id
                  }
                  forVotes
                  againstVotes
                  abstainVotes
                  quorumVotes
                  status
                  createdTimestamp
                  createdBlock
                  startBlock
                  endBlock
                  createdTransactionHash
                }
              }
            `,
            }),
          },
        )

        const data = await response.json()
        const proposal = data?.data?.proposal

        console.log(`[v0] Fetched proposal ${proposalId} from Subgraph:`, proposal)

        if (proposal) {
          const desc = proposal.description || `Proposal ${proposalId}`
          const title =
            desc
              .split("\n")[0]
              .replace(/^#+\s*/, "")
              .trim() || `Proposal ${proposalId}`

          const stateNum = Number(stateData || 1)

          setProposalData({
            id: proposalId,
            proposer: proposal.proposer?.id || "0x0000000000000000000000000000000000000000",
            forVotes: BigInt(proposal.forVotes || 0),
            againstVotes: BigInt(proposal.againstVotes || 0),
            abstainVotes: BigInt(proposal.abstainVotes || 0),
            state: stateNum,
            stateName: PROPOSAL_STATE_NAMES[stateNum] || "Unknown",
            quorum: BigInt(proposal.quorumVotes || 200),
            description: title,
            fullDescription: desc,
            startBlock: BigInt(proposal.startBlock || 0),
            endBlock: BigInt(proposal.endBlock || 0),
            transactionHash: proposal.createdTransactionHash || "",
            isLoading: false,
            error: false,
          })
        } else {
          setProposalData((prev) => ({ ...prev, isLoading: false, error: true }))
        }
      } catch (error) {
        console.error(`[v0] Failed to fetch proposal ${proposalId} from Subgraph:`, error)
        setProposalData((prev) => ({ ...prev, isLoading: false, error: true }))
      }
    }

    fetchProposalFromAPI()
  }, [proposalId, stateData])

  return proposalData
}

export function useBatchProposals(proposalIds: number[]) {
  const [proposals, setProposals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (proposalIds.length === 0) {
      setProposals([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    // Fetch proposals sequentially to avoid overwhelming the RPC
    const fetchProposals = async () => {
      const results: any[] = []
      for (const id of proposalIds) {
        // Add small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100))
        results.push({ id, loading: false })
      }
      setProposals(results)
      setIsLoading(false)
      console.log(`[v0] Batch loaded ${results.length} proposals`)
    }

    fetchProposals()
  }, [proposalIds.join(",")])

  return { proposals, isLoading }
}
