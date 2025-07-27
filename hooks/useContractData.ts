"use client"

import { useReadContract, useWatchContractEvent } from "wagmi"
import { CONTRACTS } from "../lib/contracts"
import { useState } from "react"
import { formatEther } from "viem"

export function useTreasuryData() {
  const { data: balance, isLoading: balanceLoading } = useReadContract({
    ...CONTRACTS.TREASURY,
    functionName: "balance",
  })

  const { data: owner, isLoading: ownerLoading } = useReadContract({
    ...CONTRACTS.TREASURY,
    functionName: "owner",
  })

  return {
    balance: balance ? formatEther(balance) : "0",
    owner,
    isLoading: balanceLoading || ownerLoading,
  }
}

export function useGovernorData() {
  const { data: proposalCount, isLoading: countLoading } = useReadContract({
    ...CONTRACTS.GOVERNOR,
    functionName: "proposalCount",
  })

  const { data: votingPeriod } = useReadContract({
    ...CONTRACTS.GOVERNOR,
    functionName: "votingPeriod",
  })

  const { data: proposalThreshold } = useReadContract({
    ...CONTRACTS.GOVERNOR,
    functionName: "proposalThreshold",
  })

  return {
    proposalCount: proposalCount ? Number(proposalCount) : 0,
    votingPeriod: votingPeriod ? Number(votingPeriod) : 0,
    proposalThreshold: proposalThreshold ? formatEther(proposalThreshold || 0n) : "0",
    isLoading: countLoading,
  }
}

export function useProposalData(proposalId: number) {
  const { data: proposal, isLoading } = useReadContract({
    ...CONTRACTS.GOVERNOR,
    functionName: "proposals",
    args: [BigInt(proposalId)],
  })

  const { data: state } = useReadContract({
    ...CONTRACTS.GOVERNOR,
    functionName: "state",
    args: [BigInt(proposalId)],
  })

  if (!proposal) {
    return { proposal: null, state: null, isLoading }
  }

  const [id, proposer, startTime, endTime, forVotes, againstVotes, canceled, executed] = proposal

  return {
    proposal: {
      id: Number(id),
      proposer,
      startTime: Number(startTime),
      endTime: Number(endTime),
      forVotes: formatEther(forVotes),
      againstVotes: formatEther(againstVotes),
      canceled,
      executed,
    },
    state: state ? Number(state) : null,
    isLoading,
  }
}

export function useUserVotingData(proposalId: number, userAddress?: `0x${string}`) {
  const { data: hasVoted } = useReadContract({
    ...CONTRACTS.GOVERNOR,
    functionName: "hasVoted",
    args: [BigInt(proposalId), userAddress!],
    query: {
      enabled: !!userAddress,
    },
  })

  const { data: votingPower } = useReadContract({
    ...CONTRACTS.GOVERNOR,
    functionName: "getVotes",
    args: [userAddress!, BigInt(Math.floor(Date.now() / 1000))], // Use current timestamp
    query: {
      enabled: !!userAddress,
    },
  })

  return {
    hasVoted: hasVoted || false,
    votingPower: votingPower ? formatEther(votingPower) : "0",
  }
}

export function useRealtimeEvents() {
  const [recentVotes, setRecentVotes] = useState<any[]>([])
  const [recentProposals, setRecentProposals] = useState<any[]>([])

  // Watch for new votes
  useWatchContractEvent({
    ...CONTRACTS.GOVERNOR,
    eventName: "VoteCast",
    onLogs(logs) {
      const newVotes = logs.map((log) => ({
        voter: log.args.voter,
        proposalId: Number(log.args.proposalId),
        support: Number(log.args.support),
        weight: formatEther(log.args.weight || 0n),
        reason: log.args.reason,
        timestamp: Date.now(),
      }))
      setRecentVotes((prev) => [...newVotes, ...prev].slice(0, 50))
    },
  })

  // Watch for new proposals
  useWatchContractEvent({
    ...CONTRACTS.GOVERNOR,
    eventName: "ProposalCreated",
    onLogs(logs) {
      const newProposals = logs.map((log) => ({
        proposalId: Number(log.args.proposalId),
        proposer: log.args.proposer,
        description: log.args.description,
        startBlock: Number(log.args.startBlock),
        endBlock: Number(log.args.endBlock),
        timestamp: Date.now(),
      }))
      setRecentProposals((prev) => [...newProposals, ...prev].slice(0, 20))
    },
  })

  return {
    recentVotes,
    recentProposals,
  }
}

export function useProposal22Data() {
  const { data: proposal, isLoading } = useReadContract({
    ...CONTRACTS.GOVERNOR,
    functionName: "proposals",
    args: [BigInt(22)],
  })

  const { data: state } = useReadContract({
    ...CONTRACTS.GOVERNOR,
    functionName: "state",
    args: [BigInt(22)],
  })

  if (!proposal) {
    return { proposal: null, state: null, isLoading }
  }

  const [id, proposer, startTime, endTime, forVotes, againstVotes, canceled, executed] = proposal

  return {
    proposal: {
      id: 22,
      proposer,
      startTime: Number(startTime),
      endTime: Number(endTime),
      forVotes: formatEther(forVotes),
      againstVotes: formatEther(againstVotes),
      canceled,
      executed,
    },
    state: state ? Number(state) : null,
    isLoading,
  }
}
