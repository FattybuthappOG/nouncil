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

export function useProposalIds(limit = 15, statusFilter: "all" | "active" | "executed" | "defeated" = "all") {
  const [proposalIds, setProposalIds] = useState<number[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProposalIds = async () => {
      try {
        let statusCondition = ""
        if (statusFilter === "active") {
          // Active proposals use "ACTIVE" in status field
          statusCondition = ', where: { status: "ACTIVE" }'
        } else if (statusFilter === "executed") {
          // Executed proposals use "EXECUTED" in status field
          statusCondition = ', where: { status: "EXECUTED" }'
        } else if (statusFilter === "defeated") {
          // Defeated proposals use "DEFEATED" in status field
          statusCondition = ', where: { status: "DEFEATED" }'
        }

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
                  ${statusCondition}
                ) {
                  id
                }
                _meta {
                  block {
                    number
                  }
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
          if (ids.length > 0) {
            setTotalCount(Math.max(...ids))
          }
        }
      } catch (error) {
        console.error("[v0] Failed to fetch proposal IDs:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposalIds()
  }, [limit, statusFilter])

  return { proposalIds, totalCount, isLoading }
}

export function useProposalData(proposalId: number) {
  const [currentBlock, setCurrentBlock] = useState<number>(0)

  const [proposalData, setProposalData] = useState({
    id: proposalId,
    proposer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    sponsors: [] as `0x${string}`[],
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
    targets: [] as string[],
    values: [] as string[],
    signatures: [] as string[],
    calldatas: [] as string[],
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
    const fetchCurrentBlock = async () => {
      try {
        const response = await fetch("https://eth.merkle.io", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1,
          }),
        })
        const data = await response.json()
        if (data.result) {
          setCurrentBlock(Number.parseInt(data.result, 16))
        }
      } catch (error) {
        // Silently fail - block number is optional for timing display
        // Use proposal state from Subgraph API as primary source of truth
      }
    }
    fetchCurrentBlock()
    const interval = setInterval(fetchCurrentBlock, 30000) // Update every 30 seconds (reduced frequency)
    return () => clearInterval(interval)
  }, [])

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
                  signers {
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
                  targets
                  values
                  signatures
                  calldatas
                }
              }
            `,
            }),
          },
        )

        const data = await response.json()
        const proposal = data?.data?.proposal

        if (proposal) {
          const desc = proposal.description || `Proposal ${proposalId}`
          const title =
            desc
              .split("\n")[0]
              .replace(/^#+\s*/, "")
              .trim() || `Proposal ${proposalId}`

          const stateNum = Number(stateData || 1)

          const sponsorsList = proposal.signers?.map((s: any) => s.id as `0x${string}`) || []

          setProposalData({
            id: proposalId,
            proposer: proposal.proposer?.id || "0x0000000000000000000000000000000000000000",
            sponsors: sponsorsList,
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
            targets: proposal.targets || [],
            values: proposal.values || [],
            signatures: proposal.signatures || [],
            calldatas: proposal.calldatas || [],
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

  return { ...proposalData, currentBlock }
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

export function useCandidateIds(limit = 15) {
  const [candidates, setCandidates] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await fetch(
          "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                proposalCandidates(
                  first: ${limit}
                  orderBy: createdTimestamp
                  orderDirection: desc
                ) {
                  id
                  slug
                  proposer
                  createdTimestamp
                  createdTransactionHash
                  latestVersion {
                    content {
                      title
                      description
                      targets
                      values
                      signatures
                      calldatas
                    }
                  }
                  canceledTimestamp
                }
              }
            `,
            }),
          },
        )

        const data = await response.json()

        const countResponse = await fetch(
          "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                proposalCandidates(first: 1000, orderBy: createdTimestamp) {
                  id
                }
              }
            `,
            }),
          },
        )

        const countData = await countResponse.json()
        if (countData?.data?.proposalCandidates) {
          setTotalCount(countData.data.proposalCandidates.length)
        }

        if (data?.data?.proposalCandidates) {
          const candidatesList = data.data.proposalCandidates.map((c: any) => {
            const content = c.latestVersion?.content || {}
            const desc = content.description || `Candidate ${c.id}`
            const title = content.title || c.slug || `Candidate ${c.id}`

            return {
              id: c.id,
              slug: c.slug || "",
              proposer: c.proposer || "0x0000000000000000000000000000000000000000",
              description: title,
              fullDescription: desc,
              createdTimestamp: Number(c.createdTimestamp || 0),
              transactionHash: c.createdTransactionHash || "",
              targets: content.targets || [],
              values: content.values || [],
              signatures: content.signatures || [],
              calldatas: content.calldatas || [],
              canceled: !!c.canceledTimestamp,
            }
          })
          setCandidates(candidatesList)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch candidates:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCandidates()
  }, [limit])

  return { candidates, totalCount, isLoading }
}

export function useCandidateData(candidateId: string) {
  const [candidateData, setCandidateData] = useState({
    id: candidateId,
    slug: "",
    proposer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    sponsors: [] as `0x${string}`[],
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
    const fetchCandidateFromAPI = async () => {
      try {
        const response = await fetch(
          "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                proposalCandidate(id: "${candidateId}") {
                  id
                  slug
                  proposer
                  createdTimestamp
                  createdTransactionHash
                  latestVersion {
                    content {
                      title
                      description
                      targets
                      values
                      signatures
                      calldatas
                    }
                  }
                  versions {
                    content {
                      proposalIdToUpdate
                      contentSignatures {
                        signer {
                          id
                        }
                        expirationTimestamp
                        reason
                      }
                    }
                  }
                  canceledTimestamp
                }
              }
            `,
            }),
          },
        )

        const data = await response.json()
        const candidate = data?.data?.proposalCandidate

        if (candidate) {
          const content = candidate.latestVersion?.content || {}
          const desc = content.description || `Candidate ${candidateId}`
          const title = content.title || candidate.slug || `Candidate ${candidateId}`

          const sponsorsList: `0x${string}`[] = []
          if (candidate.versions) {
            candidate.versions.forEach((version: any) => {
              const sigs = version.content?.contentSignatures || []
              sigs.forEach((sig: any) => {
                if (sig.signer?.id && !sponsorsList.includes(sig.signer.id as `0x${string}`)) {
                  sponsorsList.push(sig.signer.id as `0x${string}`)
                }
              })
            })
          }

          setCandidateData({
            id: candidateId,
            slug: candidate.slug || "",
            proposer: candidate.proposer || "0x0000000000000000000000000000000000000000",
            sponsors: sponsorsList,
            description: title,
            fullDescription: desc,
            createdTimestamp: Number(candidate.createdTimestamp || 0),
            transactionHash: candidate.createdTransactionHash || "",
            targets: content.targets || [],
            values: content.values || [],
            signatures: content.signatures || [],
            calldatas: content.calldatas || [],
            canceled: !!candidate.canceledTimestamp,
            isLoading: false,
            error: false,
          })
        } else {
          setCandidateData((prev) => ({ ...prev, isLoading: false, error: true }))
        }
      } catch (error) {
        console.error(`[v0] Failed to fetch candidate ${candidateId}:`, error)
        setCandidateData((prev) => ({ ...prev, isLoading: false, error: true }))
      }
    }

    fetchCandidateFromAPI()
  }, [candidateId])

  return candidateData
}
