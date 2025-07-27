"use client"

import { Search, ChevronDown, MoreHorizontal, Heart, MessageSquare, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"

export default function Component() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Header */}
      <header
        className={`border-b transition-colors duration-200 px-4 py-3 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <img src="/images/nouncil-logo.webp" alt="Nouncil Logo" className="w-10 h-10 object-contain" />
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={toggleDarkMode}
              className={`p-2 ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              className={`flex items-center gap-2 ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}`}
            >
              New <ChevronDown className="w-4 h-4" />
            </Button>

            <div className={`flex items-center gap-2 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <span>Treasury ≥ 2,766</span>
            </div>

            <Avatar className="w-8 h-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback className={isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}>
                FB
              </AvatarFallback>
            </Avatar>
            <span className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>fattybuthappy.eth</span>
            <ChevronDown className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="col-span-8">
            {/* Search */}
            <div className="relative mb-6">
              <Search
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
              />
              <Input
                placeholder="Search..."
                className={`pl-10 border-0 rounded-lg transition-colors duration-200 ${
                  isDarkMode
                    ? "bg-gray-800 text-gray-200 placeholder-gray-500"
                    : "bg-gray-100 text-gray-900 placeholder-gray-500"
                }`}
              />
            </div>

            {/* Navigation Tabs */}
            <div
              className={`flex gap-6 mb-6 border-b transition-colors duration-200 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <button className="pb-3 border-b-2 border-blue-600 text-blue-600 font-medium">Digest</button>
              <button
                className={`pb-3 hover:text-blue-600 transition-colors ${isDarkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}
              >
                Proposals
              </button>
              <button
                className={`pb-3 hover:text-blue-600 transition-colors ${isDarkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}
              >
                Topics
              </button>
              <button
                className={`pb-3 hover:text-blue-600 transition-colors ${isDarkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}
              >
                Candidates
              </button>
              <button
                className={`pb-3 hover:text-blue-600 transition-colors ${isDarkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}
              >
                Voters
              </button>
            </div>

            {/* Hide Activity Toggle */}
            <div className="flex items-center gap-2 mb-6">
              <Button
                variant="ghost"
                size="sm"
                className={`transition-colors ${isDarkMode ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800" : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"}`}
              >
                Hide Auction bids and Flows activity <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Activity Feed */}
            <div className="space-y-4">
              {/* Activity Item 1 */}
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border transition-colors duration-200 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback className={isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}>
                    C
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                      chicag0x.eth
                    </span>
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>updated</span>
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Candidate</span>
                    <span className="text-red-600">🏒 Chicago Curling Club</span>
                    <span className="text-red-600">🔺</span>
                    <span className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
                      "Nounsvitational" Mixed Doubles Cashspiel
                    </span>
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>4h</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className={`text-sm mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Lowered ask and changed it to USDC. Also included asking of Transfer of Noun #904
                  </p>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Activity Item 2 */}
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border transition-colors duration-200 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-xs">
                  •
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                      Proposal 836:
                    </span>
                    <span className="text-red-600">🏒 Noundry: Add Walrus Head</span>
                    <span className="text-red-600 font-medium">was defeated</span>
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>7h</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Activity Item 3 */}
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border transition-colors duration-200 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback className={isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}>
                    D
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                      deepdarkhole.eth
                    </span>
                    <span className="text-green-600 font-medium">voted for (6)</span>
                    <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>836:</span>
                    <span className="text-red-600">🏒 Noundry: Add Walrus Head</span>
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>9h</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Activity Item 4 */}
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border transition-colors duration-200 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback className={isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}>
                    O
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>0xishal.eth</span>
                    <span className="text-red-600 font-medium">revoted for (1)</span>
                    <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>836:</span>
                    <span className="text-red-600">🏒 Noundry: Add Walrus Head</span>
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>11h</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>

                  <div
                    className={`rounded-lg p-3 mb-3 transition-colors duration-200 ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-medium text-sm ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                        sasqwash.eth
                      </span>
                      <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>(for):</span>
                      <span className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        one of the coolest features of nouns is our ability to keep evolving the body o...
                      </span>
                      <ChevronDown className={`w-4 h-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
                    </div>
                  </div>

                  <p className={`text-sm mb-3 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Amiyoko san is one of the most dedicated artists to Nouns and I think this Walrus is an amazing
                    work!
                  </p>

                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="ml-1">(1)</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Activity Item 5 */}
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border transition-colors duration-200 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback className={isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}>
                    N
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>nogs.eth</span>
                    <span className="text-red-600 font-medium">voted against (7)</span>
                    <span className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>836:</span>
                    <span className="text-red-600">🏒 Noundry: Add Walrus Head</span>
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>13h</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>

                  <p className={`text-sm mb-3 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Votes from 5nogs holders 🏒🏒🏒🏒🏒
                  </p>

                  <div
                    className={`rounded-lg p-3 transition-colors duration-200 ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}
                  >
                    <div className={`font-medium text-sm mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                      FOR: 3.28M 5nogs
                    </div>
                    <div className={`font-medium text-sm ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                      AGAINST: 394.47M 5
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-4">
            <div className="space-y-6">
              {/* Not Yet Voted */}
              <Card
                className={`transition-colors duration-200 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ChevronDown className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
                    <h3 className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>NOT YET VOTED</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className={`text-sm mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Prop 837 by nouncil.eth
                      </div>
                      <div className={`font-medium text-sm mb-2 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                        Nouncil Client: Approve ID 22
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          ONGOING
                        </Badge>
                        <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>0 ↑ / 105</span>
                        <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>0 ↓</span>
                        <span className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                          Ends in 3 days
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* New Candidates */}
              <Card
                className={`transition-colors duration-200 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ChevronDown className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
                    <h3 className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>NEW CANDIDATES</h3>
                    <span className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                      — Created within the last 7 days
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className={`text-sm mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Candidate 724 by brettdrawsstuff.eth
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-red-600">🏒</span>
                        <span className={`font-medium text-sm ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                          Noundry: Add Pants-Brown Accessory
                        </span>
                      </div>
                      <div className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                        Created 2 days ago
                      </div>
                    </div>

                    <div>
                      <div className={`text-sm mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Candidate 723 by peteorigin.eth — Sponsor threshold met
                      </div>
                      <div className={`font-medium text-sm mb-1 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                        Unstake 1,000 stETH
                      </div>
                      <div className={`text-xs mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                        Last comment 2 days ago 🏒
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-blue-600 hover:text-blue-700 ${isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                    >
                      Show 1 more...
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Other Active Candidates */}
              <Card
                className={`transition-colors duration-200 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <ChevronDown className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
                    <h3 className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                      OTHER ACTIVE CANDIDATES
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className={`text-sm mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Candidate 536 by chicag0x.eth
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-red-600">🏒</span>
                        <span className={`font-medium text-sm ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                          Chicago Curling Club
                        </span>
                        <span className="text-red-600">🔺</span>
                        <span className={`font-medium text-sm ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                          "Nounsvitational" Mixed Doubles Cashspiel
                        </span>
                      </div>
                      <div className={`text-xs mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                        Last updated today at 2:17 AM 🏒
                      </div>
                    </div>

                    <div>
                      <div className={`text-sm mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        Candidate 698 by billbutter.eth
                      </div>
                      <div className={`font-medium text-sm ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                        Grant Application: Crowdfunding Module for Conditional Funding Market (CFM)
                      </div>
                    </div>
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
