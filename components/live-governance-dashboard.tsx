"use client"

import { Search, Moon, Sun, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { TreasuryDropdown } from "./treasury-dropdown"
import { ProposalVotingCard } from "./proposal-voting-card"

export default function LiveGovernanceDashboard() {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [proposalCount, setProposalCount] = useState(0)
  const [recentVotes, setRecentVotes] = useState([])
  const [recentProposals, setRecentProposals] = useState([])

  useEffect(() => {
    setIsMounted(true)
    // Simulate fetching data for proposalCount, recentVotes, and recentProposals
    setProposalCount(25)
    setRecentVotes([
      { voter: "0x1234567890abcdef", support: 1, weight: 100, timestamp: Date.now() - 3600000, reason: "Great idea!" },
      { voter: "0x0987654321fedcba", support: 0, weight: 75, timestamp: Date.now() - 7200000 },
      {
        voter: "0xabcdef1234567890",
        support: 2,
        weight: 50,
        timestamp: Date.now() - 10800000,
        reason: "Needs more details.",
      },
    ])
    setRecentProposals([
      {
        proposalId: 22,
        proposer: "0x1234567890abcdef",
        timestamp: Date.now() - 3600000,
        description: "Approve the Nouncil client implementation for enhanced governance functionality.",
      },
      {
        proposalId: 21,
        proposer: "0x0987654321fedcba",
        timestamp: Date.now() - 7200000,
        description: "Update treasury management protocols and asset allocation strategies.",
      },
      {
        proposalId: 20,
        proposer: "0xabcdef1234567890",
        timestamp: Date.now() - 10800000,
        description: "Adjust voting period and quorum requirements for improved governance.",
      },
    ])
  }, [])

  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect, connectors } = useConnect()

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleConnectWallet = () => {
    if (isConnected) {
      disconnect()
    } else {
      const connector = connectors[0]
      if (connector) {
        connect({ connector })
      }
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return "just now"
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  const recentProposalIds = Array.from({ length: Math.min(proposalCount, 5) }, (_, i) => proposalCount - i).filter(
    (id) => id > 0,
  )

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

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
          setIsMobileMenuOpen(false)
        }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0 a.074.074 0 0 1 .077.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
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
          setIsMobileMenuOpen(false)
        }}
      >
        Delegate to Nouncil
      </Button>

      <div onClick={() => setIsMobileMenuOpen(false)}>
        <TreasuryDropdown isDarkMode={isDarkMode} />
      </div>

      <Button
        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium mt-2"
        onClick={() => {
          window.open("https://togatime.cloudnouns.com/", "_blank")
          setIsMobileMenuOpen(false)
        }}
      >
        Generate Toga PFP
      </Button>
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
            <img src="/images/logo.webp" alt="Nouncil Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
          </div>

          {/* Connect Wallet Button */}
          <div className="flex items-center gap-2">
            {/* Menu Button - Now visible on all screens */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
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

            {/* Connect Wallet Button - Always visible next to menu */}
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
                {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : "Connect Wallet"}
              </span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <div>
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
          </div>

          {/* Live Activity Feed */}
          <div className="space-y-3 sm:space-y-4">
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
