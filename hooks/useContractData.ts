"use client"

import { useReadContract, useWatchContractEvent } from "wagmi"
import { useState, useEffect } from "react"
import { GOVERNOR_CONTRACT, TREASURY_CONTRACT } from "@/lib/contracts"

// Governor contract hooks
export function useGovernorData() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    data: proposalCount,
    isLoading: proposalCountLoading,
    error: proposalCountError,
  } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    functionName: "proposalCount",
    query: { enabled: mounted },
  })

  const { data: votingPeriod, isLoading: votingPeriodLoading } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    functionName: "votingPeriod",
    query: { enabled: mounted },
  })

  const { data: quorumBPS, isLoading: quorumLoading } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    functionName: "quorumVotesBPS",
    query: { enabled: mounted },
  })

  const safeProposalCount = proposalCountError ? 0 : Number(proposalCount || 0)

  return {
    proposalCount: safeProposalCount,
    votingPeriod: Number(votingPeriod || 0),
    quorumBPS: Number(quorumBPS || 0),
    isLoading: !mounted || proposalCountLoading || votingPeriodLoading || quorumLoading,
  }
}

// Treasury contract hooks
export function useTreasuryData() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: TREASURY_CONTRACT.address,
    abi: TREASURY_CONTRACT.abi,
    functionName: "balance",
    query: { enabled: mounted },
  })

  const { data: owner, isLoading: ownerLoading } = useReadContract({
    address: TREASURY_CONTRACT.address,
    abi: TREASURY_CONTRACT.abi,
    functionName: "owner",
    query: { enabled: mounted },
  })

  return {
    balance: balance?.toString() || "1247.5",
    owner: owner?.toString() || "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
    isLoading: !mounted || balanceLoading || ownerLoading,
  }
}

