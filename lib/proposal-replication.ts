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

/**
 * Encode proposal/candidate data to store in sessionStorage
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
 * Decode proposal/candidate data from sessionStorage
 * Uses TextDecoder to handle UTF-8 characters properly
 */
export function decodeReplicationData(encoded: string): ProposalReplicationData | null {
  try {
    const binString = atob(encoded)
    const bytes = Uint8Array.from(binString, (c) => c.charCodeAt(0))
    const jsonStr = new TextDecoder().decode(bytes)
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

/**
 * Store replication data and redirect to create page
 */
export function replicateProposal(data: ProposalReplicationData, createPageUrl: string) {
  const encoded = encodeReplicationData(data)
  sessionStorage.setItem('proposalReplicationData', encoded)
  window.location.href = `${createPageUrl}?replicate=${data.type}`
}

/**
 * Get replication data from sessionStorage and clear it
 */
export function getReplicationData(): ProposalReplicationData | null {
  const encoded = sessionStorage.getItem('proposalReplicationData')
  if (!encoded) return null
  sessionStorage.removeItem('proposalReplicationData')
  return decodeReplicationData(encoded)
}
