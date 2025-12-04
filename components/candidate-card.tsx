"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Clock, Users } from "lucide-react"
import { useCandidateData } from "@/hooks/useContractData"

interface CandidateCardProps {
  candidateId: string
  isDarkMode: boolean
}

export function CandidateCard({ candidateId, isDarkMode }: CandidateCardProps) {
  const router = useRouter()
  const candidate = useCandidateData(candidateId)

  const handleClick = () => {
    router.push(`/candidate/${candidateId}`)
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

  if (candidate.isLoading) {
    return (
      <Card className={`p-4 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <div className="text-center py-4">
          <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Loading candidate {candidateId}...
          </span>
        </div>
      </Card>
    )
  }

  const sponsorThresholdMet = candidate.sponsorCount >= candidate.sponsorThreshold

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
            <h3 className={`font-semibold text-lg mb-1 ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
              Candidate {candidateId}: {candidate.description}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                by {candidate.proposer.slice(0, 6)}...{candidate.proposer.slice(-4)}
              </span>
              <span className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {formatTimeAgo(candidate.createdTimestamp)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sponsor Status */}
        <div
          className={`flex items-center gap-4 p-3 rounded-lg bg-opacity-50 ${
            isDarkMode ? "bg-gray-700/30 border border-gray-600/50" : "bg-gray-100/50 border border-gray-200/50"
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              {candidate.sponsorCount} / {candidate.sponsorThreshold} Sponsors
            </span>
          </div>
          {sponsorThresholdMet && (
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
              Ready to Propose
            </Badge>
          )}
        </div>
      </div>
    </Card>
  )
}
