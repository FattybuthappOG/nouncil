"use client"

import { ChevronDown, Wallet, TrendingUp, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTreasuryData } from "@/hooks/useContractData"

interface TreasuryDropdownProps {
  isDarkMode: boolean
}

export function TreasuryDropdown({ isDarkMode }: TreasuryDropdownProps) {
  const { balance, owner, isLoading } = useTreasuryData()

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
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`w-64 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <DropdownMenuLabel className={isDarkMode ? "text-gray-200" : "text-gray-900"}>
          Treasury Overview
        </DropdownMenuLabel>
        <DropdownMenuSeparator className={isDarkMode ? "bg-gray-700" : "bg-gray-200"} />

        <DropdownMenuItem
          className={`${isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
        >
          <div className="flex items-center gap-3 w-full">
            <Wallet className="w-4 h-4" />
            <div className="flex-1">
              <div className="font-medium">Balance</div>
              <div className="text-sm text-muted-foreground">{isLoading ? "Loading..." : `${balance} ETH`}</div>
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className={`${isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
        >
          <div className="flex items-center gap-3 w-full">
            <TrendingUp className="w-4 h-4" />
            <div className="flex-1">
              <div className="font-medium">USD Value</div>
              <div className="text-sm text-muted-foreground">
                ${(Number.parseFloat(balance) * 2200).toLocaleString()}
              </div>
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className={`${isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
        >
          <div className="flex items-center gap-3 w-full">
            <Users className="w-4 h-4" />
            <div className="flex-1">
              <div className="font-medium">Owner</div>
              <div className="text-sm text-muted-foreground">
                {isLoading ? "Loading..." : `${owner?.slice(0, 6)}...${owner?.slice(-4)}`}
              </div>
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className={isDarkMode ? "bg-gray-700" : "bg-gray-200"} />

        <DropdownMenuItem
          className={`${isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
        >
          <div className="w-full text-center">
            <Button variant="outline" size="sm" className="w-full bg-transparent">
              View Full Treasury
            </Button>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
