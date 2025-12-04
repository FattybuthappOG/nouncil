"use client"

import { useCandidateData, useCandidateIds } from "@/hooks/useContractData"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { parseMarkdownMedia } from "@/lib/markdown-parser"
import { EnsDisplay } from "@/components/ens-display"

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const candidateNumber = Number.parseInt(params.id)
  const { candidates, totalCount, isLoading: candidatesLoading } = useCandidateIds(1000) // Fetch all to map number to ID

  const candidate = candidates.find((c, idx) => totalCount - idx === candidateNumber)
  const candidateId = candidate?.id || params.id

  const candidateData = useCandidateData(candidateId)
  const router = useRouter()

  if (candidatesLoading || candidateData.isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading candidate...</div>
      </div>
    )
  }

  const { images, videos } = parseMarkdownMedia(candidateData.fullDescription)

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
    <div className="min-h-screen bg-gray-900 overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 overflow-hidden">
        {/* Candidate Header */}
        <Card className="bg-gray-800 border-gray-700 p-6 overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Candidate #{candidateNumber}
                  </Badge>
                </div>
                <h1 className="text-2xl font-bold text-gray-100 mb-2 break-words">{candidateData.description}</h1>
                <div className="flex items-center gap-3 flex-wrap text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTimeAgo(candidateData.createdTimestamp)}
                  </div>
                </div>
              </div>
            </div>

            {/* Proposer Info */}
            <div className="flex items-center gap-2 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50 break-all flex-wrap">
              <span className="text-sm text-gray-400">Proposer:</span>
              <EnsDisplay address={candidateData.proposer} />
              <a
                href={`https://etherscan.io/address/${candidateData.proposer}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Transaction */}
            {candidateData.transactionHash && (
              <div className="flex items-center gap-2 text-sm break-all flex-wrap">
                <span className="text-gray-400">Transaction:</span>
                <a
                  href={`https://etherscan.io/tx/${candidateData.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  {candidateData.transactionHash.slice(0, 10)}...{candidateData.transactionHash.slice(-8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* Media Section */}
        {(images.length > 0 || videos.length > 0) && (
          <Card className="bg-gray-800 border-gray-700 p-6 overflow-hidden">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Media</h2>
            <div className="space-y-4">
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={img || "/placeholder.svg"}
                  alt={`Candidate media ${idx + 1}`}
                  className="w-full max-w-full rounded-lg border border-gray-700"
                />
              ))}
              {videos.map((videoId, idx) => (
                <div key={idx} className="relative w-full pt-[56.25%] overflow-hidden rounded-lg">
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
        <Card className="bg-gray-800 border-gray-700 p-6 overflow-hidden">
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Description</h2>
          <div className="prose prose-invert max-w-none break-words overflow-hidden">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-3xl font-bold text-gray-100 mt-6 mb-4 break-words" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-2xl font-bold text-gray-200 mt-5 mb-3 break-words" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-xl font-semibold text-gray-300 mt-4 mb-2 break-words" {...props} />
                ),
                p: ({ node, ...props }) => <p className="text-gray-300 leading-relaxed mb-4 break-words" {...props} />,
                a: ({ node, ...props }) => (
                  <a
                    className="text-blue-400 hover:text-blue-300 underline break-all"
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
                  <blockquote
                    className="border-l-4 border-gray-600 pl-4 italic text-gray-400 my-4 break-words"
                    {...props}
                  />
                ),
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm text-gray-200 break-all" {...props} />
                  ) : (
                    <code
                      className="block bg-gray-700 p-4 rounded-lg text-sm text-gray-200 overflow-x-auto mb-4"
                      {...props}
                    />
                  ),
                img: () => null, // Images handled separately
              }}
            >
              {candidateData.fullDescription}
            </ReactMarkdown>
          </div>
        </Card>
      </div>
    </div>
  )
}
