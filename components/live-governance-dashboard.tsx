"use client"

import { Search, Moon, Sun, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState, useEffect, useMemo } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { TreasuryDropdown } from "./treasury-dropdown"
import { ProposalVotingCard } from "./proposal-voting-card"
import { CandidateCard } from "./candidate-card"
import { useCandidateIds, useProposalIds } from "@/hooks/useContractData"
import { EnsDisplay } from "./ens-display"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

export function LiveGovernanceDashboard() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [isMounted, setIsMounted] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showWalletDialog, setShowWalletDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<"proposals" | "candidates">("proposals")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [displayedProposals, setDisplayedProposals] = useState(15)
  const [displayedCandidates, setDisplayedCandidates] = useState(15)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [recentVotes, setRecentVotes] = useState([])
  const [recentProposals, setRecentProposals] = useState([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false) // Declare showSearchDropdown here
  const [isSearching, setIsSearching] = useState(false) // Declare setIsSearching here
  const [visibleProposalCount, setVisibleProposalCount] = useState(0)
  const [visibleCandidateCount, setVisibleCandidateCount] = useState(0)

  const { proposalIds, totalCount: totalProposals, isLoading: proposalsLoading } = useProposalIds(displayedProposals)
  const { candidates, totalCount: totalCandidates, isLoading: candidatesLoading } = useCandidateIds(displayedCandidates)
  const safeCandidates = candidates || []

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleConnectWallet = () => {
    if (isConnected) {
      disconnect()
    } else {
      setShowWalletDialog(true)
    }
  }

  const handleSelectConnector = (connector: any) => {
    connect({ connector })
    setShowWalletDialog(false)
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return "just now"
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    setIsSearching(true)

    if (query.trim().length < 2) {
      setSearchResults([])
      setShowSearchDropdown(false)
      setIsSearching(false)
      return
    }

    if (activeTab === "candidates") {
      // Search candidates by number or title
      const matchedCandidates = safeCandidates.filter((candidate, index) => {
        const candidateNumber = totalCandidates - index
        const numberMatch = candidateNumber.toString().includes(query)
        const titleMatch = candidate.description.toLowerCase().includes(query.toLowerCase())
        return numberMatch || titleMatch
      })

      setSearchResults(
        matchedCandidates.slice(0, 10).map((candidate, index) => ({
          id: candidate.id,
          title: candidate.description,
          number: totalCandidates - safeCandidates.findIndex((c) => c.id === candidate.id),
          type: "candidate",
        })),
      )
      setShowSearchDropdown(true)
      setIsSearching(false)
      return
    }

    // Existing proposal search logic
    try {
      console.log("[v0] Searching proposals for:", query)

      // Check if query is a number (proposal ID search)
      const isNumericSearch = /^\d+$/.test(query.trim())

      const response = await fetch(
        "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: isNumericSearch
              ? `
                  query {
                    proposals(
                      first: 10
                      orderBy: createdTimestamp
                      orderDirection: desc
                      where: { id: "${query}" }
                    ) {
                      id
                      description
                      status
                    }
                  }
                `
              : `
                  query {
                    proposals(
                      first: 10
                      orderBy: createdTimestamp
                      orderDirection: desc
                    ) {
                      id
                      description
                      status
                    }
                  }
                `,
          }),
        },
      )

      const data = await response.json()
      console.log("[v0] Search API response:", data)

      if (data?.data?.proposals) {
        let results = data.data.proposals

        // If not numeric search, filter by description in memory
        if (!isNumericSearch) {
          results = results.filter((p: any) => p.description?.toLowerCase().includes(query.toLowerCase()))
        }

        const formattedResults = results.map((p: any) => ({
          id: p.id,
          title:
            p.description
              ?.split("\n")
              .find((line: string) => line.trim().startsWith("#"))
              ?.replace(/^#+\s*/, "")
              .trim() || `Proposal ${p.id}`,
          status: p.status,
          type: "proposal",
        }))

        setSearchResults(formattedResults)
        setShowSearchDropdown(formattedResults.length > 0)
      } else {
        setSearchResults([])
        setShowSearchDropdown(false)
      }
    } catch (error) {
      console.error("[v0] Search error:", error)
      setSearchResults([])
      setShowSearchDropdown(false)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectProposal = (id: string, type: "proposal" | "candidate" = "proposal") => {
    console.log("[v0] Selected:", type, id)
    if (type === "candidate") {
      router.push(`/candidate/${id}`)
    } else {
      router.push(`/proposal/${id}`)
    }
    setSearchQuery("")
    setSearchResults([])
    setShowSearchDropdown(false)
  }

  const safeRecentVotes = recentVotes || []
  const safeRecentProposals = recentProposals || []

  const recentProposalIds = proposalIds?.slice(0, displayedProposals) || []

  const loadMoreProposals = () => {
    setDisplayedProposals((prev) => prev + 20)
  }

  const loadMoreCandidates = () => {
    setDisplayedCandidates((prev) => prev + 20)
  }

  const hasMoreProposals =
    statusFilter === "all"
      ? displayedProposals < totalProposals
      : visibleProposalCount >= displayedProposals && displayedProposals < totalProposals
  const hasMoreCandidates = displayedCandidates < totalCandidates

  const MobileMenu = () => (
    <div className="flex flex-col gap-3 p-4">
      <Button
        variant="ghost"
        onClick={toggleDarkMode}
        className={`w-full justify-start gap-2 ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}`}
      >
        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
      </Button>

      <Button
        variant="ghost"
        className={`w-full justify-start gap-2 ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}`}
        onClick={() => {
          window.open("https://discord.gg/tnyXJZsGnq", "_blank")
          setShowMobileMenu(false)
        }}
      >
        <img src="/images/discord-logo.svg" alt="Discord" className="w-4 h-4" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">Discord</span>
          <span className="text-xs opacity-75">Thursdays 10am EST</span>
        </div>
      </Button>

      <Button
        variant="ghost"
        className={`w-full justify-start ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}`}
        onClick={() => {
          window.open("https://nouns.wtf/delegate?to=0xcC2688350d29623E2A0844Cc8885F9050F0f6Ed5", "_blank")
          setShowMobileMenu(false)
        }}
      >
        Delegate to Nouncil
      </Button>

      <div onClick={() => setShowMobileMenu(false)}>
        <TreasuryDropdown isDarkMode={isDarkMode} />
      </div>

      <Button
        variant="ghost"
        className={`w-full justify-start gap-2 ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}`}
        onClick={() => {
          window.open("https://nouns.world/", "_blank")
          setShowMobileMenu(false)
        }}
      >
        <img src="/images/nounsworld.gif" alt="Nouns World" className="w-5 h-5" />
        <span>Learn about Nouns</span>
      </Button>

      <Button
        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium mt-2"
        onClick={() => {
          window.open("https://togatime.cloudnouns.com/", "_blank")
          setShowMobileMenu(false)
        }}
      >
        Generate Toga PFP
      </Button>
    </div>
  )

  const filteredProposalIds = useMemo(() => {
    if (statusFilter === "all") {
      return recentProposalIds
    }
    // Filter will be applied when rendering individual cards
    return recentProposalIds.filter((id) => {
      // Assuming ProposalVotingCard has a way to check status
      // This is a placeholder implementation
      const proposal = { status: "ACTIVE" } // Replace with actual proposal data fetching logic
      return proposal.status === statusFilter
    })
  }, [recentProposalIds, statusFilter])

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Header */}
      <header
        className={`border-b transition-colors duration-200 px-4 py-3 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <img src="/images/logo.webp" alt="Nouncil Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
          </div>

          {/* Connect Wallet Button */}
          <div className="flex items-center gap-2">
            {/* Connect Wallet Button - Now before menu */}
            <Button
              onClick={handleConnectWallet}
              variant="ghost"
              size="sm"
              className={`flex items-center gap-2 ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              <span className="hidden sm:inline">
                {isConnected ? <EnsDisplay address={address} /> : "Connect Wallet"}
              </span>
            </Button>

            {/* Menu Button - Now after wallet button */}
            <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className={`w-80 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <MobileMenu />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Wallet Connection Dialog */}
      {showWalletDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowWalletDialog(false)}
        >
          <div
            className={`rounded-xl p-6 max-w-md w-full ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Connect Wallet</h3>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleSelectConnector(connector)}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                    isDarkMode
                      ? "border-gray-700 hover:bg-gray-700 text-white"
                      : "border-gray-200 hover:bg-gray-50 text-gray-900"
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <span className="font-medium">{connector.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWalletDialog(false)}
              className={`w-full mt-4 p-3 rounded-lg ${
                isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <div>
          {/* Search */}
          <div className="relative mb-4 sm:mb-6">
            <Search
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
            />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              placeholder={
                activeTab === "proposals"
                  ? "Search proposals by number or title..."
                  : "Search candidates by number or title..."
              }
              className={`pl-10 border-0 rounded-lg transition-colors duration-200 ${
                isDarkMode
                  ? "bg-gray-800 text-gray-200 placeholder-gray-500"
                  : "bg-gray-100 text-gray-900 placeholder-gray-500"
              }`}
            />

            {/* Search Results Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div
                className={`absolute left-0 right-0 mt-2 rounded-lg border shadow-lg z-50 max-h-80 overflow-y-auto ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectProposal(result.id, result.type || "proposal")}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {result.type === "candidate" ? `Candidate #${result.number}` : `#${result.number}`}
                      </Badge>
                      <span className={`font-medium ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
                        {result.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Tabs - Horizontal scroll on mobile */}
          <div
            className={`flex items-center justify-between gap-4 mb-4 sm:mb-6 border-b transition-colors duration-200 pb-3 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
          >
            <div className="flex gap-4 sm:gap-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab("proposals")}
                className={`pb-3 transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === "proposals"
                    ? isDarkMode
                      ? "border-blue-500 text-blue-400"
                      : "border-blue-600 text-blue-600"
                    : isDarkMode
                      ? "border-transparent text-gray-400 hover:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Proposals ({totalProposals})
              </button>
              <button
                onClick={() => setActiveTab("candidates")}
                className={`pb-3 transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === "candidates"
                    ? isDarkMode
                      ? "border-blue-500 text-blue-400"
                      : "border-blue-600 text-blue-600"
                    : isDarkMode
                      ? "border-transparent text-gray-400 hover:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Candidates ({totalCandidates})
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isDarkMode
                  ? "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              } border`}
            >
              <option value="all">Show All</option>
              <option value="ACTIVE">Active</option>
              <option value="EXECUTED">Executed</option>
              <option value="DEFEATED">Defeated</option>
            </select>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {activeTab === "proposals" && (
              <>
                {proposalsLoading ? (
                  <div className="text-center py-12 text-gray-500">Loading proposals...</div>
                ) : filteredProposalIds.length > 0 ? (
                  <>
                    {filteredProposalIds.map((proposalId) => (
                      <ProposalVotingCard
                        key={proposalId}
                        proposalId={proposalId}
                        isDarkMode={isDarkMode}
                        statusFilter={statusFilter}
                        onVisibilityChange={(visible) => {
                          if (visible) {
                            setVisibleProposalCount((prev) => prev + 1)
                          }
                        }}
                      />
                    ))}
                    {hasMoreProposals && (
                      <div className="col-span-full flex justify-center mt-6">
                        <button
                          onClick={loadMoreProposals}
                          className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                            isDarkMode
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-blue-500 hover:bg-blue-600 text-white"
                          }`}
                        >
                          Load 20 More Proposals
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">No proposals found</div>
                )}
              </>
            )}

            {activeTab === "candidates" && (
              <>
                {candidatesLoading ? (
                  <div
                    className={`flex items-center justify-center p-8 rounded-lg border ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-gray-400"
                        : "bg-white border-gray-200 text-gray-500"
                    }`}
                  >
                    <p>Loading candidates from Nouns DAO...</p>
                  </div>
                ) : safeCandidates.length > 0 ? (
                  <>
                    {safeCandidates.map((candidate, index) => (
                      <CandidateCard
                        key={candidate.id}
                        candidateId={candidate.id}
                        isDarkMode={isDarkMode}
                        candidateNumber={totalCandidates - index}
                      />
                    ))}
                    {hasMoreCandidates && (
                      <div className="col-span-full flex justify-center mt-6">
                        <button
                          onClick={loadMoreCandidates}
                          className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                            isDarkMode
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-blue-500 hover:bg-blue-600 text-white"
                          }`}
                        >
                          Load 20 More Candidates
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className={`flex items-center justify-center p-8 rounded-lg border ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 text-gray-400"
                        : "bg-white border-gray-200 text-gray-500"
                    }`}
                  >
                    <p>No candidates found</p>
                  </div>
                )}
              </>
            )}

            {/* Recent Votes */}
            {safeRecentVotes.slice(0, 5).map((vote, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 sm:p-4 rounded-lg border transition-colors duration-200 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={`/ceholder-svg-key-ekuyz.jpg?key=ekuyz&key=dsa9a&height=32&width=32`} />
                  <AvatarFallback className={isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}>
                    {vote.voter?.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                    <span
                      className={`font-medium text-sm sm:text-base truncate ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}
                    >
                      {vote.voter?.slice(0, 6)}...{vote.voter?.slice(-4)}
                    </span>
                    <span
                      className={`font-medium text-sm ${vote.support === 1 ? "text-green-600" : vote.support === 0 ? "text-red-600" : "text-yellow-600"}`}
                    >
                      {vote.support === 1 ? "voted for" : vote.support === 0 ? "voted against" : "abstained"} (
                      {vote.weight})
                    </span>
                    <span className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {formatTimeAgo(vote.timestamp)}
                    </span>
                  </div>
                  {vote.reason && (
                    <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>"{vote.reason}"</p>
                  )}
                </div>
              </div>
            ))}

            {/* Recent Proposal Creations */}
            {safeRecentProposals.slice(0, 3).map((proposal, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 sm:p-4 rounded-lg border transition-colors duration-200 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">
                  P
                </div>
                <div className="flex-1 min-width-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                    <span
                      className={`font-medium text-sm sm:text-base ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}
                    >
                      New Proposal {proposal.proposalId}:
                    </span>
                    <span className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      by {proposal.proposer?.slice(0, 6)}...{proposal.proposer?.slice(-4)}
                    </span>
                    <span className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {formatTimeAgo(proposal.timestamp)}
                    </span>
                  </div>
                  <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    {proposal.description?.slice(0, 100)}...
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveGovernanceDashboard
