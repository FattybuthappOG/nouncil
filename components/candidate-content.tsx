"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Users, Clock, ExternalLink } from "lucide-react"
import EnsDisplay from "@/components/ens-display"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useCandidateData, useCandidateSignatures } from "@/hooks/useContractData" // Import useCandidateData and useCandidateSignatures

function CandidateContentInner({ candidateId, isDarkMode }: { candidateId: string; isDarkMode: boolean }) {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const candidate = useCandidateData(mounted ? candidateId : "")
  const signatures = useCandidateSignatures(mounted ? candidateId : "")

  if (!mounted || candidate.isLoading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-6`}>
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" className="mb-6 gap-2" onClick={() => router.push("/?tab=candidates")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Candidates
          </Button>
          <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                <div className={`h-8 ${isDarkMode ? "bg-[#3a3a5a]" : "bg-muted"} rounded w-1/3`}></div>
                <div className={`h-4 ${isDarkMode ? "bg-[#3a3a5a]" : "bg-muted"} rounded w-full`}></div>
                <div className={`h-4 ${isDarkMode ? "bg-[#3a3a5a]" : "bg-muted"} rounded w-full`}></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (candidate.error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-6`}>
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" className="mb-6 gap-2" onClick={() => router.push("/?tab=candidates")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Candidates
          </Button>
          <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
            <CardContent className="pt-6">
              <p className="text-destructive">Error loading candidate data. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const data = candidate.data
  if (!data) {
    return null
  }

  const candidateNumber = candidateId.split("-").pop() || candidateId

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-6`}>
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className={`mb-6 gap-2 ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-[#252540]" : ""}`}
          onClick={() => router.push("/?tab=candidates")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Candidates
        </Button>

        <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h1 className={`text-2xl font-bold ${isDarkMode ? "text-white" : ""}`}>{data.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Proposed by:</span>
                  <EnsDisplay address={data.proposer} showAvatar avatarSize={20} />
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className={isDarkMode ? "border-[#3a3a5a] text-gray-300" : ""}>
                  #{candidateNumber}
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Candidate</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{signatures.data?.length || 0} signatures</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Created {new Date(data.createdAt * 1000).toLocaleDateString()}</span>
              </div>
              <a
                href={`https://nouns.wtf/candidates/${candidateId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-4 w-4" />
                View on nouns.wtf
              </a>
            </div>

            <Separator className={isDarkMode ? "bg-[#3a3a5a]" : ""} />

            <div>
              <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : ""}`}>Description</h2>
              <MarkdownContent content={data.description} isDarkMode={isDarkMode} />
            </div>

            {signatures.data && signatures.data.length > 0 && (
              <>
                <Separator className={isDarkMode ? "bg-[#3a3a5a]" : ""} />
                <div>
                  <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : ""}`}>Signers</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {signatures.data.map((sig: { signer: { id: string } }, index: number) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 p-3 rounded-lg ${isDarkMode ? "bg-[#1a1a2e]" : "bg-muted"}`}
                      >
                        <EnsDisplay address={sig.signer.id} showAvatar avatarSize={24} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MarkdownContent({ content, isDarkMode }: { content: string; isDarkMode: boolean }) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const handleImageError = (url: string) => {
    setFailedImages((prev) => new Set(prev).add(url))
  }

  return (
    <div
      className={`prose max-w-none ${isDarkMode ? "prose-invert" : ""} prose-headings:font-bold prose-a:text-blue-400 prose-img:rounded-lg prose-img:border prose-img:border-border`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => {
            if (!src || failedImages.has(src)) return null
            return (
              <img
                src={src || "/placeholder.svg"}
                alt={alt || "Image"}
                className="rounded-lg max-w-full h-auto border border-border my-4"
                loading="lazy"
                onError={() => handleImageError(src)}
              />
            )
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline break-all"
            >
              {children}
            </a>
          ),
          p: ({ children, node }) => {
            // Check if paragraph only contains an image
            const hasOnlyImage =
              node?.children?.length === 1 &&
              node.children[0].type === "element" &&
              (node.children[0] as any).tagName === "img"
            if (hasOnlyImage) {
              return <>{children}</>
            }
            return <p className="mb-4 break-words">{children}</p>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default function CandidateContent({ candidateId, isDarkMode }: { candidateId: string; isDarkMode: boolean }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`min-h-screen ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-6`}>
        <div className="max-w-4xl mx-auto">
          <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                <div className={`h-8 ${isDarkMode ? "bg-[#3a3a5a]" : "bg-muted"} rounded w-1/3`}></div>
                <div className={`h-4 ${isDarkMode ? "bg-[#3a3a5a]" : "bg-muted"} rounded w-full`}></div>
                <div className={`h-4 ${isDarkMode ? "bg-[#3a3a5a]" : "bg-muted"} rounded w-full`}></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return <CandidateContentInner candidateId={candidateId} isDarkMode={isDarkMode} />
}
