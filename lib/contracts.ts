export const CONTRACTS = {
  TREASURY: {
    address: "0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71" as `0x${string}`,
    abi: [
      // Common Treasury functions
      "function balance() view returns (uint256)",
      "function owner() view returns (address)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      // Events
      "event Transfer(address indexed from, address indexed to, uint256 value)",
      "event Deposit(address indexed from, uint256 value)",
      "event Withdrawal(address indexed to, uint256 value)",
    ],
  },
  GOVERNOR: {
    address: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d" as `0x${string}`,
    abi: [
      // Governor functions
      "function proposalCount() view returns (uint256)",
      "function proposals(uint256) view returns (uint256 id, address proposer, uint256 startTime, uint256 endTime, uint256 forVotes, uint256 againstVotes, bool canceled, bool executed)",
      "function state(uint256 proposalId) view returns (uint8)",
      "function hasVoted(uint256 proposalId, address voter) view returns (bool)",
      "function getVotes(address account, uint256 blockNumber) view returns (uint256)",
      "function votingDelay() view returns (uint256)",
      "function votingPeriod() view returns (uint256)",
      "function proposalThreshold() view returns (uint256)",
      "function quorum(uint256 blockNumber) view returns (uint256)",
      // Voting functions
      "function castVote(uint256 proposalId, uint8 support) returns (uint256)",
      "function castVoteWithReason(uint256 proposalId, uint8 support, string reason) returns (uint256)",
      // Events
      "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
      "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)",
      "event ProposalExecuted(uint256 proposalId)",
      "event ProposalCanceled(uint256 proposalId)",
    ],
  },
} as const

export const PROPOSAL_STATES = {
  0: "Pending",
  1: "Active",
  2: "Canceled",
  3: "Defeated",
  4: "Succeeded",
  5: "Queued",
  6: "Expired",
  7: "Executed",
} as const

export const VOTE_TYPES = {
  0: "Against",
  1: "For",
  2: "Abstain",
} as const
