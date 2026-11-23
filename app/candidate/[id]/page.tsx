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

      const candidateNumber = Number.parseInt(candidateIdOrNumber, 10)

      try {
        const response = await fetch("/api/nouns/candidates?limit=100")
        if (!response.ok) throw new Error("Candidate lookup failed")
        const data = await response.json()
        const candidate = data.candidates?.find(
          (item: { candidateNumber: number; id: string }) => item.candidateNumber === candidateNumber,
        )
        setResolvedCandidateId(candidate?.id || null)
      } catch {
        setResolvedCandidateId(null)
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
