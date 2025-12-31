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
  const candidateIdOrNumber = params.id as string
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

      // Check if it's a number (candidate number) or full ID
      const isNumber = /^\d+$/.test(candidateIdOrNumber)

      if (!isNumber) {
        // It's already a full candidate ID
        setResolvedCandidateId(candidateIdOrNumber)
        setIsLoading(false)
        return
      }

      // It's a candidate number, we need to find the corresponding candidate
      const candidateNumber = Number.parseInt(candidateIdOrNumber, 10)

      try {
        // First get total count
        const countResponse = await fetch(
          "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                proposalCandidates(first: 1000, where: { canceled: false }, orderBy: createdTimestamp, orderDirection: asc) {
                  id
                }
              }
            `,
            }),
          },
        )

        const countData = await countResponse.json()
        const allCandidates = countData?.data?.proposalCandidates || []

        // Candidate number 1 is the first created (index 0), number N is index N-1
        const index = candidateNumber - 1
        if (index >= 0 && index < allCandidates.length) {
          setResolvedCandidateId(allCandidates[index].id)
        } else {
          // Fallback: try using the number as part of the ID
          setResolvedCandidateId(candidateIdOrNumber)
        }
      } catch (error) {
        console.error("Error resolving candidate:", error)
        setResolvedCandidateId(candidateIdOrNumber)
      } finally {
        setIsLoading(false)
      }
    }

    resolveCandidateId()
  }, [mounted, candidateIdOrNumber])

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
