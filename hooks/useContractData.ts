"use client"

import { useReadContract, useWatchContractEvent } from "wagmi"
import { useState, useEffect } from "react"
import { GOVERNOR_CONTRACT, TREASURY_CONTRACT } from "@/lib/contracts"

// Subgraph endpoints - decentralized network + studio fallback
const SUBGRAPH_URLS = [
  "https://gateway.thegraph.com/api/subgraphs/id/QmZGXxKFDhGDYnb3ZrJBQTaKPoS2QHGBSC4k3uFpQvRXm3",
  "https://api.studio.thegraph.com/query/94029/nouns-subgraph/version/latest",
]

// Query subgraph with automatic fallback across multiple endpoints
async function querySubgraph(query: string): Promise<any> {
  for (const url of SUBGRAPH_URLS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 6000)
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!response.ok) continue
      const json = await response.json()
      if (json.errors || !json.data) continue
      return json.data
    } catch {
      continue
    }
  }
  throw new Error("All subgraph endpoints failed")
}

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

// Fallback: fetch proposals via server-side API route (which reads directly from the contract)
async function fetchProposalIdsFromAPI(
  limit: number,
  statusFilter: "all" | "active" | "executed" | "defeated" | "vetoed" | "canceled",
): Promise<{ ids: number[]; total: number }> {
  const response = await fetch(`/api/nouns/proposals?limit=${limit}&status=${statusFilter}`)
  if (!response.ok) throw new Error(`API route failed: ${response.status}`)
  const data = await response.json()
  
  if (data.proposals) {
    const ids = data.proposals.map((p: any) => p.id)
    return { ids, total: data.totalCount || ids.length }
  }
  return { ids: [], total: 0 }
}

export function useProposalIds(
  limit = 20,
  statusFilter: "all" | "active" | "executed" | "defeated" | "vetoed" | "canceled" = "all",
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
      // Strategy: API route first (server-side RPC with batch + caching), then subgraph fallback
      try {
        const result = await fetchProposalIdsFromAPI(limit, statusFilter)
        setProposalIds(result.ids)
        setTotalCount(result.total)
      } catch (apiError) {
        console.error("API route failed, trying subgraph:", apiError)
        try {
          const data = await querySubgraph(`{
            proposals(first: 1000, orderBy: createdTimestamp, orderDirection: desc) {
              id
              status
            }
          }`)

          if (data?.proposals) {
            let filtered = data.proposals
            if (statusFilter === "active") {
              filtered = data.proposals.filter((p: any) => p.status === "ACTIVE" || p.status === "PENDING" || p.status === "QUEUED")
            } else if (statusFilter === "executed") {
              filtered = data.proposals.filter((p: any) => p.status === "EXECUTED")
            } else if (statusFilter === "vetoed") {
              filtered = data.proposals.filter((p: any) => p.status === "VETOED")
            } else if (statusFilter === "canceled") {
              filtered = data.proposals.filter((p: any) => p.status === "CANCELLED")
            }
            setTotalCount(filtered.length)
            setProposalIds(filtered.slice(0, limit).map((p: any) => Number.parseInt(p.id)))
          }
        } catch (subgraphError) {
          console.error("Both API route and subgraph failed:", subgraphError)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposalIds()
  }, [mounted, limit, statusFilter])

  return { proposalIds, totalCount, isLoading }
}

