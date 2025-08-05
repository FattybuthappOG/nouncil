"use client"

import { ChevronDown, Wallet, TrendingUp, Coins, RefreshCw, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTreasuryData } from "@/hooks/useTreasuryData"

interface TreasuryDropdownProps {
  isDarkMode: boolean
}

export function TreasuryDropdown({ isDarkMode }: TreasuryDropdownProps) {
  const { treasuryData, isLoading, error, refreshData } = useTreasuryData()

  const formatBalance = (balance: string) => {
    const num = Number(balance)
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`
    } else {
      return num.toFixed(4)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}`}
        >
          <Wallet className="w-4 h-4" />
          <span className="hidden sm:inline">Treasury</span>
          <span className="text-xs">
            {isLoading ? "..." : error ? "Error" : `≥ ${formatBalance(treasuryData?.ethBalance || "0")}`}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`w-80 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <DropdownMenuLabel className={`flex items-center justify-between ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
          Treasury Assets (Live)
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshData}
            className="h-6 w-6 p-0"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className={isDarkMode ? "bg-gray-700" : "bg-gray-200"} />

        {error ? (
          <DropdownMenuItem className={`${isDarkMode ? "text-red-400" : "text-red-600"}`}>
            <div className="w-full text-center text-sm">
              Failed to load treasury data
            </div>
          </DropdownMenuItem>
        ) : (
          <>
            {/* ETH Balance */}
            <DropdownMenuItem
              className={`${isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
            >
              <div className="flex items-center gap-3 w-full">
                <Wallet className="w-4 h-4" />
                <div className="flex-1">
                  <div className="font-medium">ETH Balance</div>
                  <div className="text-sm text-muted-foreground">
                    {isLoading ? "Loading..." : `${formatBalance(treasuryData?.ethBalance || "0")} ETH`}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>

            {/* Total USD Value */}
            <DropdownMenuItem
              className={`${isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
            >
              <div className="flex items-center gap-3 w-full">
                <TrendingUp className="w-4 h-4" />
                <div className="flex-1">
                  <div className="font-medium">Estimated Value</div>
                  <div className="text-sm text-muted-foreground">
                    {isLoading ? "Loading..." : `$${treasuryData?.totalValueUSD.toLocaleString() || "0"}`}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>

            {/* Token Balances */}
            {treasuryData?.tokenBalances && treasuryData.tokenBalances.length > 0 && (
              <>
                <DropdownMenuSeparator className={isDarkMode ? "bg-gray-700" : "bg-gray-200"} />
                <DropdownMenuLabel className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Token Holdings
                </DropdownMenuLabel>
                {treasuryData.tokenBalances.map((token) => (
                  <DropdownMenuItem
                    key={token.address}
                    className={`${isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Coins className="w-4 h-4" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{token.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatBalance(token.balance)} {token.symbol}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            <DropdownMenuSeparator className={isDarkMode ? "bg-gray-700" : "bg-gray-200"} />

            {/* Contract Link */}
            <DropdownMenuItem
              className={`${isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
            >
              <div className="w-full">
                <a
                  href={`https://etherscan.io/address/0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm">View on Etherscan</span>
                </a>
              </div>
            </DropdownMenuItem>

            {/* Last Updated */}
            {treasuryData?.lastUpdated && (
              <DropdownMenuItem className="cursor-default">
                <div className="w-full text-center text-xs text-muted-foreground">
                  Updated: {treasuryData.lastUpdated.toLocaleTimeString()}
                </div>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
