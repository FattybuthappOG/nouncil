import { createHash } from 'crypto'

// Compute keccak256 of event signature
function keccak256(str) {
  return createHash('sha3-256').update(str).digest('hex')
}

const sig = 'ProposalCandidateCreated(address,address[],uint256[],string[],bytes[],string,string,uint256,bytes32)'
console.log('Event signature:', sig)
console.log('keccak256 (sha3-256):', '0x' + keccak256(sig))
