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
import { MediaContentRenderer } from "@/components/media-content-renderer"
import { useLilNounsCandidateData } from "@/hooks/useLilNounsData"

function LilNounsCandidateContentInner({ candidateId, isDarkMode }: { candidateId: string; isDarkMode: boolean }) {
  const router = useRouter()
  const candidate = useLilNounsCandidateData(candidateId)

  if (candidate.isLoading) {
    return (
      <div className={`min-h-screen overflow-x-hidden ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-4 md:p-6`}>
        <div className="max-w-4xl mx-auto w-full">
          <Button variant="ghost" className="mb-6 gap-2" onClick={() => router.push("/lilnouns?tab=candidates")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Lil Nouns Candidates
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
      <div className={`min-h-screen overflow-x-hidden ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-4 md:p-6`}>
        <div className="max-w-4xl mx-auto w-full">
          <Button variant="ghost" className="mb-6 gap-2" onClick={() => router.push("/lilnouns?tab=candidates")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Lil Nouns Candidates
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

  const data = candidate
  if (!data || !data.id) {
    return null
  }

  const candidateNumber = candidateId.split("-").pop() || candidateId

  return (
    <div className={`min-h-screen overflow-x-hidden ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-4 md:p-6`}>
      <div className="max-w-4xl mx-auto w-full">
        <Button
          variant="ghost"
          className={`mb-6 gap-2 ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-[#252540]" : ""}`}
          onClick={() => router.push("/lilnouns?tab=candidates")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lil Nouns Candidates
        </Button>

        <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={isDarkMode ? "border-pink-500/50 text-pink-300" : ""}>
                  #{candidateNumber}
                </Badge>
                <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30">Lil Nouns Candidate</Badge>
              </div>
              <h1 className={`text-2xl font-bold ${isDarkMode ? "text-white" : ""} break-words`}>{data.description}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <span>Proposed by:</span>
                <EnsDisplay address={data.proposer} showAvatar avatarSize={20} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Created {new Date(data.createdTimestamp * 1000).toLocaleDateString()}</span>
              </div>
              <a
                href={`https://lilnouns.wtf/candidates/${candidateId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-pink-400 hover:text-pink-300"
              >
                <ExternalLink className="h-4 w-4" />
                View on lilnouns.wtf
              </a>
            </div>

            <Separator className={isDarkMode ? "bg-[#3a3a5a]" : ""} />

            <div>
              <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : ""}`}>Description</h2>
              <div
                className={`prose max-w-none ${isDarkMode ? "prose-invert" : ""} prose-headings:font-bold prose-a:text-pink-400`}
              >
                <ReactMarkdown
                  components={{
                    h1: () => null,
                    img: ({ src, alt }) => <MediaContentRenderer content={`![${alt}](${src})`} />,
                    a: ({ href, children }) => {
                      const youtubeMatch = href?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
                      if (youtubeMatch) {
                        return (
                          <div className="my-4">
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
                              <iframe
                                src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                                title="YouTube video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                              />
                            </div>
                          </div>
                        )
                      }
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-400 hover:underline"
                        >
                          {children}
                        </a>
                      )
                    },
                    p: ({ children, node }) => {
                      const hasOnlyImage =
                        node?.children?.length === 1 &&
                        node?.children[0]?.type === "element" &&
                        (node?.children[0] as any)?.tagName === "img"
                      if (hasOnlyImage) {
                        return <>{children}</>
                      }
                      return <p className="mb-4">{children}</p>
                    },
                  }}
                >
                  {data.fullDescription || ""}
                </ReactMarkdown>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LilNounsCandidateContent({ candidateId, isDarkMode }: { candidateId: string; isDarkMode: boolean }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`min-h-screen overflow-x-hidden ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-4 md:p-6`}>
        <div className="max-w-4xl mx-auto w-full">
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

  return <LilNounsCandidateContentInner candidateId={candidateId} isDarkMode={isDarkMode} />
}
