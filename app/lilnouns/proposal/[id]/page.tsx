"use client"

import { use, useState } from "react"
import LilNounsProposalContent from "@/components/lilnouns-proposal-content"

export default function LilNounsProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [isDarkMode] = useState(true)

  return <LilNounsProposalContent params={resolvedParams} isDarkMode={isDarkMode} />
}
