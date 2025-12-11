// Nouns Auction House ABI with createBid function
export const NOUNS_AUCTION_ABI = [
  {
    inputs: [
      { internalType: "uint32", name: "clientId", type: "uint32" },
      { internalType: "uint256", name: "nounId", type: "uint256" },
    ],
    name: "createBid",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "auction",
    outputs: [
      { internalType: "uint256", name: "nounId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "startTime", type: "uint256" },
      { internalType: "uint256", name: "endTime", type: "uint256" },
      { internalType: "address payable", name: "bidder", type: "address" },
      { internalType: "bool", name: "settled", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minBidIncrementPercentage",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "reservePrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "nounId", type: "uint256", indexed: true },
      { indexed: false, internalType: "address", name: "sender", type: "address" },
      { indexed: false, internalType: "uint256", name: "value", type: "uint256" },
      { indexed: false, internalType: "bool", name: "extended", type: "bool" },
    ],
    name: "AuctionBid",
    type: "event",
  },
] as const

export const NOUNS_AUCTION_ADDRESS = "0x830BD73E4184ceF73443C15111a1DF14e495C706" as const
export const CLIENT_ID = 22 as const
