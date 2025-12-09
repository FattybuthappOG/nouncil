// Nouns DAO Proposals Contract ABI
// Contract: 0xf790A5f59678dd733fb3De93493A91f472ca1365
export const NOUNS_PROPOSALS_ABI = [
  {
    inputs: [
      { internalType: "bytes", name: "sig", type: "bytes" },
      { internalType: "uint256", name: "expirationTimestamp", type: "uint256" },
      { internalType: "address", name: "proposer", type: "address" },
      { internalType: "string", name: "slug", type: "string" },
      { internalType: "uint256", name: "proposalIdToUpdate", type: "uint256" },
      { internalType: "bytes", name: "encodedProp", type: "bytes" },
      { internalType: "string", name: "reason", type: "string" },
    ],
    name: "addSignature",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const
