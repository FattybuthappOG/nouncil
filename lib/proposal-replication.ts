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
 */
export function encodeReplicationData(data: ProposalReplicationData): string {
  return btoa(JSON.stringify(data))
}

/**
 * Decode proposal/candidate data from sessionStorage
 */
export function decodeReplicationData(encoded: string): ProposalReplicationData | null {
  try {
    return JSON.parse(atob(encoded))
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
