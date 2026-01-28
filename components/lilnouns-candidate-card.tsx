"use client"

import { useEffect } from "react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Clock } from "lucide-react"
import { EnsDisplay } from "./ens-display"
import { useState } from "react"
import { parseProposalDescription } from "@/lib/markdown-parser"

interface CandidateData {
  id: string
  slug?: string
  proposer: string
  createdTimestamp: number
  createdTransactionHash?: string
  title?: string
  description?: string
  candidateNumber?: number
}

interface LilNounsCandidateCardProps {
  candidateId: string
  isDarkMode: boolean
  candidateNumber?: number
  candidateData?: CandidateData
}

export function LilNounsCandidateCard({ candidateId, isDarkMode, candidateNumber, candidateData }: LilNounsCandidateCardProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Card className={`p-4 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="text-center py-4">
          <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Loading candidate #{candidateNumber}...
          </span>
        </div>
      </Card>
    )
  }

  if (!candidateData) {
    return (
      <Card className={`p-4 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="text-center py-4">
          <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            No data for candidate #{candidateNumber}
          </span>
        </div>
      </Card>
    )
  }

  const handleClick = () => {
    const num = candidateData.candidateNumber || candidateNumber
    router.push(`/lilnouns/candidate/${num}`)
  }

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return "recently"
    const now = Math.floor(Date.now() / 1000)
    const diff = now - timestamp
    const days = Math.floor(diff / 86400)
    const hours = Math.floor(diff / 3600)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return "recently"
  }

  const { media } = parseProposalDescription(candidateData.description || "")

  return (
    <Card
      onClick={handleClick}
      className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
        isDarkMode ? "bg-gray-800 border-gray-700 hover:bg-gray-750" : "bg-white border-gray-200 hover:bg-gray-50"
      }`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {(candidateData.candidateNumber || candidateNumber) && (
                <Badge variant="secondary" className="bg-pink-100 text-pink-800 shrink-0">
                  #{candidateData.candidateNumber || candidateNumber}
                </Badge>
              )}
              <h3 className={`font-semibold text-base truncate ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
                {candidateData.title || `Candidate #${candidateNumber}`}
              </h3>
            </div>

            {/* Proposer */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>by </span>
              <EnsDisplay address={candidateData.proposer as `0x${string}`} className="text-sm" />
            </div>

            {/* Meta info row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Clock className={`w-3 h-3 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
                <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {formatTimeAgo(candidateData.createdTimestamp)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {media.length > 0 && (
          <div className="mt-3 space-y-2">
            {media.slice(0, 2).map((item, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden">
                {item.type === "image" || item.type === "gif" ? (
                  <img
                    src={item.url || "/placeholder.svg"}
                    alt=""
                    className="w-full h-auto max-h-48 object-cover rounded-lg"
                  />
                ) : item.type === "youtube" && item.embedUrl ? (
                  <iframe
                    src={item.embedUrl}
                    title="YouTube video"
                    className="w-full aspect-video rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : item.type === "video" ? (
                  <video src={item.url} controls className="w-full h-auto max-h-48 rounded-lg" />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

export default LilNounsCandidateCard
