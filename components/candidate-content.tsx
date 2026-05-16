"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Users, Clock, MessageSquare, Copy, Pencil, PenLine, Rocket } from "lucide-react"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import EnsDisplay from "@/components/ens-display"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { MediaContentRenderer } from "@/components/media-content-renderer"
import { useCandidateData, useCandidateSignatures } from "@/hooks/useContractData"
import { ActivitySection } from "@/components/activity-section"
import { storeTemplateData } from "@/lib/proposal-replication"
import { TransactionSimulator } from "@/components/transaction-simulator"
import { SponsorCandidateDialog } from "@/components/sponsor-candidate-dialog"
import { PromoteCandidateDialog } from "@/components/promote-candidate-dialog"
import { useProposalThreshold, useVotingPower, calculateTotalVotingPower, filterValidSignatures } from "@/hooks/useSponsor"

function CandidateContentInner({ candidateId, isDarkMode }: { candidateId: string; isDarkMode: boolean }) {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const candidate = useCandidateData(candidateId)
  // Use the resolved candidate.id (full subgraph format) for signatures query
  const resolvedCandidateId = candidate.id || candidateId
  const signatures = useCandidateSignatures(resolvedCandidateId)
  const { threshold } = useProposalThreshold()
  const { votingPower } = useVotingPower(address)

  // Dialog states
  const [sponsorDialogOpen, setSponsorDialogOpen] = useState(false)
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)

  // Calculate sponsor voting power - must be before early returns
  const validSignatures = useMemo(() => {
    if (!signatures.signatures) return []
    return filterValidSignatures(signatures.signatures)
  }, [signatures.signatures])

  // Total voting power = proposer's nouns + sponsor signatures' nouns
  const sponsorVotingPower = useMemo(() => {
    if (!signatures.signatures) return 0
    return calculateTotalVotingPower(signatures.signatures)
  }, [signatures.signatures])

  // Proposer's nouns are automatically counted by the contract
  const proposerVotes = candidate.proposerVotes || 0
  const totalVotingPower = proposerVotes + sponsorVotingPower

  if (candidate.isLoading) {
    return (
      <div className={`min-h-screen overflow-x-hidden ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-4 md:p-6`}>
        <div className="max-w-4xl mx-auto w-full">
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
      <div className={`min-h-screen overflow-x-hidden ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"} p-4 md:p-6`}>
        <div className="max-w-4xl mx-auto w-full">
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

  const data = candidate
  if (!data || !data.id) {
    return null
  }

  // Check if connected wallet is the proposer
  const isProposer = address && data.proposer && address.toLowerCase() === data.proposer.toLowerCase()

  const hasReachedThreshold = totalVotingPower >= threshold
  const canSponsor = isConnected && votingPower > 0 && !data.canceled

  // Extract candidate number from the end of the ID or use a fallback
  const candidateNumber = candidateId.split("-").pop() || candidateId

  return (
    <div className={`min-h-screen overflow-x-hidden ${isDarkMode ? "bg-[#1a1a2e] text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className={`sticky top-0 z-50 backdrop-blur-sm border-b ${isDarkMode ? "bg-[#1a1a2e]/95 border-[#3a3a5a]" : "bg-gray-50/95 border-gray-200"}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${isDarkMode ? "text-gray-300 hover:text-white" : ""}`}
            onClick={() => router.push("/?tab=candidates")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${isDarkMode ? "text-gray-300 hover:text-white" : ""}`}
            onClick={() => {
              const el = document.getElementById("activity-section")
              if (el) {
                const top = el.getBoundingClientRect().top + window.scrollY - 64
                window.scrollTo({ top, behavior: "smooth" })
              }
            }}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${isDarkMode ? "text-gray-300 hover:text-white" : ""}`}
            onClick={() => {
              if (candidate?.id) {
                const url = storeTemplateData({
                  type: "candidate",
                  title: candidate.description || "",
                  description: candidate.fullDescription || "",
                  targets: candidate.targets || [],
                  values: candidate.values?.map((v: any) => v.toString()) || [],
                  signatures: candidate.signatures || [],
                  calldatas: candidate.calldatas || [],
                })
                router.push(url)
              }
            }}
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Use as Template</span>
          </Button>
          {isProposer && !data.canceled && (
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 ${isDarkMode ? "text-gray-300 hover:text-white" : ""}`}
              onClick={() => router.push(`/edit/candidate/${data.slug || candidateId}`)}
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          )}
          <WalletConnectButton compact />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 w-full">

        <Card className={isDarkMode ? "bg-[#252540] border-[#3a3a5a]" : ""}>
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={isDarkMode ? "border-[#3a3a5a] text-gray-300" : ""}>
                  #{candidateNumber}
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Candidate</Badge>
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
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{validSignatures.length} {validSignatures.length === 1 ? "sponsor" : "sponsors"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Created {new Date(data.createdTimestamp * 1000).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Sponsor Progress Section */}
            {!data.canceled && (
              <div className={`p-4 rounded-lg ${isDarkMode ? "bg-[#1a1a2e]" : "bg-muted"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Sponsor Progress</span>
                  <span className={`text-sm ${hasReachedThreshold ? "text-green-400" : "text-gray-400"}`}>
                    {totalVotingPower} / {threshold} votes
                    {proposerVotes > 0 && (
                      <span className="text-xs ml-1">
                        (proposer: {proposerVotes}, sponsors: {sponsorVotingPower})
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all duration-500 ${
                      hasReachedThreshold ? "bg-green-500" : "bg-nouns-blue"
                    }`}
                    style={{
                      width: `${Math.min(100, (totalVotingPower / Math.max(1, threshold)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  {canSponsor && (
                    <Button
                      size="sm"
                      onClick={() => setSponsorDialogOpen(true)}
                      className="gap-2 bg-transparent border border-[#4ade80] text-[#4ade80] hover:bg-[#4ade80]/10 font-semibold"
                    >
                      <PenLine className="h-4 w-4" />
                      Sponsor ({votingPower} {votingPower === 1 ? "vote" : "votes"})
                    </Button>
                  )}
                  {hasReachedThreshold && (
                    <Button
                      size="sm"
                      onClick={() => setPromoteDialogOpen(true)}
                      className="gap-2 bg-[#4ade80] text-black hover:bg-[#4ade80]/90 font-semibold"
                    >
                      <Rocket className="h-4 w-4" />
                      Promote to On-Chain
                    </Button>
                  )}
                  {!isConnected && (
                    <span className="text-sm text-gray-500">Connect wallet to sponsor</span>
                  )}
                  {isConnected && votingPower === 0 && (
                    <span className="text-sm text-gray-500">Hold a Noun to sponsor</span>
                  )}
                </div>
              </div>
            )}

            <Separator className={isDarkMode ? "bg-[#3a3a5a]" : ""} />

            <div>
              <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : ""}`}>Description</h2>
              <div
                className={`prose max-w-none ${isDarkMode ? "prose-invert" : ""} prose-headings:font-bold prose-a:text-blue-400`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: () => null,
                    img: ({ src, alt }) => (
                      <span className="block my-4">
                        <img src={src || "/placeholder.svg"} alt={alt || ""} className="rounded-lg max-w-full h-auto border border-border" loading="lazy" />
                      </span>
                    ),
                    a: ({ href, children }) => {
                      // Check if it's a YouTube link (supports youtube.com/watch?v=, youtu.be/, youtube.com/embed/)
                      const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
                      const youtubeMatch = href?.match(youtubeRegex)
                      if (youtubeMatch) {
                        return (
                          <span className="block my-4">
                            <span className="block relative w-full aspect-video rounded-lg overflow-hidden border border-border">
                              <iframe
                                src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                                title="YouTube video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                              />
                            </span>
                          </span>
                        )
                      }
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {children}
                        </a>
                      )
                    },
                    p: ({ children }) => <div className="mb-4">{children}</div>,
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4 rounded-lg border border-[#3a3a5a]">
                        <table className="min-w-full divide-y divide-[#3a3a5a] text-sm table-auto">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-[#1a1a2e]">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-[#3a3a5a] bg-[#252540]">{children}</tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="hover:bg-[#2a2a4a] transition-colors">{children}</tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-3 text-left font-semibold text-gray-200 border-r border-[#3a3a5a] last:border-r-0">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-3 text-gray-300 border-r border-[#3a3a5a] last:border-r-0">{children}</td>
                    ),
                  }}
                >
                  {data.fullDescription || ""}
                </ReactMarkdown>
              </div>
            </div>

            {/* Transaction Simulator */}
            {data.targets && data.targets.length > 0 && (
              <>
                <Separator className={isDarkMode ? "bg-[#3a3a5a]" : ""} />
                <div>
                  <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : ""}`}>Proposed Transactions</h2>
                  <TransactionSimulator
                    candidateData={{
                      targets: data.targets,
                      values: data.values?.map((v: any) => v.toString()) || [],
                      signatures: data.signatures || [],
                      calldatas: data.calldatas || [],
                    }}
                  />
                </div>
              </>
            )}

          </CardContent>
        </Card>

        {/* Activity Section - Sponsors and Signals for candidates */}
        <ActivitySection candidateId={resolvedCandidateId} isDarkMode={isDarkMode} />
      </div>

      {/* Sponsor Dialog */}
      {candidate && (
        <SponsorCandidateDialog
          open={sponsorDialogOpen}
          onOpenChange={setSponsorDialogOpen}
          candidate={{
            id: candidate.id,
            slug: candidate.slug || candidateId,
            proposer: candidate.proposer,
            targets: candidate.targets || [],
            values: candidate.values?.map((v: any) => v.toString()) || [],
            signatures: candidate.signatures || [],
            calldatas: candidate.calldatas || [],
            description: candidate.fullDescription || candidate.description || "",
            canceled: candidate.canceled || false,
            latestVersion: candidate.latestVersion,
          }}
          onSuccess={() => {
            setSponsorDialogOpen(false)
            // Refresh signatures data
            window.location.reload()
          }}
        />
      )}

      {/* Promote Dialog */}
      {candidate && signatures.signatures && (
        <PromoteCandidateDialog
          open={promoteDialogOpen}
          onOpenChange={setPromoteDialogOpen}
          candidate={{
            id: candidate.id,
            slug: candidate.slug || candidateId,
            proposer: candidate.proposer,
            targets: candidate.targets || [],
            values: candidate.values?.map((v: any) => v.toString()) || [],
            signatures: candidate.signatures || [],
            calldatas: candidate.calldatas || [],
            description: candidate.fullDescription || candidate.description || "",
            canceled: candidate.canceled || false,
            latestVersion: candidate.latestVersion,
          }}
          signatures={signatures.signatures}
          onSuccess={() => {
            setPromoteDialogOpen(false)
            // Navigate to proposals list
            router.push("/?tab=proposals")
          }}
        />
      )}
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

  return <CandidateContentInner candidateId={candidateId} isDarkMode={isDarkMode} />
}
