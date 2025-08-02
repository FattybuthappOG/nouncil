"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Vote, Wallet, AlertCircle } from "lucide-react"
import { useVotingPower } from "@/hooks/useNounsSDK"

interface VotingPowerDisplayProps {
  isDarkMode: boolean
}

export function VotingPowerDisplay({ isDarkMode }: VotingPowerDisplayProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | undefined>(undefined)
  const { votingPower, isLoading } = useVotingPower(address)

  const formatVotingPower = (power: string) => {
    const num = parseInt(power)
    if (num === 0) return '0'
    if (num < 1000) return num.toString()
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`
    return `${(num / 1000000).toFixed(1)}M`
  }

  if (!isConnected) {
    return (
      <Card className={`transition-colors duration-200 ${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Wallet className={`w-5 h-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
            <div>
              <div className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                Connect Wallet
              </div>
              <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Connect your wallet to see your voting power
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`transition-colors duration-200 ${
      isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vote className={`w-5 h-5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
            <div>
              <div className={`font-medium ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                Your Voting Power
              </div>
              <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                {isLoading ? 'Loading...' : `${formatVotingPower(votingPower)} Nouns`}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={`${isDarkMode ? "bg-green-700 text-green-200" : "bg-green-100 text-green-800"}`}>
              Connected
            </Badge>
            {parseInt(votingPower) > 0 && (
              <Badge className={`${isDarkMode ? "bg-blue-700 text-blue-200" : "bg-blue-100 text-blue-800"}`}>
                Can Vote
              </Badge>
            )}
          </div>
        </div>
        
        {parseInt(votingPower) === 0 && isConnected && !isLoading && (
          <div className="flex items-center gap-2 mt-3 p-2 rounded bg-yellow-50 dark:bg-yellow-900/20">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              You need Nouns tokens to vote on proposals
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 