"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Users, MessageSquare, Clock, ExternalLink } from "lucide-react"
import EnsDisplay from "@/components/ens-display"
import ReactMarkdown from "react-markdown"
import { useCandidateData, useCandidateSignatures } from "@/hooks/useContractData"

export default function CandidateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const candidateId = params.id as string
  const [mounted, setMounted] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)

  const candidate = useCandidateData(candidateId)
  const signatures = useCandidateSignatures(candidateId)

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

  const {
    description: title,
    fullDescription: description,
    proposer,
    createdTimestamp,
    targets,
    values,
    signatures: sigs,
    calldatas,
  } = candidate

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-6`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2" onClick={() => router.push("/?tab=candidates")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Candidates
          </Button>
        </div>

        {/* Main Card */}
        <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <h1 className="text-3xl font-bold">{title || `Candidate #${candidateId}`}</h1>
                  <div
                    className={`flex items-center gap-4 text-sm ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}
                  >
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>Proposed by</span>
                      <EnsDisplay address={proposer} />
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(Number(createdTimestamp) * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className={`text-sm ${isDarkMode ? "bg-[#3a3a5a] text-white" : ""}`}>
                  Candidate
                </Badge>
              </div>
            </div>
          </CardHeader>

          <Separator className={isDarkMode ? "bg-[#3a3a5a]" : ""} />

          <CardContent className="pt-6 space-y-6">
            {/* Description */}
            {description && (
              <div className={`prose max-w-none ${isDarkMode ? "prose-invert" : "prose-neutral"}`}>
                <ReactMarkdown>{description}</ReactMarkdown>
              </div>
            )}

            {/* Sponsor History */}
            {signatures && signatures.signatures && signatures.signatures.length > 0 && (
              <>
                <Separator className={isDarkMode ? "bg-[#3a3a5a]" : ""} />
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Sponsor History ({signatures.signatures.length})
                  </h2>
                  <div className="space-y-3">
                    {signatures.signatures.map((sig: any, index: number) => (
                      <Card key={index} className={isDarkMode ? "bg-[#1a1a2e] border-[#3a3a5a]" : "bg-muted/50"}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <EnsDisplay address={sig.signer} />
                                {sig.expirationTimestamp && (
                                  <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-muted-foreground"}`}>
                                    {new Date(Number(sig.expirationTimestamp) * 1000).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {sig.reason && (
                                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-muted-foreground"}`}>
                                  {sig.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Transaction Details */}
            {targets && targets.length > 0 && (
              <>
                <Separator className={isDarkMode ? "bg-[#3a3a5a]" : ""} />
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    Transaction Details
                  </h2>
                  <div className="space-y-2">
                    {targets.map((target: string, index: number) => (
                      <Card key={index} className={isDarkMode ? "bg-[#1a1a2e] border-[#3a3a5a]" : "bg-muted/50"}>
                        <CardContent className="pt-4 space-y-2 font-mono text-sm">
                          <div>
                            <span className={isDarkMode ? "text-gray-400" : "text-muted-foreground"}>Target:</span>{" "}
                            <span className="break-all">{target}</span>
                          </div>
                          {values && values[index] && (
                            <div>
                              <span className={isDarkMode ? "text-gray-400" : "text-muted-foreground"}>Value:</span>{" "}
                              {values[index].toString()}
                            </div>
                          )}
                          {sigs && sigs[index] && (
                            <div>
                              <span className={isDarkMode ? "text-gray-400" : "text-muted-foreground"}>Signature:</span>{" "}
                              {sigs[index]}
                            </div>
                          )}
                        </CardContent>
                      </Card>
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
