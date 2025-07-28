export const CHAIN_ID = 1 // Ethereum Mainnet

export const RPC_URLS = {
  1: `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
  11155111: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
}

export const BLOCK_EXPLORER_URLS = {
  1: "https://etherscan.io",
  11155111: "https://sepolia.etherscan.io",
}

export const GOVERNANCE_SETTINGS = {
  VOTING_PERIOD: 17280, // ~3 days in blocks
  VOTING_DELAY: 1, // 1 block
  PROPOSAL_THRESHOLD: "1000000000000000000000", // 1000 tokens
  QUORUM_PERCENTAGE: 4, // 4%
}
