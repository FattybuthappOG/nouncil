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
    console.error("[v0] Failed to decode replication data:", e)
    return null
  }
}

/**
 * Store replication data in localStorage and return the URL to navigate to
 */
export function storeTemplateData(data: ProposalReplicationData): string {
  try {
    const encoded = encodeReplicationData(data)
    localStorage.setItem(STORAGE_KEY, encoded)
    console.log("[v0] Stored template data, length:", encoded.length)
    return `/create?replicate=${data.type}`
  } catch (e) {
    console.error("[v0] Failed to store template data:", e)
    return `/create`
  }
}

/**
 * Get replication data from localStorage and clear it
 */
export function getReplicationData(): ProposalReplicationData | null {
  try {
    const encoded = localStorage.getItem(STORAGE_KEY)
    console.log("[v0] Getting template data, found:", !!encoded)
    if (!encoded) return null
    localStorage.removeItem(STORAGE_KEY)
    return decodeReplicationData(encoded)
  } catch (e) {
    console.error("[v0] Failed to get replication data:", e)
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
