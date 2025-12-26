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
  const candidateId = params.id as string
  const [mounted, setMounted] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    setMounted(true)
    const savedDarkMode = localStorage.getItem("nouncil-dark-mode")
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === "true")
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      if (isDarkMode) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }, [isDarkMode, mounted])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] p-6">
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-[#252540] rounded w-3/4" />
          <div className="h-64 bg-[#252540] rounded" />
        </div>
      </div>
    )
  }

  return <CandidateContent candidateId={candidateId} isDarkMode={isDarkMode} />
}
