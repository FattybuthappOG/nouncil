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
      inputs: [{ internalType: "uint256", name: "proposalId", type: "uint256" }],
      name: "state",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { internalType: "uint256", name: "proposalId", type: "uint256" },
        { internalType: "address", name: "account", type: "address" },
      ],
      name: "hasVoted",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "proposalId", type: "uint256" }],
      name: "proposalVotes",
      outputs: [
        { internalType: "uint256", name: "againstVotes", type: "uint256" },
        { internalType: "uint256", name: "forVotes", type: "uint256" },
        { internalType: "uint256", name: "abstainVotes", type: "uint256" },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "proposalId", type: "uint256" }],
      name: "proposalDeadline",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { internalType: "uint256", name: "proposalId", type: "uint256" },
        { internalType: "uint8", name: "support", type: "uint8" },
        { internalType: "string", name: "reason", type: "string" },
        { internalType: "uint32", name: "clientId", type: "uint32" },
      ],
      name: "castRefundableVoteWithReason",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "nonpayable",
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
    // Basic ETH balance - this will be queried via provider.getBalance()
    // ERC-20 token functions for common treasury tokens
    {
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "totalSupply",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "name",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "symbol",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      stateMutability: "view",
      type: "function",
    },
  ],
} as const

// Common ERC-20 token addresses for treasury tracking
export const COMMON_TOKENS = {
  USDC: "0xA0b86a33E6441Fc5c2e6af3d3C5b2a4F70E14561" as `0x${string}`, // Ethereum mainnet USDC
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7" as `0x${string}`, // Ethereum mainnet USDT
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F" as `0x${string}`, // Ethereum mainnet DAI
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`, // Wrapped ETH
  UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" as `0x${string}`, // Uniswap token
} as const

// ERC-20 ABI for token balance queries
export const ERC20_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const
