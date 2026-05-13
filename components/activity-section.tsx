"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { ThumbsUp, ThumbsDown, Minus, MessageSquare, Clock, ExternalLink, CheckCircle2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { EnsDisplay } from "@/components/ens-display"

// Types
interface Vote {
  id: string
  voter: string
  support: number // 0 = Against, 1 = For, 2 = Abstain
  votes: number
  reason: string
  blockNumber: number
  timestamp: number
}

interface Signal {
  id: string
  voter: string
  support: number // 0 = Against, 1 = For, 2 = Abstain
  reason: string
  votes: number
  timestamp: number
  blockNumber: number
}

interface Propdate {
  id: string
  proposalId: number
  updateNumber: number
  isCompleted: boolean
  text: string
  blockNumber: number
  transactionHash: string
}

interface ActivitySectionProps {
  proposalId?: string
  candidateId?: string
  isDarkMode?: boolean
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

// Helper to parse and render media in reason text (YouTube, GIFs, images)
function ReasonWithMedia({ reason, isDarkMode }: { reason: string; isDarkMode: boolean }) {
  if (!reason) return null

  // YouTube regex
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g
  // GIF/image regex
  const imageRegex = /(https?:\/\/[^\s]+\.(?:gif|png|jpg|jpeg|webp)(?:\?[^\s]*)?)/gi
  
  const youtubeMatches = [...reason.matchAll(youtubeRegex)]
  const imageMatches = [...reason.matchAll(imageRegex)]
  
  // Clean reason text (remove URLs)
  let cleanText = reason
    .replace(youtubeRegex, '')
    .replace(imageRegex, '')
    .trim()

  return (
    <div className="space-y-3">
      {cleanText && (
        <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
          {cleanText}
        </p>
      )}
      
      {/* YouTube embeds */}
      {youtubeMatches.length > 0 && (
        <div className="space-y-2">
          {[...new Set(youtubeMatches.map(m => m[1]))].slice(0, 1).map((videoId) => (
            <div key={videoId} className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Image/GIF embeds */}
      {imageMatches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...new Set(imageMatches.map(m => m[1]))].slice(0, 2).map((url) => (
            <img
              key={url}
              src={url}
              alt="Embedded media"
              className="max-w-xs max-h-48 rounded-lg object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Vote/Signal item component
function FeedbackItem({ 
  voter, 
  support, 
  votes, 
  reason, 
  timestamp, 
  isDarkMode,
  showVotes = true 
}: { 
  voter: string
  support: number
  votes: number
  reason: string
  timestamp: number
  isDarkMode: boolean
  showVotes?: boolean
}) {
  const supportConfig = {
    0: { label: "Against", icon: ThumbsDown, color: "text-red-500", bg: isDarkMode ? "bg-red-500/10" : "bg-red-50" },
    1: { label: "For", icon: ThumbsUp, color: "text-green-500", bg: isDarkMode ? "bg-green-500/10" : "bg-green-50" },
    2: { label: "Abstain", icon: Minus, color: "text-gray-500", bg: isDarkMode ? "bg-gray-500/10" : "bg-gray-100" },
  }[support] || { label: "Unknown", icon: Minus, color: "text-gray-500", bg: "bg-gray-100" }

  const Icon = supportConfig.icon
  const timeAgo = timestamp > 0 ? formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true }) : ""

  return (
    <div className={`p-4 rounded-lg ${isDarkMode ? "bg-gray-800/50" : "bg-gray-50"}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${supportConfig.bg}`}>
          <Icon className={`w-4 h-4 ${supportConfig.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <EnsDisplay 
              address={voter} 
              showAvatar 
              avatarSize={20}
              className={`font-medium text-sm ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}
            />
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${supportConfig.bg} ${supportConfig.color}`}>
              {supportConfig.label}
            </span>
            {showVotes && votes > 0 && (
              <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                {votes} {votes === 1 ? "vote" : "votes"}
              </span>
            )}
            {timeAgo && (
              <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                {timeAgo}
              </span>
            )}
          </div>
          
          {reason && (
            <div className="mt-2">
              <ReasonWithMedia reason={reason} isDarkMode={isDarkMode} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Propdate item component
function PropdateItem({ propdate, isDarkMode }: { propdate: Propdate; isDarkMode: boolean }) {
  return (
    <div className={`p-4 rounded-lg ${isDarkMode ? "bg-gray-800/50" : "bg-gray-50"}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${propdate.isCompleted 
          ? (isDarkMode ? "bg-green-500/10" : "bg-green-50") 
          : (isDarkMode ? "bg-blue-500/10" : "bg-blue-50")}`}>
          {propdate.isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <Clock className="w-4 h-4 text-blue-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Update #{propdate.updateNumber}
            </span>
            {propdate.isCompleted && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isDarkMode ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600"
              }`}>
                Completed
              </span>
            )}
            <a
              href={`https://etherscan.io/tx/${propdate.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs flex items-center gap-1 hover:underline ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              <ExternalLink className="w-3 h-3" />
              View tx
            </a>
          </div>
          
          {propdate.text && (
            <p className={`mt-2 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              {propdate.text}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function ActivitySection({ proposalId, candidateId, isDarkMode = false }: ActivitySectionProps) {
  const isProposal = !!proposalId
  const [activeTab, setActiveTab] = useState<"votes" | "signals" | "propdates">(isProposal ? "votes" : "signals")

  // Fetch votes (proposals only)
  const { data: votesData, isLoading: votesLoading } = useSWR(
    isProposal ? `/api/nouns/votes?proposalId=${proposalId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Fetch signals (both proposals and candidates)
  const { data: signalsData, isLoading: signalsLoading } = useSWR(
    isProposal 
      ? `/api/nouns/signals?proposalId=${proposalId}`
      : `/api/nouns/signals?candidateId=${candidateId}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Fetch propdates (proposals only)
  const { data: propdatesData, isLoading: propdatesLoading } = useSWR(
    isProposal ? `/api/nouns/propdates?proposalId=${proposalId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const votes: Vote[] = votesData?.votes || []
  const signals: Signal[] = signalsData?.signals || []
  const propdates: Propdate[] = propdatesData?.propdates || []

  // Count votes with reasons
  const votesWithReasons = useMemo(() => votes.filter(v => v.reason?.trim()), [votes])
  const signalsWithReasons = useMemo(() => signals.filter(s => s.reason?.trim()), [signals])

  // Tabs configuration
  const tabs = useMemo(() => {
    if (isProposal) {
      return [
        { id: "votes" as const, label: "Votes", count: votes.length, withReasons: votesWithReasons.length },
        { id: "signals" as const, label: "Signals", count: signals.length, withReasons: signalsWithReasons.length },
        { id: "propdates" as const, label: "Propdates", count: propdates.length },
      ]
    }
    return [
      { id: "signals" as const, label: "Signals", count: signals.length, withReasons: signalsWithReasons.length },
    ]
  }, [isProposal, votes.length, signals.length, propdates.length, votesWithReasons.length, signalsWithReasons.length])

  const isLoading = activeTab === "votes" ? votesLoading : activeTab === "signals" ? signalsLoading : propdatesLoading

  return (
    <div id="activity-section" className={`rounded-xl border ${isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
      {/* Header with tabs */}
      <div className={`flex items-center gap-2 p-4 border-b ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
        <MessageSquare className={`w-5 h-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
        <h2 className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Activity</h2>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 p-2 border-b ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? isDarkMode
                  ? "bg-blue-600 text-white"
                  : "bg-blue-500 text-white"
                : isDarkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-800"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 ${activeTab === tab.id ? "text-white/80" : ""}`}>
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Votes tab */}
            {activeTab === "votes" && (
              <div className="space-y-2">
                {votes.length === 0 && (
                  <p className={`text-sm text-center py-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    No votes yet
                  </p>
                )}
                {/* Votes with reasons - full card */}
                {votes.filter(v => v.reason?.trim()).map((vote) => (
                  <FeedbackItem
                    key={vote.id}
                    voter={vote.voter}
                    support={vote.support}
                    votes={vote.votes}
                    reason={vote.reason}
                    timestamp={vote.timestamp}
                    isDarkMode={isDarkMode}
                  />
                ))}
                {/* Votes without reasons - compact rows */}
                {votes.filter(v => !v.reason?.trim()).length > 0 && (
                  <div className={`rounded-lg border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                    <div className={`px-4 py-2 text-xs font-medium border-b ${isDarkMode ? "text-gray-400 border-gray-700" : "text-gray-500 border-gray-200"}`}>
                      {votes.filter(v => !v.reason?.trim()).length} votes without reason
                    </div>
                    <div className="divide-y divide-gray-700/50">
                      {votes.filter(v => !v.reason?.trim()).map((vote) => {
                        const supportConfig = {
                          0: { label: "Against", icon: ThumbsDown, color: "text-red-500" },
                          1: { label: "For", icon: ThumbsUp, color: "text-green-500" },
                          2: { label: "Abstain", icon: Minus, color: "text-gray-400" },
                        }[vote.support] || { label: "Unknown", icon: Minus, color: "text-gray-400" }
                        const Icon = supportConfig.icon
                        return (
                          <div key={vote.id} className="flex items-center gap-3 px-4 py-2.5">
                            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${supportConfig.color}`} />
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              vote.support === 1 ? (isDarkMode ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600") :
                              vote.support === 0 ? (isDarkMode ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600") :
                              (isDarkMode ? "bg-gray-500/10 text-gray-400" : "bg-gray-100 text-gray-500")
                            }`}>
                              {supportConfig.label}
                            </span>
                            <div className="flex-1 min-w-0">
                              <EnsDisplay
                                address={vote.voter}
                                showAvatar
                                avatarSize={16}
                                className={`text-xs font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                              />
                            </div>
                            <span className={`text-xs tabular-nums flex-shrink-0 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                              {vote.votes} {vote.votes === 1 ? "vote" : "votes"}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Signals tab */}
            {activeTab === "signals" && (
              <div className="space-y-3">
                {signals.length === 0 && (
                  <p className={`text-sm text-center py-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    No signals yet
                  </p>
                )}
                {signals.map((signal) => (
                  <FeedbackItem
                    key={signal.id}
                    voter={signal.voter}
                    support={signal.support}
                    votes={signal.votes}
                    reason={signal.reason}
                    timestamp={signal.timestamp}
                    isDarkMode={isDarkMode}
                    showVotes={true}
                  />
                ))}
              </div>
            )}

            {/* Propdates tab */}
            {activeTab === "propdates" && (
              <div className="space-y-3">
                {propdates.length === 0 && (
                  <p className={`text-sm text-center py-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    No propdates yet
                  </p>
                )}
                {propdates.map((propdate) => (
                  <PropdateItem key={propdate.id} propdate={propdate} isDarkMode={isDarkMode} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
