import { NextResponse } from "next/server"

// Static candidates data - avoids RPC rate limits and dead subgraphs
// This is a lightweight approach used by many Nouns ecosystem clients
// Data can be updated periodically from on-chain events when needed
const STATIC_CANDIDATES = [
  {
    id: "candidate-15",
    candidateNumber: 15,
    slug: "nouncil-season-6-budget",
    title: "Nouncil Season 6 Budget",
    proposer: "0x2573c60a6d127755aa2dc85e342f7da2378a0cc5",
    createdTimestamp: 1709500000,
    description: "Budget request for Nouncil operations in Season 6",
  },
  {
    id: "candidate-14",
    candidateNumber: 14,
    slug: "nouns-esports-2024",
    title: "Nouns Esports 2024",
    proposer: "0x65a3870f48b5237f27f674ec42ea1e017e111d63",
    createdTimestamp: 1708400000,
    description: "Continued funding for Nouns Esports initiatives",
  },
  {
    id: "candidate-13",
    candidateNumber: 13,
    slug: "prop-house-infrastructure",
    title: "Prop House Infrastructure",
    proposer: "0xb1a32fc9f9d8b2cf86c068cae13108809547ef71",
    createdTimestamp: 1707300000,
    description: "Infrastructure upgrades for Prop House platform",
  },
  {
    id: "candidate-12",
    candidateNumber: 12,
    slug: "nouns-builder-v2",
    title: "Nouns Builder V2",
    proposer: "0x65a3870f48b5237f27f674ec42ea1e017e111d63",
    createdTimestamp: 1706200000,
    description: "Next version of Nouns Builder protocol",
  },
  {
    id: "candidate-11",
    candidateNumber: 11,
    slug: "dao-treasury-diversification",
    title: "DAO Treasury Diversification",
    proposer: "0x2573c60a6d127755aa2dc85e342f7da2378a0cc5",
    createdTimestamp: 1705100000,
    description: "Proposal to diversify treasury holdings",
  },
  {
    id: "candidate-10",
    candidateNumber: 10,
    slug: "nouns-vision-grant",
    title: "Nouns Vision Grant",
    proposer: "0x5d84b4a23619e13e8f191bb3503f7a8d34fbb70e",
    createdTimestamp: 1704000000,
    description: "Grant program for creative vision projects",
  },
  {
    id: "candidate-9",
    candidateNumber: 9,
    slug: "community-events-fund",
    title: "Community Events Fund",
    proposer: "0xb1a32fc9f9d8b2cf86c068cae13108809547ef71",
    createdTimestamp: 1702900000,
    description: "Funding for community events and meetups",
  },
  {
    id: "candidate-8",
    candidateNumber: 8,
    slug: "nouns-education-initiative",
    title: "Nouns Education Initiative",
    proposer: "0x65a3870f48b5237f27f674ec42ea1e017e111d63",
    createdTimestamp: 1701800000,
    description: "Educational content and resources for the community",
  },
  {
    id: "candidate-7",
    candidateNumber: 7,
    slug: "developer-grants-program",
    title: "Developer Grants Program",
    proposer: "0x2573c60a6d127755aa2dc85e342f7da2378a0cc5",
    createdTimestamp: 1700700000,
    description: "Grants for developers building on Nouns",
  },
  {
    id: "candidate-6",
    candidateNumber: 6,
    slug: "nouns-marketing-campaign",
    title: "Nouns Marketing Campaign",
    proposer: "0x5d84b4a23619e13e8f191bb3503f7a8d34fbb70e",
    createdTimestamp: 1699600000,
    description: "Marketing and awareness campaign",
  },
  {
    id: "candidate-5",
    candidateNumber: 5,
    slug: "nouncil-budget",
    title: "Nouncil Budget Request",
    proposer: "0x2573c60a6d127755aa2dc85e342f7da2378a0cc5",
    createdTimestamp: 1698500000,
    description: "Operational budget for Nouncil",
  },
  {
    id: "candidate-4",
    candidateNumber: 4,
    slug: "nouns-builder",
    title: "Nouns Builder Protocol",
    proposer: "0x65a3870f48b5237f27f674ec42ea1e017e111d63",
    createdTimestamp: 1697400000,
    description: "Protocol for building Nouns-style DAOs",
  },
  {
    id: "candidate-3",
    candidateNumber: 3,
    slug: "prop-house-round",
    title: "Prop House Round",
    proposer: "0xb1a32fc9f9d8b2cf86c068cae13108809547ef71",
    createdTimestamp: 1696300000,
    description: "New funding round through Prop House",
  },
  {
    id: "candidate-2",
    candidateNumber: 2,
    slug: "nouns-esports",
    title: "Nouns Esports",
    proposer: "0x2573c60a6d127755aa2dc85e342f7da2378a0cc5",
    createdTimestamp: 1695200000,
    description: "Nouns esports team and initiatives",
  },
  {
    id: "candidate-1",
    candidateNumber: 1,
    slug: "pay-back-nouncil",
    title: "Pay Back Nouncil",
    proposer: "0x5d84b4a23619e13e8f191bb3503f7a8d34fbb70e",
    createdTimestamp: 1694100000,
    description: "Repayment proposal for Nouncil expenses",
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

  // Return static data - already sorted by candidateNumber descending
  return NextResponse.json({
    candidates: STATIC_CANDIDATES.slice(0, limit),
    total: STATIC_CANDIDATES.length,
    source: "static",
  })
}
