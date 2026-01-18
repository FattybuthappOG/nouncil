"use client"

import { useState, useEffect } from "react"
import { LILNOUNS_SUBGRAPH_URL, LILNOUNS_GOLDSKY_URL } from "@/lib/lilnouns-constants"

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

async function fetchFromSubgraph(query: string) {
  // Try primary endpoint first (The Graph hosted service)
  try {
    console.log("[v0] Lil Nouns: Fetching from primary endpoint...", LILNOUNS_SUBGRAPH_URL)
    const response = await fetch(LILNOUNS_SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
    if (response.ok) {
      const data = await response.json()
      console.log("[v0] Lil Nouns primary response:", data)
      if (data?.data) return data
      if (data?.errors) {
        console.error("[v0] Lil Nouns primary errors:", data.errors)
      }
    } else {
      console.error("[v0] Lil Nouns primary response not OK:", response.status, response.statusText)
    }
  } catch (e) {
    console.error("[v0] Lil Nouns primary request failed:", e)
  }

  // Fallback to Studio API
  try {
    console.log("[v0] Lil Nouns: Trying fallback endpoint...", LILNOUNS_GOLDSKY_URL)
    const response = await fetch(LILNOUNS_GOLDSKY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
    if (response.ok) {
      const data = await response.json()
      console.log("[v0] Lil Nouns fallback response:", data)
      return data
    } else {
      console.error("[v0] Lil Nouns fallback response not OK:", response.status, response.statusText)
    }
  } catch (e) {
    console.error("[v0] Lil Nouns fallback request also failed:", e)
  }
  
  return { data: null }
}

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
        // Simple query to get all proposals
        const data = await fetchFromSubgraph(`
          query {
            proposals(first: 1000, orderBy: createdTimestamp, orderDirection: desc) {
              id
            }
          }
        `)

        console.log("[v0] Lil Nouns proposals data:", data)

        if (data?.data?.proposals) {
          const allProposals = data.data.proposals
          const ids = allProposals.map((p: any) => Number.parseInt(p.id))
          setTotalCount(ids.length)
          setProposalIds(ids.slice(0, limit))
        } else {
          console.log("[v0] Lil Nouns: No proposals found in response")
          setProposalIds([])
          setTotalCount(0)
        }
      } catch (error) {
        console.error("[v0] Lil Nouns: Error fetching proposals:", error)
        setProposalIds([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposalIds()
  }, [mounted, limit])

  return { proposalIds, totalCount, isLoading }
}



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
        // Silently fail
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
        const data = await fetchFromSubgraph(`
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
        `)

        const proposal = data?.data?.proposal

        if (proposal) {
          const desc = proposal.description || `Proposal ${proposalId}`
          const title =
            desc
              .split("\n")[0]
              .replace(/^#+\s*/, "")
              .trim() || `Proposal ${proposalId}`

          const statusMap: Record<string, number> = {
            PENDING: 0,
            ACTIVE: 1,
            CANCELLED: 2,
            DEFEATED: 3,
            SUCCEEDED: 4,
            QUEUED: 5,
            EXPIRED: 6,
            EXECUTED: 7,
            VETOED: 8,
          }
          const stateNum = statusMap[proposal.status] ?? 1
          const stateName = PROPOSAL_STATE_NAMES[stateNum] || "Pending"

          const sponsorsList = proposal.signers?.map((s: any) => s.id as `0x${string}`) || []

          setProposalData({
            id: proposalId,
            proposer: proposal.proposer?.id || "0x0000000000000000000000000000000000000000",
            sponsors: sponsorsList,
            forVotes: BigInt(proposal.forVotes || 0),
            againstVotes: BigInt(proposal.againstVotes || 0),
            abstainVotes: BigInt(proposal.abstainVotes || 0),
            state: stateNum,
            stateName: stateName,
            quorum: BigInt(proposal.quorumVotes || 72),
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
        setProposalData((prev) => ({ ...prev, isLoading: false, error: true }))
      }
    }

    fetchProposalFromAPI()
  }, [mounted, proposalId])

  return { ...proposalData, currentBlock }
}

export function useLilNounsCandidateIds(limit = 20) {
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
        const countData = await fetchFromSubgraph(`
          query {
            proposalCandidates(first: 1000, where: { canceled: false }) {
              id
            }
          }
        `)

        const allCandidatesCount = countData?.data?.proposalCandidates?.length || 0
        setTotalCount(allCandidatesCount)

        const data = await fetchFromSubgraph(`
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
        `)

        if (data?.data?.proposalCandidates) {
          const candidatesWithNumber = data.data.proposalCandidates.map((c: any, index: number) => ({
            ...c,
            candidateNumber: allCandidatesCount - index,
            title: c.latestVersion?.content?.title || `Candidate`,
            description: c.latestVersion?.content?.description || "",
          }))
          setCandidates(candidatesWithNumber)
        }
      } catch (error) {
        console.error("Error fetching Lil Nouns candidates:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCandidates()
  }, [mounted, limit])

  return { candidates, totalCount, isLoading }
}

export function useLilNounsCandidateData(candidateId: string) {
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
        const data = await fetchFromSubgraph(`
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
        `)

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

export function useLilNounsProposalFeedback(proposalId: number) {
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
        const data = await fetchFromSubgraph(`
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
        `)

        if (data?.data?.proposalFeedbacks) {
          const feedbackList = data.data.proposalFeedbacks.map((f: any) => {
            const supportNum = Number(f.support)
            let supportLabel = "Abstain"
            if (supportNum === 1) supportLabel = "For"
            else if (supportNum === 0) supportLabel = "Against"

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
  }, [mounted, proposalId])

  return { feedback, isLoading }
}

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
    if (!mounted) return

    const fetchVotes = async () => {
      try {
        const data = await fetchFromSubgraph(`
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
              votes
              reason
              blockNumber
            }
          }
        `)

        if (data?.data?.votes) {
          const votesList = data.data.votes.map((v: any) => {
            const supportNum = Number(v.support)
            let supportLabel = "Abstain"
            if (supportNum === 1) supportLabel = "For"
            else if (supportNum === 0) supportLabel = "Against"

            return {
              voter: v.voter?.id || "",
              support: supportNum,
              supportLabel,
              votes: Number(v.votes || 0),
              reason: v.reason || "",
              blockNumber: Number(v.blockNumber || 0),
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
  }, [mounted, proposalId])

  return { votes, isLoading }
}
