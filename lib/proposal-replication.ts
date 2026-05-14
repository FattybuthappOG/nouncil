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
const READ_FLAG_KEY = 'nouncil_template_read'

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
    const encoded = encodeReplicationData(data)
    localStorage.setItem(STORAGE_KEY, encoded)
    localStorage.removeItem(READ_FLAG_KEY) // Clear read flag for new data
    return `/create?replicate=${data.type}`
  } catch (e) {
    console.error("Failed to store template data:", e)
    return `/create`
  }
}

/**
 * Get replication data from localStorage
 * Only returns data once per stored value (tracks with a read flag to handle React double-renders)
 */
export function getReplicationData(): ProposalReplicationData | null {
  if (typeof window === "undefined") return null
  try {
    const encoded = localStorage.getItem(STORAGE_KEY)
    if (!encoded) return null
    
    // Check if we've already read this data (React Strict Mode double-render protection)
    const readFlag = localStorage.getItem(READ_FLAG_KEY)
    if (readFlag === encoded) {
      return null // Already consumed this data
    }
    
    // Mark as read and clear storage
    localStorage.setItem(READ_FLAG_KEY, encoded)
    localStorage.removeItem(STORAGE_KEY)
    
    return decodeReplicationData(encoded)
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
