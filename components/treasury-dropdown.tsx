"use client"

import { Wallet, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTreasuryData } from "@/hooks/useContractData"

interface TreasuryDropdownProps {
  isDarkMode: boolean
}

export function TreasuryDropdown({ isDarkMode }: TreasuryDropdownProps) {
  const { balance, owner, isLoading } = useTreasuryData()

  const handleClick = () => {
    window.open("https://etherscan.io/address/0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71#asset-tokens", "_blank")
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`w-full sm:w-auto flex items-center gap-2 ${isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}`}
    >
      <Wallet className="w-4 h-4" />
      <span>Treasury</span>
      <ExternalLink className="w-3 h-3" />
    </Button>
  )
}
