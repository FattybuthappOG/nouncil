"use client"

import { useState, useEffect } from "react"
import { Wallet, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTreasuryData } from "@/hooks/useContractData"

interface TreasuryDropdownProps {
  isDarkMode: boolean
  balance?: string
}

export function TreasuryDropdown({ isDarkMode, balance: propBalance }: TreasuryDropdownProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClick = () => {
    window.open("https://etherscan.io/address/0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71#asset-tokens", "_blank")
  }

  // If balance is passed as prop, use it directly without calling the hook
  if (propBalance) {
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

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={`w-full sm:w-auto flex items-center gap-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
      >
        <Wallet className="w-4 h-4" />
        <span>Treasury</span>
        <ExternalLink className="w-3 h-3" />
      </Button>
    )
  }

  return <TreasuryDropdownInner isDarkMode={isDarkMode} />
}

function TreasuryDropdownInner({ isDarkMode }: { isDarkMode: boolean }) {
  const { balance, isLoading } = useTreasuryData()

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

export default TreasuryDropdown
