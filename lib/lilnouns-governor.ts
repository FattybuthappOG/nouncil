import { parseAbiItem, type Log } from "viem"
import { publicClient, getCurrentBlock } from "./lilnouns-ethClient"

// Lil Nouns Governor Contract
const GOVERNOR_ADDRESS = "0x5d2C31ce16924C2a71D317e5BbFd5ce387854039" as const

// Start block for Lil Nouns (deployment block approximately)
const START_BLOCK = BigInt(14959200)

// Event signatures
const PROPOSAL_CREATED_EVENT = parseAbiItem(
  "event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)"
)

const VOTE_CAST_EVENT = parseAbiItem(
  "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 votes, string reason)"
)

export type Proposal = {
  id: string
  proposer: string
  startBlock: bigint
  endBlock: bigint
  description: string
  title: string
  createdBlock: bigint
}

export type Vote = {
  voter: string
  proposalId: string
  support: number // 0 = Against, 1 = For, 2 = Abstain
  votes: bigint
  reason: string
}

export type VoteCounts = {
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
}

// LocalStorage keys
const PROPOSALS_CACHE_KEY = "lilnouns_proposals_cache"
const PROPOSALS_LAST_BLOCK_KEY = "lilnouns_proposals_last_block"

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
function serializeProposal(proposal: Proposal): any {
  return {
    ...proposal,
    startBlock: proposal.startBlock.toString(),
    endBlock: proposal.endBlock.toString(),
    createdBlock: proposal.createdBlock.toString(),
  }
}

// Convert string values back to bigint
function deserializeProposal(data: any): Proposal {
  return {
    ...data,
    startBlock: BigInt(data.startBlock),
    endBlock: BigInt(data.endBlock),
    createdBlock: BigInt(data.createdBlock),
  }
}

// Extract title from description (first line or first 100 chars)
function extractTitle(description: string): string {
  const firstLine = description.split("\n")[0].replace(/^#\s*/, "").trim()
  if (firstLine.length > 100) {
    return firstLine.substring(0, 100) + "..."
  }
  return firstLine || "Untitled Proposal"
}

export async function getProposals(): Promise<Proposal[]> {
  // Try to load from cache first
  const cachedProposals = getFromCache<any[]>(PROPOSALS_CACHE_KEY)
  const lastBlock = getFromCache<string>(PROPOSALS_LAST_BLOCK_KEY)
  
  let proposals: Proposal[] = cachedProposals ? cachedProposals.map(deserializeProposal) : []
  const fromBlock = lastBlock ? BigInt(lastBlock) + BigInt(1) : START_BLOCK
  
  try {
    const currentBlock = await getCurrentBlock()
    
    // If we have cached data and it's recent, return it
    if (proposals.length > 0 && lastBlock && currentBlock - BigInt(lastBlock) < BigInt(100)) {
      return proposals.sort((a, b) => Number(b.id) - Number(a.id))
    }
    
    // Fetch new proposals in chunks to avoid RPC limits
    const CHUNK_SIZE = BigInt(50000)
    let currentFromBlock = fromBlock
    const newProposals: Proposal[] = []
    
    while (currentFromBlock < currentBlock) {
      const toBlock = currentFromBlock + CHUNK_SIZE > currentBlock 
        ? currentBlock 
        : currentFromBlock + CHUNK_SIZE
      
      try {
        const logs = await publicClient.getLogs({
          address: GOVERNOR_ADDRESS,
          event: PROPOSAL_CREATED_EVENT,
          fromBlock: currentFromBlock,
          toBlock: toBlock,
        })
        
        for (const log of logs) {
          const args = log.args as any
          if (args.id !== undefined) {
            newProposals.push({
              id: args.id.toString(),
              proposer: args.proposer,
              startBlock: args.startBlock,
              endBlock: args.endBlock,
              description: args.description || "",
              title: extractTitle(args.description || ""),
              createdBlock: log.blockNumber || BigInt(0),
            })
          }
        }
      } catch (error) {
        console.error(`Error fetching logs from ${currentFromBlock} to ${toBlock}:`, error)
      }
      
      currentFromBlock = toBlock + BigInt(1)
    }
    
    // Merge with existing proposals (avoid duplicates)
    const existingIds = new Set(proposals.map(p => p.id))
    for (const proposal of newProposals) {
      if (!existingIds.has(proposal.id)) {
        proposals.push(proposal)
      }
    }
    
    // Cache results
    setCache(PROPOSALS_CACHE_KEY, proposals.map(serializeProposal))
    setCache(PROPOSALS_LAST_BLOCK_KEY, currentBlock.toString())
    
    return proposals.sort((a, b) => Number(b.id) - Number(a.id))
  } catch (error) {
    console.error("Failed to fetch proposals:", error)
    // Return cached data if available
    return proposals.sort((a, b) => Number(b.id) - Number(a.id))
  }
}

export async function getProposalVotes(proposalId: string): Promise<VoteCounts> {
  const cacheKey = `lilnouns_votes_${proposalId}`
  const cached = getFromCache<{ forVotes: string; againstVotes: string; abstainVotes: string }>(cacheKey)
  
  if (cached) {
    return {
      forVotes: BigInt(cached.forVotes),
      againstVotes: BigInt(cached.againstVotes),
      abstainVotes: BigInt(cached.abstainVotes),
    }
  }
  
  try {
    const currentBlock = await getCurrentBlock()
    
    // Fetch vote events in chunks
    const CHUNK_SIZE = BigInt(100000)
    let fromBlock = START_BLOCK
    let forVotes = BigInt(0)
    let againstVotes = BigInt(0)
    let abstainVotes = BigInt(0)
    
    while (fromBlock < currentBlock) {
      const toBlock = fromBlock + CHUNK_SIZE > currentBlock 
        ? currentBlock 
        : fromBlock + CHUNK_SIZE
      
      try {
        const logs = await publicClient.getLogs({
          address: GOVERNOR_ADDRESS,
          event: VOTE_CAST_EVENT,
          fromBlock,
          toBlock,
        })
        
        for (const log of logs) {
          const args = log.args as any
          if (args.proposalId?.toString() === proposalId) {
            const votes = args.votes || BigInt(0)
            if (args.support === 0) {
              againstVotes += votes
            } else if (args.support === 1) {
              forVotes += votes
            } else if (args.support === 2) {
              abstainVotes += votes
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching votes from ${fromBlock} to ${toBlock}:`, error)
      }
      
      fromBlock = toBlock + BigInt(1)
    }
    
    const result = { forVotes, againstVotes, abstainVotes }
    
    // Cache the results
    setCache(cacheKey, {
      forVotes: forVotes.toString(),
      againstVotes: againstVotes.toString(),
      abstainVotes: abstainVotes.toString(),
    })
    
    return result
  } catch (error) {
    console.error("Failed to fetch votes:", error)
    return { forVotes: BigInt(0), againstVotes: BigInt(0), abstainVotes: BigInt(0) }
  }
}

export async function getProposalStatus(proposal: Proposal): Promise<string> {
  try {
    const currentBlock = await getCurrentBlock()
    
    if (currentBlock < proposal.startBlock) {
      return "PENDING"
    } else if (currentBlock <= proposal.endBlock) {
      return "ACTIVE"
    } else {
      return "ENDED"
    }
  } catch {
    return "UNKNOWN"
  }
}
