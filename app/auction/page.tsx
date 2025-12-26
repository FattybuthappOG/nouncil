"use client"

import dynamic from "next/dynamic"

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
] as const

type LanguageCode = (typeof LANGUAGES)[number]["code"]

interface Bid {
  sender: string
  value: bigint
  timestamp: number
}

interface SettlementInfo {
  winner: string
  amount: bigint
  settler: string
  nounId: number
}

const AuctionContent = dynamic(() => import("@/components/auction-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#1a1a2e] p-6">
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-[#252540] rounded w-3/4" />
        <div className="h-64 bg-[#252540] rounded" />
      </div>
    </div>
  ),
})

export default function AuctionPage() {
  return <AuctionContent />
}