export function useRealtimeEvents() {
  const [mounted, setMounted] = useState(false)
  const [recentVotes, setRecentVotes] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useWatchContractEvent({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    eventName: "VoteCast",
    enabled: mounted,
    onLogs(logs) {
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
    isLoading: !mounted,
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

export function useProposalIds(
  limit = 20,
  statusFilter: "all" | "active" | "executed" | "defeated" | "canceled" = "all",
) {
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
        const response = await fetch(
          "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                proposals(first: 1000, orderBy: createdTimestamp, orderDirection: desc) {
                  id
                  status
                  objectionPeriodEndBlock
                }
              }
            `,
            }),
          },
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data?.data?.proposals) {
          const allProposals = data.data.proposals

          let filtered = allProposals
          if (statusFilter === "active") {
            filtered = allProposals.filter((p: any) => p.status === "ACTIVE" || p.status === "PENDING")
          } else if (statusFilter === "executed") {
            filtered = allProposals.filter((p: any) => p.status === "EXECUTED")
          } else if (statusFilter === "defeated") {
            filtered = allProposals.filter(
              (p: any) =>
                p.status === "CANCELLED" && p.objectionPeriodEndBlock && Number(p.objectionPeriodEndBlock) > 0,
            )
          } else if (statusFilter === "canceled") {
            filtered = allProposals.filter(
              (p: any) =>
                p.status === "CANCELLED" && (!p.objectionPeriodEndBlock || Number(p.objectionPeriodEndBlock) === 0),
            )
          }

          setTotalCount(filtered.length)
          const ids = filtered.slice(0, limit).map((p: any) => Number.parseInt(p.id))
          setProposalIds(ids)
        }
      } catch (error) {
        console.error("Error fetching proposals:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposalIds()
  }, [mounted, limit, statusFilter])

  return { proposalIds, totalCount, isLoading }
}

export function useProposalData(proposalId: number) {
  const [mounted, setMounted] = useState(false)
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
    quorum: BigInt(72),
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

  const { data: stateData } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    functionName: "state",
    args: [BigInt(proposalId)],
    query: {
      enabled: mounted && proposalId > 0,
    },
  })

  useEffect(() => {
    if (!mounted) return

    const fetchCurrentBlock = async () => {
      try {
        const response = await fetch("https://rpc.ankr.com/eth", {
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
      }
    }
    fetchCurrentBlock()
    const interval = setInterval(fetchCurrentBlock, 30000)
    return () => clearInterval(interval)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return

    const fetchProposalFromAPI = async () => {
      try {
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

          const stateNum = stateData !== undefined ? Number(stateData) : 1
          const stateName = PROPOSAL_STATE_NAMES[stateNum] || "Pending"

          const sponsorsList = proposal.signers?.map((s: any) => s.id as `0x${string}`) || []

          const safeStartBlock = proposal.startBlock ? BigInt(proposal.startBlock) : BigInt(0)
          const safeEndBlock = proposal.endBlock ? BigInt(proposal.endBlock) : BigInt(0)
          const safeForVotes = proposal.forVotes ? BigInt(proposal.forVotes) : BigInt(0)
          const safeAgainstVotes = proposal.againstVotes ? BigInt(proposal.againstVotes) : BigInt(0)
          const safeAbstainVotes = proposal.abstainVotes ? BigInt(proposal.abstainVotes) : BigInt(0)
          const safeQuorum =
            proposal.quorumVotes && Number(proposal.quorumVotes) > 0 ? BigInt(proposal.quorumVotes) : BigInt(72)

          setProposalData({
            id: proposalId,
            proposer: proposal.proposer?.id || "0x0000000000000000000000000000000000000000",
            sponsors: sponsorsList,
            forVotes: safeForVotes,
            againstVotes: safeAgainstVotes,
            abstainVotes: safeAbstainVotes,
            state: stateNum,
            stateName: stateName,
            quorum: safeQuorum,
            description: title,
            fullDescription: desc,
            startBlock: safeStartBlock,
            endBlock: safeEndBlock,
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
        setProposalData((prev) => ({ ...prev, isLoading: false, error: true }))
      }
    }

    fetchProposalFromAPI()
  }, [mounted, proposalId, stateData])

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
    const fetchProposals = async () => {
      const results: any[] = []
      for (const id of proposalIds) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        results.push({ id, loading: false })
      }
      setProposals(results)
      setIsLoading(false)
    }

    fetchProposals()
  }, [proposalIds.join(",")])

  return { proposals, isLoading }
}

export function useCandidateIds(limit = 20) {
  const [candidates, setCandidates] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchCandidates = async () => {
      try {
        const countResponse = await fetch(
          "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                proposalCandidates(first: 1000, where: { canceled: false }) {
                  id
                }
              }
            `,
            }),
          },
        )

        const countData = await countResponse.json()
        const allCandidatesCount = countData?.data?.proposalCandidates?.length || 0
        setTotalCount(allCandidatesCount)

        const response = await fetch(
          "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                proposalCandidates(first: ${limit}, orderBy: createdTimestamp, orderDirection: desc, where: { canceled: false }) {
                  id
                  slug
                  proposer
                  createdTimestamp
                  createdTransactionHash
                  canceled
                  canceledTimestamp
                  latestVersion {
                    id
                    content {
                      title
                      description
                      targets
                      values
                      signatures
                      calldatas
                    }
                  }
                }
              }
            `,
            }),
          },
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data?.data?.proposalCandidates) {
          const candidatesWithNumber = data.data.proposalCandidates.map((c: any, index: number) => ({
            ...c,
            // Calculate candidate number: total count minus position in the list
            candidateNumber: allCandidatesCount - index,
            title: c.latestVersion?.content?.title || `Candidate`,
            description: c.latestVersion?.content?.description || "",
          }))
          setCandidates(candidatesWithNumber)
        }
      } catch (error) {
        console.error("Error fetching candidates:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCandidates()
  }, [mounted, limit])

  return { candidates, totalCount, isLoading }
}

export function useCandidateData(candidateId: string) {
  const [mounted, setMounted] = useState(false)
  const [candidateData, setCandidateData] = useState({
    id: candidateId,
    slug: "",
    proposer: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    sponsors: [] as Array<{
      sponsor: `0x${string}`
      reason: string
      createdBlock: bigint
      createdTimestamp: bigint
      expirationTimestamp: bigint
      canceled: boolean
    }>,
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
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

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
          const title = content.title || `Candidate ${candidateId}`
          const description = content.description || ""

          setCandidateData({
            id: candidateId,
            slug: candidate.slug || "",
            proposer: candidate.proposer || "0x0000000000000000000000000000000000000000",
            sponsors: [],
            description: title,
            fullDescription: description,
            createdTimestamp: Number.parseInt(candidate.createdTimestamp || "0"),
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
        setCandidateData((prev) => ({ ...prev, isLoading: false, error: true }))
      }
    }

    fetchCandidateFromAPI()
  }, [candidateId, mounted])

  return candidateData
}

export function useProposalFeedback(proposalId: number) {
  const [feedback, setFeedback] = useState<
    Array<{
      voter: string
      support: number
      supportLabel: string
      reason: string
      blockNumber: number
      isSignal: boolean
    }>
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchFeedback = async () => {
      try {
        const response = await fetch(
          "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                proposalFeedbacks(
                  where: { proposal: "${proposalId}" }
                  orderBy: createdTimestamp
                  orderDirection: desc
                  first: 1000
                ) {
                  id
                  voter {
                    id
                  }
                  support
                  reason
                  createdTimestamp
                  createdBlock
                }
              }
            `,
            }),
          },
        )

        const data = await response.json()

        if (data?.data?.proposalFeedbacks) {
          const feedbackList = data.data.proposalFeedbacks.map((f: any) => {
            const supportNum = Number(f.support)
            let supportLabel = "Abstain"
            if (supportNum === 0) supportLabel = "Against"
            else if (supportNum === 1) supportLabel = "For"
            else if (supportNum === 2) supportLabel = "Abstain"

            return {
              voter: f.voter?.id || "",
              support: supportNum,
              supportLabel,
              reason: f.reason || "",
              blockNumber: Number(f.createdBlock || 0),
              isSignal: true,
            }
          })
          setFeedback(feedbackList)
        }
      } catch (error) {
        console.error("Error fetching feedback:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeedback()
  }, [proposalId, mounted])

  return { feedback, isLoading }
}

