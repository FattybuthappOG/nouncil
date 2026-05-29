"use client"

import dynamic from "next/dynamic"
import { useParams } from "next/navigation"
import { useState, useEffect } from "react"

const CandidateContent = dynamic(() => import("@/components/candidate-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#1a1a2e] p-6">
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-[#252540] rounded w-3/4" />
        <div className="h-64 bg-[#252540] rounded" />
      </div>
    </div>
  ),
})

export default function CandidateDetailPage() {
  const params = useParams()
  const candidateIdOrSlug = params.id as string
  const [mounted, setMounted] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [resolvedCandidateId, setResolvedCandidateId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    const savedDarkMode = localStorage.getItem("nouncil-dark-mode")
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === "true")
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const resolveCandidateId = async () => {
      setIsLoading(true)

      // Check if it's a number (candidate number)
      const isNumber = /^\d+$/.test(candidateIdOrSlug)

      if (!isNumber) {
        // It's a slug or full candidate ID - pass directly to CandidateContent
        // The useCandidateData hook will handle matching by slug or id
        setResolvedCandidateId(candidateIdOrSlug)
        setIsLoading(false)
        return
      }

      // It's a candidate number, we need to find the corresponding candidate
      const candidateNumber = Number.parseInt(candidateIdOrSlug, 10)

      try {
        // First try to get from our API which has slug info
        const apiResponse = await fetch(`/api/nouns/candidates?limit=100`)
        if (apiResponse.ok) {
          const apiData = await apiResponse.json()
          const candidate = apiData.candidates?.find((c: any) => c.candidateNumber === candidateNumber)
          if (candidate) {
            // Use the full ID for better matching
            setResolvedCandidateId(candidate.id || candidateIdOrSlug)
            setIsLoading(false)
            return
          }
        }
        
        // Fallback to Goldsky subgraph
        const SUBGRAPH_URL = "https://api.goldsky.com/api/public/project_clnbcoajmebxn33wdbt98f439/subgraphs/nouns-mainnet/1.0.0/gn"
        
        const response = await fetch(SUBGRAPH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `{ proposalCandidates(where: { number: ${candidateNumber}, canceled: false }) { id slug } }`,
          }),
        })
        const data = await response.json()
        if (data?.data?.proposalCandidates?.[0]) {
          setResolvedCandidateId(data.data.proposalCandidates[0].id)
        } else {
          // Try fetching all and matching by index (old behavior as final fallback)
          const countResponse = await fetch(SUBGRAPH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `{ proposalCandidates(first: 1000, where: { canceled: false }, orderBy: createdTimestamp, orderDirection: asc) { id } }`,
            }),
          })
          const countData = await countResponse.json()
          if (countData?.data?.proposalCandidates) {
            const allCandidates = countData.data.proposalCandidates
            const index = candidateNumber - 1
            if (index >= 0 && index < allCandidates.length) {
              setResolvedCandidateId(allCandidates[index].id)
            } else {
              setResolvedCandidateId(candidateIdOrSlug)
            }
          } else {
            setResolvedCandidateId(candidateIdOrSlug)
          }
        }
      } catch (error) {
        // Fallback to using the input directly
        setResolvedCandidateId(candidateIdOrSlug)
      } finally {
        setIsLoading(false)
      }
    }

    resolveCandidateId()
  }, [mounted, candidateIdOrSlug])

  useEffect(() => {
    if (mounted) {
      if (isDarkMode) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }, [isDarkMode, mounted])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] p-6">
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-[#252540] rounded w-3/4" />
          <div className="h-64 bg-[#252540] rounded" />
        </div>
      </div>
    )
  }

  if (!resolvedCandidateId) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] p-6">
        <div className="max-w-4xl mx-auto text-center text-white">Candidate not found</div>
      </div>
    )
  }

  return <CandidateContent candidateId={resolvedCandidateId} isDarkMode={isDarkMode} />
}
