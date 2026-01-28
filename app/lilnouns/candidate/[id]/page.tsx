"use client"

import { use, useState, useEffect } from "react"
import LilNounsCandidateContent from "@/components/lilnouns-candidate-content"
import { useLilNounsCandidateIds } from "@/hooks/useLilNounsData"

export default function LilNounsCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [isDarkMode] = useState(true)
  const [candidateId, setCandidateId] = useState<string | null>(null)
  
  const { candidates, totalCount, isLoading } = useLilNounsCandidateIds(1000)

  useEffect(() => {
    if (!isLoading && candidates.length > 0) {
      const candidateNumber = Number.parseInt(resolvedParams.id)
      // Find candidate by number (totalCount - index = number)
      const candidate = candidates.find((c: any) => c.candidateNumber === candidateNumber)
      if (candidate) {
        setCandidateId(candidate.id)
      }
    }
  }, [isLoading, candidates, resolvedParams.id, totalCount])

  if (isLoading || !candidateId) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  return <LilNounsCandidateContent candidateId={candidateId} isDarkMode={isDarkMode} />
}
