// Utility to serialize and deserialize proposal/candidate data for replication

export interface ProposalReplicationData {
  type: 'proposal' | 'candidate'
  title: string
  description: string
  targets: string[]
  values: string[]
  signatures: string[]
  calldatas: string[]
}

const STORAGE_KEY = 'nouncil_template_data'

/**
 * Encode proposal/candidate data to store in localStorage
 * Uses TextEncoder to handle UTF-8 characters properly
 */
export function encodeReplicationData(data: ProposalReplicationData): string {
  const jsonStr = JSON.stringify(data)
  // Convert to UTF-8 bytes, then to base64-safe string
  const bytes = new TextEncoder().encode(jsonStr)
  const binString = Array.from(bytes, (b) => String.fromCodePoint(b)).join('')
  return btoa(binString)
}

/**
 * Decode proposal/candidate data from localStorage
 * Uses TextDecoder to handle UTF-8 characters properly
 */
export function decodeReplicationData(encoded: string): ProposalReplicationData | null {
  try {
    const binString = atob(encoded)
    const bytes = Uint8Array.from(binString, (c) => c.charCodeAt(0))
    const jsonStr = new TextDecoder().decode(bytes)
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error("Failed to decode replication data:", e)
    return null
  }
}

/**
 * Store replication data in localStorage and return the URL to navigate to
 */
export function storeTemplateData(data: ProposalReplicationData): string {
  if (typeof window === "undefined") return `/create`
  try {
    // Clear any previous cache
    clearReplicationCache()
    const encoded = encodeReplicationData(data)
    localStorage.setItem(STORAGE_KEY, encoded)
    return `/create?replicate=${data.type}`
  } catch (e) {
    console.error("Failed to store template data:", e)
    return `/create`
  }
}

/**
 * Get replication data from localStorage
 * Clears cache when new data is stored to ensure fresh reads
 */
let cachedData: ProposalReplicationData | null = null
let cacheKey: string | null = null

export function clearReplicationCache() {
  cachedData = null
  cacheKey = null
}

export function getReplicationData(): ProposalReplicationData | null {
  if (typeof window === "undefined") return null
  try {
    const encoded = localStorage.getItem(STORAGE_KEY)
    
    if (!encoded) {
      return cachedData // Return cached if storage was cleared
    }
    
    // Return cached data if same key (handles React double-renders)
    if (cacheKey === encoded && cachedData) {
      return cachedData
    }
    
    // Decode and cache
    const data = decodeReplicationData(encoded)
    if (data) {
      cachedData = data
      cacheKey = encoded
      // Clear storage after successful decode
      localStorage.removeItem(STORAGE_KEY)
    }
    
    return data
  } catch (e) {
    console.error("Failed to get replication data:", e)
    return null
  }
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use storeTemplateData instead
 */
export function replicateProposal(data: ProposalReplicationData, createPageUrl: string) {
  const url = storeTemplateData(data)
  window.location.href = url
}
