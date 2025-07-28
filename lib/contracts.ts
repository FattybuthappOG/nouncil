export const GOVERNOR_CONTRACT = {
  address: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" as `0x${string}`,
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
  address: "0x0BC3807Ec262cB779b38D65b38158acC3bfedE10" as `0x${string}`,
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
