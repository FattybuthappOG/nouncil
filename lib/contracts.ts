export const GOVERNOR_CONTRACT = {
  address: "0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71" as `0x${string}`,
  abi: [
    {
      inputs: [],
      name: "proposalCount",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "votingPeriod",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "proposalThreshold",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: "address", name: "voter", type: "address" },
        { indexed: false, internalType: "uint256", name: "proposalId", type: "uint256" },
        { indexed: false, internalType: "uint8", name: "support", type: "uint8" },
        { indexed: false, internalType: "uint256", name: "weight", type: "uint256" },
        { indexed: false, internalType: "string", name: "reason", type: "string" },
      ],
      name: "VoteCast",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        { indexed: false, internalType: "uint256", name: "proposalId", type: "uint256" },
        { indexed: false, internalType: "address", name: "proposer", type: "address" },
        { indexed: false, internalType: "string", name: "description", type: "string" },
      ],
      name: "ProposalCreated",
      type: "event",
    },
  ],
} as const

export const TREASURY_CONTRACT = {
  address: "0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71" as `0x${string}`,
  abi: [
    {
      inputs: [],
      name: "balance",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "owner",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
  ],
} as const