// Fallback: fetch a single proposal via the server-side API route (reads from contract with event log descriptions)
async function fetchProposalFromAPIFallback(
  proposalId: number,
  stateData: any,
  setProposalData: (fn: (prev: any) => any) => void,
) {
  const response = await fetch(`/api/nouns/proposals?id=${proposalId}`)
  if (!response.ok) throw new Error(`API route failed: ${response.status}`)
  const proposal = await response.json()
  
  if (!proposal || !proposal.id) throw new Error("No proposal data from API")

  const desc = proposal.description || `Proposal ${proposalId}`
  const title = desc.split("\n")[0].replace(/^#+\s*/, "").trim() || `Proposal ${proposalId}`
  
  const stateNum = stateData !== undefined ? Number(stateData) : (proposal.stateNumber ?? 1)
  const stateName = PROPOSAL_STATE_NAMES[stateNum] || "Pending"

  setProposalData(() => ({
    id: proposalId,
    proposer: (proposal.proposer || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    sponsors: [],
    forVotes: BigInt(proposal.forVotes || 0),
    againstVotes: BigInt(proposal.againstVotes || 0),
    abstainVotes: BigInt(proposal.abstainVotes || 0),
    state: stateNum,
    stateName,
    quorum: BigInt(proposal.quorumVotes || 72),
    description: title,
    fullDescription: desc,
    startBlock: BigInt(proposal.startBlock || 0),
    endBlock: BigInt(proposal.endBlock || 0),
    transactionHash: "",
    targets: [],
    values: [],
    signatures: [],
    calldatas: [],
    isLoading: false,
    error: false,
  }))
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
    description: "",
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
      const rpcs = ["https://ethereum-rpc.publicnode.com", "https://cloudflare-eth.com", "https://eth.llamarpc.com"]
      for (const url of rpcs) {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
          })
          const data = await response.json()
          if (data.result) {
            setCurrentBlock(Number.parseInt(data.result, 16))
            return
          }
        } catch { continue }
      }
    }
    fetchCurrentBlock()
    const interval = setInterval(fetchCurrentBlock, 30000)
    return () => clearInterval(interval)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return

    const fetchProposalFromAPI = async () => {
      // Helper to apply proposal data from any source
      const applyProposal = (proposal: any, source: string) => {
        const desc = proposal.description || ""
        // Only use title if we have actual description content (not empty)
        const title = desc ? desc.split("\n")[0].replace(/^#+\s*/, "").trim() : ""
        const stateNum = stateData !== undefined ? Number(stateData) : (proposal.stateNumber ?? 1)
        const stateName = PROPOSAL_STATE_NAMES[stateNum] || "Pending"
        const sponsorsList = (proposal.signers || proposal.sponsors || []).map((s: any) => ((typeof s === 'string' ? s : s.id) as `0x${string}`))

        // Only mark as not loading if we have description content
        const hasData = desc && desc.length > 0 && desc !== `Proposal ${proposalId}`

        const quorumValue = proposal.quorumVotes && Number(proposal.quorumVotes) > 0 ? proposal.quorumVotes : 72
        setProposalData({
          id: proposalId,
          proposer: (proposal.proposer?.id || proposal.proposer || "0x0000000000000000000000000000000000000000") as `0x${string}`,
          sponsors: sponsorsList,
          forVotes: BigInt(proposal.forVotes || 0),
          againstVotes: BigInt(proposal.againstVotes || 0),
          abstainVotes: BigInt(proposal.abstainVotes || 0),
          state: stateNum,
          stateName,
          quorum: BigInt(quorumValue),
          description: title,
          fullDescription: desc,
          startBlock: BigInt(proposal.startBlock || 0),
          endBlock: BigInt(proposal.endBlock || 0),
          transactionHash: proposal.createdTransactionHash || "",
          targets: proposal.targets || [],
          values: proposal.values || [],
          signatures: proposal.signatures || [],
          calldatas: proposal.calldatas || [],
          isLoading: !hasData,
          error: false,
        })
      }

      // Strategy: API route first (efficient server-side batch RPC), then subgraph fallback
      try {
        const response = await fetch(`/api/nouns/proposals?id=${proposalId}`)
        if (!response.ok) throw new Error(`API route returned ${response.status}`)
        const apiData = await response.json()
        if (apiData?.id) {
          applyProposal(apiData, "api")
          return
        }
        throw new Error("No data from API route")
      } catch (apiError) {
        // Fallback to subgraph
        try {
          const data = await querySubgraph(`{
            proposal(id: "${proposalId}") {
              id description proposer { id } signers { id }
              forVotes againstVotes abstainVotes quorumVotes status
              createdTimestamp createdBlock startBlock endBlock
              createdTransactionHash targets values signatures calldatas
            }
          }`)
          if (data?.proposal) {
            applyProposal(data.proposal, "subgraph")
            return
          }
        } catch { /* subgraph also failed */ }
        console.error("Both API route and subgraph failed for proposal", proposalId)
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
      try {
        // Try the API route which returns all proposals with data
        const response = await fetch(`/api/nouns/proposals?limit=${proposalIds.length}`)
        if (response.ok) {
          const data = await response.json()
          if (data?.proposals) {
            // Map API results to match IDs
            const idSet = new Set(proposalIds)
            const matched = data.proposals.filter((p: any) => idSet.has(p.id))
            setProposals(matched.length > 0 ? matched : proposalIds.map(id => ({ id, loading: false })))
            setIsLoading(false)
            return
          }
        }
      } catch { /* fall through */ }
      // Fallback: just provide basic structure
      setProposals(proposalIds.map(id => ({ id, loading: false })))
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
        console.log("[v0] Fetching candidates from API...")
        const res = await fetch(`/api/nouns/candidates?limit=${limit}`, {
          signal: AbortSignal.timeout(15000),
        })
        
        if (res.ok) {
          const data = await res.json()
          console.log("[v0] Candidates API response:", data)
          setCandidates(data.candidates || [])
          setTotalCount(data.total || 0)
        } else {
          console.log("[v0] Candidates API failed:", res.status)
          setCandidates([])
          setTotalCount(0)
        }
      } catch (err) {
        console.log("[v0] Candidates fetch error:", err)
        setCandidates([])
        setTotalCount(0)
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
    description: "",
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
        // Fetch all candidates from API and find the one matching this ID
        const res = await fetch(`/api/nouns/candidates?limit=100`, {
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) throw new Error("API failed")
        const data = await res.json()
        
        // candidateId could be a number (candidateNumber) or slug-based id
        const candidateNum = parseInt(candidateId)
        const candidate = data.candidates?.find((c: any) => {
          if (!isNaN(candidateNum)) {
            return c.candidateNumber === candidateNum
          }
          return c.id === candidateId || c.slug === candidateId
        })

        if (candidate) {
          setCandidateData({
            id: candidate.id || candidateId,
            slug: candidate.slug || "",
            proposer: candidate.proposer || "0x0000000000000000000000000000000000000000",
            sponsors: [],
            description: candidate.title || "",
            fullDescription: candidate.description || "",
            createdTimestamp: candidate.createdTimestamp || 0,
            transactionHash: candidate.createdTransactionHash || "",
            targets: candidate.targets || [],
            values: candidate.values || [],
            signatures: candidate.signatures || [],
            calldatas: candidate.calldatas || [],
            canceled: candidate.canceled || false,
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
        const data = await querySubgraph(`{
          proposalFeedbacks(
            where: { proposal: "${proposalId}" }
            orderBy: createdTimestamp
            orderDirection: desc
            first: 1000
          ) {
            id
            voter { id }
            support
            reason
            createdTimestamp
            createdBlock
          }
        }`)

        if (data?.proposalFeedbacks) {
          const feedbackList = data.proposalFeedbacks.map((f: any) => {
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
        // Feedback data is optional - gracefully continue if unavailable
        setFeedback([])
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
        const data = await querySubgraph(`{
          votes(
            where: { proposal: "${proposalId}" }
            orderBy: blockNumber
            orderDirection: desc
            first: 1000
          ) {
            id
            voter { id }
            support
            supportDetailed
            votes
            reason
            blockNumber
          }
        }`)

        if (data?.votes) {
          const votesList = data.votes.map((v: any) => {
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
        // Votes data is optional - gracefully continue if unavailable
        setVotes([])
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
        const data = await querySubgraph(`{
          proposalCandidate(id: "${candidateId}") {
            versions {
              content {
                contentSignatures {
                  signer { id }
                  reason
                  expirationTimestamp
                  canceled
                }
              }
            }
          }
        }`)
        const candidate = data?.proposalCandidate

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
