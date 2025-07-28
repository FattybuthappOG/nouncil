"use client"

import { useReadContract, useWatchContractEvent } from "wagmi"
import { useState } from "react"
import { GOVERNOR_CONTRACT, TREASURY_CONTRACT } from "@/lib/contracts"

// Governor contract hooks
export function useGovernorData() {
  const { data: proposalCount, isLoading: proposalCountLoading } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    functionName: "proposalCount",
  })

  const { data: votingPeriod, isLoading: votingPeriodLoading } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    functionName: "votingPeriod",
  })

  const { data: proposalThreshold, isLoading: proposalThresholdLoading } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    functionName: "proposalThreshold",
  })

  return {
    proposalCount: Number(proposalCount || 0),
    votingPeriod: Number(votingPeriod || 0),
    proposalThreshold: proposalThreshold?.toString() || "0",
    isLoading: proposalCountLoading || votingPeriodLoading || proposalThresholdLoading,
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

// Real-time events hook
export function useRealtimeEvents() {
  const [recentVotes, setRecentVotes] = useState([
    {
      voter: "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
      proposalId: 22,
      support: 1,
      weight: "125,000",
      reason: "This proposal will improve governance efficiency",
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    },
    {
      voter: "0x8ba1f109551bD432803012645Hac136c22C501e",
      proposalId: 21,
      support: 0,
      weight: "98,000",
      reason: "Need more discussion on treasury allocation",
      timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
    },
    {
      voter: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      proposalId: 22,
      support: 1,
      weight: "75,000",
      reason: "",
      timestamp: Date.now() - 8 * 60 * 60 * 1000, // 8 hours ago
    },
  ])

  const [recentProposals, setRecentProposals] = useState([
    {
      proposalId: 22,
      proposer: "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
      description:
        "Nouncil Client: Approve ID 22 - Implement new governance features for better community participation",
      timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
    },
    {
      proposalId: 21,
      proposer: "0x8ba1f109551bD432803012645Hac136c22C501e",
      description: "Treasury Management Update - Restructure asset allocation and implement new investment strategies",
      timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    },
  ])

  // Watch for new vote events
  useWatchContractEvent({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    eventName: "VoteCast",
    onLogs(logs) {
      logs.forEach((log) => {
        const newVote = {
          voter: log.args.voter,
          proposalId: Number(log.args.proposalId),
          support: Number(log.args.support),
          weight: log.args.weight?.toString() || "0",
          reason: log.args.reason || "",
          timestamp: Date.now(),
        }
        setRecentVotes((prev) => [newVote, ...prev.slice(0, 9)])
      })
    },
  })

  // Watch for new proposal events
  useWatchContractEvent({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    eventName: "ProposalCreated",
    onLogs(logs) {
      logs.forEach((log) => {
        const newProposal = {
          proposalId: Number(log.args.proposalId),
          proposer: log.args.proposer,
          description: log.args.description || "",
          timestamp: Date.now(),
        }
        setRecentProposals((prev) => [newProposal, ...prev.slice(0, 4)])
      })
    },
  })

  return {
    recentVotes,
    recentProposals,
  }
}
