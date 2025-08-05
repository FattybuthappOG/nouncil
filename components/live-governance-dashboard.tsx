"use client"

import { Search, ChevronDown, Moon, Sun, Wallet, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { ConnectKitButton } from "connectkit"
import { useGovernorData, useRealtimeEvents } from "../hooks/useContractData"
import { useNounsProposals } from "../hooks/useNounsProposals"
import { TreasuryDropdown } from "./treasury-dropdown"
import { ProposalVotingCard } from "./proposal-voting-card"
import { NounsProposalCard } from "./nouns-proposal-card"
import { VotingPowerDisplay } from "./voting-power-display"

export default function LiveGovernanceDashboard() {
  const [isDarkMode, setIsDarkMode] = useState(true) // Default to dark mode
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [address, setAddress] = useState<string | undefined>(undefined)
  const [isConnected, setIsConnected] = useState(false)

  // Contract data hooks
  const { proposalCount, votingPeriod, proposalThreshold, isLoading: governorLoading } = useGovernorData()
  const { recentVotes, recentProposals } = useRealtimeEvents()
  
  // Nouns DAO proposals
  const { proposals: nounsProposals, loading: nounsLoading, error: nounsError } = useNounsProposals(10, 0)

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return "just now"
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  // Generate array of recent proposal IDs to display
  const recentProposalIds = Array.from({ length: Math.min(proposalCount, 5) }, (_, i) => proposalCount - i).filter(
    (id) => id > 0,
  )

  // Mobile Sidebar Component
  const MobileSidebar = () => (
    <div className="space-y-6">
      {/* Active Proposals */}
      <Card
        className={`transition-colors duration-200 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ChevronDown className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
            <h3 className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>ACTIVE PROPOSALS</h3>
          </div>

          <div className="space-y-3">
            {recentProposalIds.slice(0, 3).map((proposalId) => (
              <div key={proposalId}>
                <div className={`text-sm mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Proposal {proposalId}
                </div>
                <div className={`font-medium text-sm mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                  {proposalId === 22
                    ? "Nouncil Client: Approve ID 22"
                    : proposalId === 21
                      ? "Treasury Management Update"
                      : `Governance Proposal ${proposalId}`}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    ACTIVE
                  </Badge>
                </div>
              </div>
            ))}

            {!isConnected && (
              <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Connect wallet to see your voting status
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Header */}
      <header
        className={`border-b transition-colors duration-200 px-4 py-3 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <img
              src="/images/nouncil-logo.webp"
              alt="Nouncil Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
            />

            {/* Mobile Menu Button */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`md:hidden ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className={`w-80 p-6 ${isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <MobileSidebar />
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              onClick={toggleDarkMode}
              size="sm"
              className={`p-2 ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* Discord Button - Replaced "New" button */}
            <Button
              variant="ghost"
              size="sm"
              className={`hidden sm:flex items-center gap-2 ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}`}
              onClick={() => window.open("https://discord.gg/j3EZaBFj", "_blank")}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium">Discord Community Calls</span>
                <span className="text-xs opacity-75">Every Thursdays at 10am EST</span>
              </div>
            </Button>

            <TreasuryDropdown isDarkMode={isDarkMode} />

            <ConnectKitButton.Custom>
              {({ isConnected, show, truncatedAddress, ensName }) => {
                return (
                  <Button
                    onClick={show}
                    variant="ghost"
                    size="sm"
                    className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {isConnected ? (ensName ?? truncatedAddress) : "Connect Wallet"}
                    </span>
                    <span className="sm:hidden">
                      {isConnected ? (ensName?.slice(0, 8) ?? truncatedAddress?.slice(0, 6)) : "Connect"}
                    </span>
                  </Button>
                )
              }}
            </ConnectKitButton.Custom>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          {/* Left Column - Main Content */}
          <div className="md:col-span-8">
            {/* Search */}
            <div className="relative mb-4 sm:mb-6">
              <Search
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
              />
              <Input
                placeholder="Search proposals, candidates..."
                className={`pl-10 border-0 rounded-lg transition-colors duration-200 ${
                  isDarkMode
                    ? "bg-gray-800 text-gray-200 placeholder-gray-500"
                    : "bg-gray-100 text-gray-900 placeholder-gray-500"
                }`}
              />
            </div>

            {/* Navigation Tabs - Horizontal scroll on mobile */}
            <div
              className={`flex gap-4 sm:gap-6 mb-4 sm:mb-6 border-b transition-colors duration-200 overflow-x-auto pb-3 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <button className="pb-3 border-b-2 border-blue-600 text-blue-600 font-medium whitespace-nowrap">
                Digest
              </button>
              <button
                className={`pb-3 hover:text-blue-600 transition-colors whitespace-nowrap ${isDarkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}
              >
                Proposals ({proposalCount})
              </button>
              <button
                className={`pb-3 hover:text-blue-600 transition-colors whitespace-nowrap ${isDarkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}
              >
                Candidates
              </button>
              <button
                className={`pb-3 hover:text-blue-600 transition-colors whitespace-nowrap ${isDarkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}
              >
                Voters
              </button>
            </div>

            {/* Building for You Section */}
            <div
              className={`mb-6 p-6 rounded-lg border transition-colors duration-200 text-center ${
                isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                <img
                  src="/building-for-you.gif"
                  alt="Building for you animation"
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg"
                />
                <div>
                  <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                    We're Building For You! 🚧
                  </h3>
                  <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    New features for Proposals, Candidates, and Voters are coming soon. Stay tuned!
                  </p>
                </div>
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="space-y-3 sm:space-y-4">
              {/* Nouns DAO Proposals */}
              {nounsLoading ? (
                <div className={`p-6 rounded-lg border text-center ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                  <div className={`text-lg ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Loading Nouns DAO proposals...</div>
                </div>
              ) : nounsError ? (
                <div className={`p-6 rounded-lg border text-center ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                  <div className={`text-lg text-red-500`}>Error loading proposals: {nounsError}</div>
                </div>
              ) : (
                <>
                  <div className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                    Nouns DAO Proposals
                  </div>
                  {nounsProposals.map((proposal) => (
                    <NounsProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      isDarkMode={isDarkMode}
                      onVote={(proposalId, support) => {
                        console.log(`Voting ${support === 1 ? 'for' : 'against'} proposal ${proposalId}`)
                        // TODO: Implement actual voting logic
                      }}
                    />
                  ))}
                </>
              )}

              {/* Recent Proposals with Voting */}
              {recentProposalIds.map((proposalId) => (
                <ProposalVotingCard
                  key={proposalId}
                  proposalId={proposalId}
                  isDarkMode={isDarkMode}
                  title={
                    proposalId === 22
                      ? "Nouncil Client: Approve ID 22"
                      : proposalId === 21
                        ? "Treasury Management Update"
                        : proposalId === 20
                          ? "Governance Parameter Adjustment"
                          : `Governance Proposal ${proposalId}`
                  }
                  description={
                    proposalId === 22
                      ? "Approve the Nouncil client implementation for enhanced governance functionality."
                      : proposalId === 21
                        ? "Update treasury management protocols and asset allocation strategies."
                        : proposalId === 20
                          ? "Adjust voting period and quorum requirements for improved governance."
                          : `Proposal ${proposalId} description and details for community consideration.`
                  }
                />
              ))}

              {/* Recent Votes */}
              {recentVotes.slice(0, 5).map((vote, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 sm:p-4 rounded-lg border transition-colors duration-200 ${
                    isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                  }`}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={`/placeholder.svg?height=32&width=32&query=${vote.voter}`} />
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
                      <span className={`font-medium text-sm ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                        Proposal {vote.proposalId}
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
              {recentProposals.slice(0, 3).map((proposal, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 sm:p-4 rounded-lg border transition-colors duration-200 ${
                    isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                  }`}
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">
                    P
                  </div>
                  <div className="flex-1 min-w-0">
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

          {/* Right Sidebar - Hidden on mobile, shown in sheet */}
          <div className="hidden md:block md:col-span-4">
            <div className="space-y-6">
              {/* Voting Power Display */}
              <VotingPowerDisplay isDarkMode={isDarkMode} />
              
              {/* Active Proposals */}
              <Card
                className={`transition-colors duration-200 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ChevronDown className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
                    <h3 className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                      ACTIVE PROPOSALS
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {recentProposalIds.slice(0, 3).map((proposalId) => (
                      <div key={proposalId}>
                        <div className={`text-sm mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                          Proposal {proposalId}
                        </div>
                        <div className={`font-medium text-sm mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                          {proposalId === 22
                            ? "Nouncil Client: Approve ID 22"
                            : proposalId === 21
                              ? "Treasury Management Update"
                              : `Governance Proposal ${proposalId}`}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            ACTIVE
                          </Badge>
                        </div>
                      </div>
                    ))}

                    {!isConnected && (
                      <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Connect wallet to see your voting status
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
