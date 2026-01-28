"use client"

// Lil Nouns Data Contract (handles candidates)
// Note: The Lil Nouns Data contract doesn't have a simple way to enumerate candidates
// like the governor has for proposals. Candidates are stored by their slug/ID which is
// derived from the proposer address and slug string.
// 
// Without a working subgraph, we cannot efficiently enumerate candidates.
// This file provides placeholder functions that return empty data.

export type Candidate = {
  slug: string
  proposer: string
  description: string
  title: string
  createdBlock: bigint
  targets: string[]
}

// Placeholder - candidates require a subgraph to enumerate
export async function getCandidates(): Promise<Candidate[]> {
  // The Lil Nouns Data contract doesn't expose a way to list all candidates
  // This would require scanning events which hits RPC limits
  // A proper solution requires a subgraph or backend indexer
  return []
}

export async function getCandidateIds(_limit: number = 20): Promise<string[]> {
  return []
}

export async function getCandidateBySlug(_slug: string): Promise<Candidate | null> {
  return null
}
