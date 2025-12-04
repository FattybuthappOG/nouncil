"use client"

import { use } from "react"
import { useCandidateData } from "@/hooks/useContractData"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink, Users, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { parseMarkdownMedia } from "@/lib/markdown-parser"

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const candidateId = resolvedParams.id
  const candidate = useCandidateData(candidateId)
  const router = useRouter()
  const isDarkMode = true

  if (candidate.isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading candidate...</div>
      </div>
    )
  }

  const { images, videos } = parseMarkdownMedia(candidate.fullDescription)
  const sponsorThresholdMet = candidate.sponsorCount >= candidate.sponsorThreshold

  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return "Recently"
    const now = Math.floor(Date.now() / 1000)
    const diff = now - timestamp
    const days = Math.floor(diff / 86400)
    const hours = Math.floor(diff / 3600)

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`
    return "Recently"
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Candidate Header */}
        <Card className="bg-gray-800 border-gray-700 p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-100 mb-2">{candidate.description}</h1>
                <div className="flex items-center gap-3 flex-wrap text-sm text-gray-400">
                  <span>Candidate {candidateId}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTimeAgo(candidate.createdTimestamp)}
                  </div>
                </div>
              </div>
              {sponsorThresholdMet && (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700 shrink-0">
                  Ready to Propose
                </Badge>
              )}
            </div>

            {/* Proposer Info */}
            <div className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
              <span className="text-sm text-gray-400">Proposer:</span>
              <a
                href={`https://etherscan.io/address/${candidate.proposer}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {candidate.proposer}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Sponsor Status */}
            <div className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
              <Users className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-300 mb-1">Sponsor Status</div>
                <div className="text-sm text-gray-400">
                  {candidate.sponsorCount} of {candidate.sponsorThreshold} required sponsors
                </div>
              </div>
            </div>

            {/* Transaction */}
            {candidate.transactionHash && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Transaction:</span>
                <a
                  href={`https://etherscan.io/tx/${candidate.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {candidate.transactionHash.slice(0, 10)}...{candidate.transactionHash.slice(-8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* Media Section */}
        {(images.length > 0 || videos.length > 0) && (
          <Card className="bg-gray-800 border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Media</h2>
            <div className="space-y-4">
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={img || "/placeholder.svg"}
                  alt={`Candidate media ${idx + 1}`}
                  className="w-full rounded-lg border border-gray-700"
                />
              ))}
              {videos.map((videoId, idx) => (
                <div key={idx} className="relative w-full pt-[56.25%]">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Description */}
        <Card className="bg-gray-800 border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Description</h2>
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-gray-100 mt-6 mb-4" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-gray-200 mt-5 mb-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-xl font-semibold text-gray-300 mt-4 mb-2" {...props} />,
                p: ({ node, ...props }) => <p className="text-gray-300 leading-relaxed mb-4" {...props} />,
                a: ({ node, ...props }) => (
                  <a
                    className="text-blue-400 hover:text-blue-300 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-400 my-4" {...props} />
                ),
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm text-gray-200" {...props} />
                  ) : (
                    <code
                      className="block bg-gray-700 p-4 rounded-lg text-sm text-gray-200 overflow-x-auto mb-4"
                      {...props}
                    />
                  ),
                img: () => null, // Images handled separately
              }}
            >
              {candidate.fullDescription}
            </ReactMarkdown>
          </div>
        </Card>
      </div>
    </div>
  )
}
