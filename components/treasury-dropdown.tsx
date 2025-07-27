"use client"
import { ChevronDown, Coins, TrendingUp, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTreasuryData } from "../hooks/useContractData"

interface TreasuryDropdownProps {
  isDarkMode: boolean
}

export function TreasuryDropdown({ isDarkMode }: TreasuryDropdownProps) {
  const { balance: treasuryBalance, isLoading: treasuryLoading } = useTreasuryData()

  // Mock treasury assets data - replace with real contract calls
  const treasuryAssets = [
    { name: "ETH", amount: "2,766.45", value: "$6,234,567", change: "+2.4%" },
    { name: "USDC", amount: "1,250,000", value: "$1,250,000", change: "+0.1%" },
    { name: "WETH", amount: "450.23", value: "$1,015,518", change: "+1.8%" },
    { name: "DAI", amount: "500,000", value: "$500,000", change: "-0.2%" },
    { name: "NOUNS", amount: "125", value: "$875,000", change: "+5.2%" },
  ]

  const totalValue = "$9,875,085"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${
            isDarkMode
              ? "text-gray-300 hover:text-white hover:bg-gray-700"
              : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span className="hidden sm:inline">Treasury ≥</span>
          <span className="sm:hidden">≥</span>
          {treasuryLoading ? "..." : Number.parseFloat(treasuryBalance).toFixed(0)} ETH
          <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`w-72 sm:w-80 p-0 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg flex items-center gap-2 ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
              <Coins className="w-5 h-5" />
              Treasury Assets
            </CardTitle>
            <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
              {totalValue}
            </div>
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">+3.2% (24h)</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {treasuryAssets.map((asset, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        asset.name === "ETH"
                          ? "bg-blue-100 text-blue-800"
                          : asset.name === "USDC"
                            ? "bg-green-100 text-green-800"
                            : asset.name === "WETH"
                              ? "bg-purple-100 text-purple-800"
                              : asset.name === "DAI"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                      }`}
                    >
                      {asset.name.slice(0, 2)}
                    </div>
                    <div>
                      <div className={`font-medium text-sm ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                        {asset.name}
                      </div>
                      <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{asset.amount}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium text-sm ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>
                      {asset.value}
                    </div>
                    <div className={`text-xs ${asset.change.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                      {asset.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              className={`mt-4 pt-3 border-t text-xs ${
                isDarkMode ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-500"
              }`}
            >
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
