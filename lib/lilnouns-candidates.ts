import { parseAbiItem } from "viem"
import { publicClient, getCurrentBlock } from "./lilnouns-ethClient"

// Lil Nouns Proposal Candidates Contract
const CANDIDATES_ADDRESS = "0x8d59e1060464DdCD0367e2EaBEDf70b3E7422902" as const

// Start block for candidates contract (deployment block approximately)
const START_BLOCK = BigInt(17000000)

// Event signature for ProposalCandidateCreated
const CANDIDATE_CREATED_EVENT = parseAbiItem(
  "event ProposalCandidateCreated(address indexed msgSender, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, string slug, uint256 proposalIdToUpdate)"
)

// Alternative event signature (some contracts use different format)
const CANDIDATE_CREATED_EVENT_ALT = parseAbiItem(
  "event ProposalCandidateCreated(address indexed msgSender, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, string slug, bytes32 encodedProposalHash)"
)

export type Candidate = {
  slug: string
  proposer: string
  description: string
  title: string
  createdBlock: bigint
  targets: string[]
}

// LocalStorage keys
const CANDIDATES_CACHE_KEY = "lilnouns_candidates_cache"
const CANDIDATES_LAST_BLOCK_KEY = "lilnouns_candidates_last_block"

function getFromCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const cached = localStorage.getItem(key)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

function setCache(key: string, value: any) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error("Failed to cache:", error)
  }
}

// Convert bigint values to string for JSON serialization
function serializeCandidate(candidate: Candidate): any {
  return {
    ...candidate,
    createdBlock: candidate.createdBlock.toString(),
  }
}

// Convert string values back to bigint
function deserializeCandidate(data: any): Candidate {
  return {
    ...data,
    createdBlock: BigInt(data.createdBlock),
  }
}

// Extract title from description (first line or first 100 chars)
function extractTitle(description: string): string {
  const firstLine = description.split("\n")[0].replace(/^#\s*/, "").trim()
  if (firstLine.length > 100) {
    return firstLine.substring(0, 100) + "..."
  }
  return firstLine || "Untitled Candidate"
}

export async function getCandidates(): Promise<Candidate[]> {
  // Try to load from cache first
  const cachedCandidates = getFromCache<any[]>(CANDIDATES_CACHE_KEY)
  const lastBlock = getFromCache<string>(CANDIDATES_LAST_BLOCK_KEY)
  
  let candidates: Candidate[] = cachedCandidates ? cachedCandidates.map(deserializeCandidate) : []
  const fromBlock = lastBlock ? BigInt(lastBlock) + BigInt(1) : START_BLOCK
  
  try {
    const currentBlock = await getCurrentBlock()
    
    // If we have cached data and it's recent, return it
    if (candidates.length > 0 && lastBlock && currentBlock - BigInt(lastBlock) < BigInt(100)) {
      return candidates.sort((a, b) => Number(b.createdBlock) - Number(a.createdBlock))
    }
    
    // Fetch new candidates in chunks to avoid RPC limits
    const CHUNK_SIZE = BigInt(50000)
    let currentFromBlock = fromBlock
    const newCandidates: Candidate[] = []
    
    while (currentFromBlock < currentBlock) {
      const toBlock = currentFromBlock + CHUNK_SIZE > currentBlock 
        ? currentBlock 
        : currentFromBlock + CHUNK_SIZE
      
      try {
        // Try primary event signature
        let logs = await publicClient.getLogs({
          address: CANDIDATES_ADDRESS,
          event: CANDIDATE_CREATED_EVENT,
          fromBlock: currentFromBlock,
          toBlock: toBlock,
        })
        
        // If no logs, try alternative signature
        if (logs.length === 0) {
          logs = await publicClient.getLogs({
            address: CANDIDATES_ADDRESS,
            event: CANDIDATE_CREATED_EVENT_ALT,
            fromBlock: currentFromBlock,
            toBlock: toBlock,
          })
        }
        
        for (const log of logs) {
          const args = log.args as any
          if (args.slug !== undefined) {
            newCandidates.push({
              slug: args.slug,
              proposer: args.msgSender,
              description: args.description || "",
              title: extractTitle(args.description || ""),
              createdBlock: log.blockNumber || BigInt(0),
              targets: args.targets || [],
            })
          }
        }
      } catch (error) {
        console.error(`Error fetching candidate logs from ${currentFromBlock} to ${toBlock}:`, error)
      }
      
      currentFromBlock = toBlock + BigInt(1)
    }
    
    // Merge with existing candidates (avoid duplicates by slug)
    const existingSlugs = new Set(candidates.map(c => c.slug))
    for (const candidate of newCandidates) {
      if (!existingSlugs.has(candidate.slug)) {
        candidates.push(candidate)
      }
    }
    
    // Cache results
    setCache(CANDIDATES_CACHE_KEY, candidates.map(serializeCandidate))
    setCache(CANDIDATES_LAST_BLOCK_KEY, currentBlock.toString())
    
    return candidates.sort((a, b) => Number(b.createdBlock) - Number(a.createdBlock))
  } catch (error) {
    console.error("Failed to fetch candidates:", error)
    // Return cached data if available
    return candidates.sort((a, b) => Number(b.createdBlock) - Number(a.createdBlock))
  }
}

export async function getCandidateBySlug(slug: string): Promise<Candidate | null> {
  const candidates = await getCandidates()
  return candidates.find(c => c.slug === slug) || null
}
