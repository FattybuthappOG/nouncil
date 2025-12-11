"use client"

import { useReadContract } from "wagmi"
import Link from "next/link"
import { Gavel } from "lucide-react"
import { NOUNS_AUCTION_ABI, NOUNS_AUCTION_ADDRESS } from "@/lib/nouns-auction-abi"

export default function AuctionButton({ isDarkMode }: { isDarkMode: boolean }) {
  const { data: auctionData } = useReadContract({
    address: NOUNS_AUCTION_ADDRESS,
    abi: NOUNS_AUCTION_ABI,
    functionName: "auction",
  })

  const nounId = auctionData?.[0] ? Number(auctionData[0]) : null

  return (
    <Link
      href="/auction"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${
        isDarkMode ? "bg-primary/10 hover:bg-primary/20 text-primary" : "bg-primary/10 hover:bg-primary/20 text-primary"
      }`}
    >
      {nounId !== null && (
        <img src={`https://noun.pics/${nounId}`} alt={`Noun ${nounId}`} className="w-6 h-6 rounded" />
      )}
      <Gavel className="w-4 h-4" />
      <span className="hidden sm:inline">Auction</span>
    </Link>
  )
}
