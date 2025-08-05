"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { ConnectKitButton } from "connectkit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search, X, ExternalLink, Clock, Users, ThumbsUp, ThumbsDown, Minus } from "lucide-react"
import { TreasuryDropdown } from "./treasury-dropdown"
import { useNounsProposals } from "@/hooks/useNounsProposals"
import { useSubgraphProposals, getProposalTitle, formatProposalDescription } from "@/hooks/useSubgraphProposals"
import { formatDistanceToNow } from "date-fns"

interface LiveGovernanceDashboardProps {
  isDarkMode?: boolean
}

export function LiveGovernanceDashboard({ isDarkMode = true }: LiveGovernanceDashboardProps) {
  const { address, isConnected } = useAccount()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("proposals")

  // Fetch proposals from Nouns subgraph
  const { proposals: subgraphProposals, isLoading: subgraphLoading, error: subgraphError } = useSubgraphProposals(100, 0)

  // Helper function to get proposal title
  const getProposalTitle = (description: string): string => {
    const lines = description.split('\n')
    const firstLine = lines[0]?.trim()
    return firstLine && firstLine.length > 0 ? firstLine : "Untitled Proposal"
  }

  // Helper function to check if proposal matches search
  const matchesSearch = (proposal: any) => {
    if (!searchQuery) return true
    
    const title = getProposalTitle(proposal.description)
    const proposalNumber = proposal.id
    
    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposalNumber.toString().includes(searchQuery)
    )
  }

  // Filter proposals based on search query
  const filteredProposals = subgraphProposals.filter(matchesSearch)

  const formatVotes = (votes: string | number) => {
    const votesNumber = typeof votes === 'string' ? parseInt(votes) : votes
    if (votesNumber >= 1000000) {
      return `${(votesNumber / 1000000).toFixed(1)}M`
    } else if (votesNumber >= 1000) {
      return `${(votesNumber / 1000).toFixed(1)}K`
    }
    return votesNumber.toString()
  }

  const getProposalStatus = (status: string) => {
    const colors = {
      PENDING: "bg-yellow-100 text-yellow-800",
      ACTIVE: "bg-green-100 text-green-800",
      CANCELED: "bg-gray-100 text-gray-800",
      DEFEATED: "bg-red-100 text-red-800",
      SUCCEEDED: "bg-blue-100 text-blue-800",
      QUEUED: "bg-purple-100 text-purple-800",
      EXPIRED: "bg-gray-100 text-gray-800",
      EXECUTED: "bg-green-100 text-green-800",
    }
    return { status, color: colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800" }
  }

  const renderProposalCard = (proposal: any) => {
    const title = getProposalTitle(proposal.description)
    const description = formatProposalDescription(proposal.description)
    const { status, color } = getProposalStatus(proposal.status || "PENDING")
    
    const forVotes = proposal.forVotes ? parseInt(proposal.forVotes) : 0
    const againstVotes = proposal.againstVotes ? parseInt(proposal.againstVotes) : 0
    const abstainVotes = proposal.abstainVotes ? parseInt(proposal.abstainVotes) : 0
    const totalVotes = forVotes + againstVotes + abstainVotes
    
    const forPercentage = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0
    const againstPercentage = totalVotes > 0 ? (againstVotes / totalVotes) * 100 : 0
    const abstainPercentage = totalVotes > 0 ? (abstainVotes / totalVotes) * 100 : 0

    return (
      <Card key={proposal.id} className={`${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className={isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}>
                  #{proposal.id}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className={`text-lg ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                  {title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={color}>{status}</Badge>
                  <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Client ID: {proposal.clientId || "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://etherscan.io/address/0x6f3E6272A167e8AcCb32072d08E0957F9c79223d`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            {description.length > 200 ? `${description.substring(0, 200)}...` : description}
          </div>

          <div className="space-y-3">
            {/* For votes */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                  <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                    For ({formatVotes(forVotes)})
                  </span>
                </div>
                <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                  {forPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={forPercentage} className="h-2" />
            </div>

            {/* Against votes */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ThumbsDown className="w-4 h-4 text-red-600" />
                  <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                    Against ({formatVotes(againstVotes)})
                  </span>
                </div>
                <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                  {againstPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={againstPercentage} className="h-2" />
            </div>

            {/* Abstain votes */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-gray-600" />
                  <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                    Abstain ({formatVotes(abstainVotes)})
                  </span>
                </div>
                <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                  {abstainPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={abstainPercentage} className="h-2" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
                <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                  {proposal.endBlock ? `Ends at block ${proposal.endBlock}` : "No deadline"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Users className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
                <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                  {formatVotes(totalVotes)} total votes
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/governance?proposal=${proposal.id}`, '_blank')}
              className={isDarkMode ? "border-gray-600" : ""}
            >
              View & Vote
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (subgraphLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            Loading proposals from Nouns subgraph...
          </p>
        </div>
      </div>
    )
  }

  if (subgraphError) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">Error loading proposals</div>
        <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
          {subgraphError}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
            Nouns DAO Governance
          </h1>
          <p className={`mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            Real-time proposal tracking and voting powered by Nouns subgraph
          </p>
        </div>
        <div className="flex items-center gap-4">
          <TreasuryDropdown isDarkMode={isDarkMode} />
          <ConnectKitButton />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
        <Input
          type="text"
          placeholder="Search proposals by number or title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`pl-10 pr-10 ${isDarkMode ? "bg-gray-800 border-gray-600" : ""}`}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-2 ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="space-y-4">
          {searchQuery && (
            <div className="mb-4">
              <h3 className={`font-semibold mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                Search Results
              </h3>
              {filteredProposals.length === 0 ? (
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  No proposals found matching "{searchQuery}"
                </p>
              ) : filteredProposals.length > 20 ? (
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Showing first 20 of {filteredProposals.length} results. Try a more specific search.
                </p>
              ) : (
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Found {filteredProposals.length} proposal{filteredProposals.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-6">
            {filteredProposals.slice(0, 20).map(renderProposalCard)}
          </div>

          {filteredProposals.length === 0 && !searchQuery && (
            <div className="text-center py-8">
              <p className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                No proposals available from Nouns subgraph
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          <div className="text-center py-8">
            <p className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              Candidate information will be available soon
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
