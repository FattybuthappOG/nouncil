"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Clock } from "lucide-react"
import { useCandidateData } from "@/hooks/useContractData"
import { EnsDisplay } from "./ens-display"

interface CandidateCardProps {
  candidateId: string
  isDarkMode: boolean
  candidateNumber?: number
}

export function CandidateCard({ candidateId, isDarkMode, candidateNumber }: CandidateCardProps) {
  const router = useRouter()
  const candidate = useCandidateData(candidateId)

  const handleClick = () => {
    router.push(`/candidate/${candidateNumber}`)
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
            <div className="flex items-center gap-2 mb-1">
              {candidateNumber && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  #{candidateNumber}
                </Badge>
              )}
              <h3 className={`font-semibold text-lg ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
                {candidate.description}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                by <EnsDisplay address={candidate.proposer} className="inline" />
              </span>
              <span className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {formatTimeAgo(candidate.createdTimestamp)}
                </span>
              </div>
              {candidate.canceled && (
                <>
                  <span className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>•</span>
                  <Badge variant="destructive">Canceled</Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default CandidateCard