export function useProposalVotes(proposalId: number) {
  const [votes, setVotes] = useState<
    Array<{
      voter: string
      support: number
      supportLabel: string
      votes: string
      reason: string
      blockNumber: number
      isSignal: boolean
    }>
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchVotes = async () => {
      try {
        const response = await fetch(
          "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                votes(
                  where: { proposal: "${proposalId}" }
                  orderBy: blockNumber
                  orderDirection: desc
                  first: 1000
                ) {
                  id
                  voter {
                    id
                  }
                  support
                  supportDetailed
                  votes
                  reason
                  blockNumber
                }
              }
            `,
            }),
          },
        )

        const data = await response.json()

        if (data?.data?.votes) {
          const votesList = data.data.votes.map((v: any) => {
            const supportNum = Number(v.support)
            let supportLabel = "Abstain"
            if (supportNum === 0) supportLabel = "Against"
            else if (supportNum === 1) supportLabel = "For"
            else if (supportNum === 2) supportLabel = "Abstain"

            return {
              voter: v.voter?.id || "",
              support: supportNum,
              supportLabel,
              votes: v.votes || "0",
              reason: v.reason || "",
              blockNumber: Number(v.blockNumber || 0),
              isSignal: false,
            }
          })
          setVotes(votesList)
        }
      } catch (error) {
        console.error("Error fetching votes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVotes()
  }, [proposalId, mounted])

  return { votes, isLoading }
}

export function useCandidateSignatures(candidateId: string) {
  const [signatures, setSignatures] = useState<
    Array<{
      signer: string
      reason: string
      expirationTimestamp: number
      canceled: boolean
    }>
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchSignatures = async () => {
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
                  versions {
                    content {
                      contentSignatures {
                        signer {
                          id
                        }
                        reason
                        expirationTimestamp
                        canceled
                      }
                    }
                  }
                }
              }
            `,
            }),
          },
        )

        const data = await response.json()
        const candidate = data?.data?.proposalCandidate

        if (candidate?.versions) {
          const sigsList: any[] = []
          candidate.versions.forEach((version: any) => {
            const sigs = version.content?.contentSignatures || []
            sigs.forEach((sig: any) => {
              sigsList.push({
                signer: sig.signer?.id || "",
                reason: sig.reason || "",
                expirationTimestamp: Number(sig.expirationTimestamp || 0),
                canceled: sig.canceled || false,
              })
            })
          })
          setSignatures(sigsList)
        }
      } catch (error) {
        console.error("Error fetching signatures:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSignatures()
  }, [candidateId, mounted])

  return { signatures, isLoading }
}
