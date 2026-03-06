import { createHash } from "crypto"

// Compute keccak256 of the event signature
// We use Node's crypto SHA3 (which is keccak256 for Ethereum)
// Note: Node's "sha3-256" is NOT keccak256 - we need to use a manual implementation
// or rely on the known hash. Let's use a different approach.

// The canonical event signature (no spaces, no indexed keyword)
const sig = "ProposalCandidateCreated(address,address[],uint256[],string[],bytes[],string,string,uint256,bytes32)"

console.log("Event signature:", sig)
console.log("Length:", sig.length)

// Since Node crypto sha3-256 is NOT keccak256, we'll use a pure JS implementation
// Keccak-256 reference implementation
function keccak256(data) {
  // Using the ethereum-cryptography package approach via Buffer
  // Actually let's just verify the known hash by reversing - search for the sig on 4bytes
  console.log("\nExpected topic hash for this signature:")
  console.log("Use: https://www.4byte.directory/event-signatures/ to verify")
  console.log("Or run: node -e \"const {keccak256} = require('@ethersproject/keccak256'); const {toUtf8Bytes} = require('@ethersproject/strings'); console.log(keccak256(toUtf8Bytes('ProposalCandidateCreated(address,address[],uint256[],string[],bytes[],string,string,uint256,bytes32)')))\"")
}

keccak256(sig)

// Let's also verify by computing SHA-3 (different from keccak):
const sha3 = createHash("sha3-256").update(sig).digest("hex")
console.log("\nSHA3-256 (NOT keccak256, just for reference):", "0x" + sha3)
console.log("\nNote: Ethereum keccak256 != SHA3-256. Need ethers.js or viem to compute correctly.")
