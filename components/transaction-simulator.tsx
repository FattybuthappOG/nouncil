"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Coins,
  ImageIcon,
  Clock,
  Send,
  FileCode,
  Droplets,
} from "lucide-react"
import { EnsDisplay } from "@/components/ens-display"

// Known contracts with metadata
const KNOWN_CONTRACTS: Record<string, { name: string; type?: string; decimals?: number; symbol?: string }> = {
  "0x6f3e6272a167e8accb32072d08e0957f9c79223d": { name: "Nouns DAO Proxy" },
  "0x0bc3807ec262cb779b38d65b38158acc3bfede10": { name: "Nouns DAO Logic V3" },
  "0x830bd73e4184cef73443c15111a1df14e495c706": { name: "Nouns DAO Executor (Treasury)" },
  "0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03": { name: "Nouns Token", type: "nft" },
  "0xb1a32fc9f9d8b2cf86c068cae13108809547ef71": { name: "Nouns Art" },
  "0x2573c60a6d127755aa2dc85e342f7da2378a0cc5": { name: "Nouns Auction House" },
  // ERC20 Tokens
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { name: "USDC", type: "erc20", decimals: 6, symbol: "USDC" },
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { name: "WETH", type: "erc20", decimals: 18, symbol: "WETH" },
  "0x6b175474e89094c44da98b954eedeac495271d0f": { name: "DAI", type: "erc20", decimals: 18, symbol: "DAI" },
  "0xdac17f958d2ee523a2206206994597c13d831ec7": { name: "USDT", type: "erc20", decimals: 6, symbol: "USDT" },
  "0x4200000000000000000000000000000000000006": { name: "WETH (Base)", type: "erc20", decimals: 18, symbol: "WETH" },
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": { name: "USDC (Base)", type: "erc20", decimals: 6, symbol: "USDC" },
  // Sablier contracts
  "0xb10daee1fcf62243ae27776d7a92d39dc8740f95": { name: "Sablier V2 LockupLinear", type: "stream" },
  "0x39efdc3dbb57b2388ccc4bb40ac4cb1226bc9e44": { name: "Sablier V2 LockupDynamic", type: "stream" },
  "0x7a43f8a888fa15e68c103e18b0439eb1e98e4301": { name: "Sablier V2 Batch", type: "stream" },
  "0xafb979d9afad1ce41510c8dc65bc1f0f76a90ce7": { name: "Sablier Lockup Linear", type: "stream" },
  // Nouns Builder
  "0xcdf9b17e21b40f4e4288f5c49e0cf170ab37cff1": { name: "Nouns Builder Treasury" },
  // Other common contracts
  "0x0fd206fc7a7dbcd5661157edcb1ffdd0d02a61ff": { name: "Prop House" },
}

// Function selectors (first 4 bytes of keccak256 hash)
const FUNCTION_SELECTORS: Record<string, { name: string; params: string[] }> = {
  a9059cbb: { name: "transfer", params: ["address", "uint256"] },
  "23b872dd": { name: "transferFrom", params: ["address", "address", "uint256"] },
  "095ea7b3": { name: "approve", params: ["address", "uint256"] },
  "42842e0e": { name: "safeTransferFrom", params: ["address", "address", "uint256"] },
  b88d4fde: { name: "safeTransferFrom", params: ["address", "address", "uint256", "bytes"] },
  "40c10f19": { name: "mint", params: ["address", "uint256"] },
  a22cb465: { name: "setApprovalForAll", params: ["address", "bool"] },
  // Treasury functions
  "5a9b0b89": { name: "sendOrRegisterDebt", params: ["address", "uint256"] },
  b61d27f6: { name: "execute", params: ["address", "uint256", "bytes"] },
  // Streaming
  "36efd16f": { name: "createWithDurations", params: ["tuple"] },
  "1c31f710": { name: "createWithRange", params: ["tuple"] },
  "40e58ee5": { name: "cancel", params: ["uint256"] },
}

// Decode address from calldata (32 bytes, address is last 20 bytes)
function decodeAddress(data: string, paramIndex: number): string {
  try {
    const start = 10 + paramIndex * 64 + 24 // Skip 0x + 4 byte selector, offset * 32 bytes, and 12 bytes padding
    const end = start + 40
    if (data.length < end) return ""
    return "0x" + data.slice(start, end).toLowerCase()
  } catch {
    return ""
  }
}

// Decode uint256 from calldata
function decodeUint256(data: string, paramIndex: number): bigint {
  try {
    const start = 10 + paramIndex * 64 // Skip 0x + 4 byte selector
    const end = start + 64
    if (data.length < end) return BigInt(0)
    const hex = data.slice(start, end)
    return BigInt("0x" + hex)
  } catch {
    return BigInt(0)
  }
}

// Format token amount with proper decimals
function formatTokenAmount(amount: bigint, decimals: number): string {
  if (amount === BigInt(0)) return "0"

  const divisor = BigInt(10 ** decimals)
  const intPart = amount / divisor
  const fracPart = amount % divisor

  if (fracPart === BigInt(0)) {
    return intPart.toLocaleString()
  }

  const fracStr = fracPart.toString().padStart(decimals, "0")
  const trimmedFrac = fracStr.replace(/0+$/, "").slice(0, 4)

  if (trimmedFrac.length === 0) {
    return intPart.toLocaleString()
  }

  return `${intPart.toLocaleString()}.${trimmedFrac}`
}

// Format ETH amount
function formatEthAmount(weiValue: string): string {
  try {
    const wei = BigInt(weiValue)
    if (wei === BigInt(0)) return "0"
    const eth = Number(wei) / 1e18
    if (eth < 0.0001) return "<0.0001"
    if (eth < 1) return eth.toFixed(4)
    if (eth < 100) return eth.toFixed(2)
    return Math.round(eth).toLocaleString()
  } catch {
    return "0"
  }
}

interface DecodedTransaction {
  type:
    | "eth_transfer"
    | "token_transfer"
    | "nft_transfer"
    | "stream_create"
    | "stream_cancel"
    | "approval"
    | "contract_call"
  recipient?: string
  amount?: string
  symbol?: string
  tokenId?: string
  tokenName?: string
  functionName?: string
  description: string
  icon: React.ReactNode
  details?: string
}

function decodeTransaction(target: string, signature: string, calldata: string, value: string): DecodedTransaction {
  const targetLower = target.toLowerCase()
  const contractInfo = KNOWN_CONTRACTS[targetLower]
  const ethValue = formatEthAmount(value)
  const hasEthValue = value !== "0" && BigInt(value) > BigInt(0)

  // Get function selector from calldata
  const selector = calldata.length >= 10 ? calldata.slice(2, 10).toLowerCase() : ""
  const funcInfo = FUNCTION_SELECTORS[selector]

  // Also check signature string for function name
  const sigFuncName = signature ? signature.split("(")[0] : ""

  // Pure ETH transfer (no calldata or empty calldata)
  if ((!calldata || calldata === "0x" || calldata.length <= 2) && hasEthValue) {
    return {
      type: "eth_transfer",
      recipient: target,
      amount: ethValue,
      symbol: "ETH",
      description: `Send ${ethValue} ETH`,
      icon: <Send className="w-4 h-4" />,
    }
  }

  // ERC20 Transfer - selector a9059cbb or signature transfer(address,uint256)
  if (selector === "a9059cbb" || signature === "transfer(address,uint256)") {
    const recipient = decodeAddress(calldata, 0)
    const amount = decodeUint256(calldata, 1)

    if (contractInfo?.type === "erc20" && contractInfo.decimals && contractInfo.symbol) {
      const formattedAmount = formatTokenAmount(amount, contractInfo.decimals)
      return {
        type: "token_transfer",
        recipient,
        amount: formattedAmount,
        symbol: contractInfo.symbol,
        tokenName: contractInfo.name,
        description: `Send ${formattedAmount} ${contractInfo.symbol}`,
        icon: <Coins className="w-4 h-4" />,
      }
    }

    // Unknown ERC20
    return {
      type: "token_transfer",
      recipient,
      amount: formatTokenAmount(amount, 18),
      symbol: "tokens",
      description: `Transfer tokens`,
      icon: <Coins className="w-4 h-4" />,
      details: `Amount: ${amount.toString()} (raw)`,
    }
  }

  // ERC20 Approval - selector 095ea7b3
  if (selector === "095ea7b3" || signature === "approve(address,uint256)") {
    const spender = decodeAddress(calldata, 0)
    const amount = decodeUint256(calldata, 1)
    const isUnlimited = amount >= BigInt("0x" + "f".repeat(64)) / BigInt(2)
    const symbol = contractInfo?.symbol || "tokens"

    return {
      type: "approval",
      recipient: spender,
      amount: isUnlimited ? "Unlimited" : formatTokenAmount(amount, contractInfo?.decimals || 18),
      symbol,
      functionName: "approve",
      description: isUnlimited ? `Approve unlimited ${symbol} spending` : `Approve ${symbol} spending`,
      icon: <FileCode className="w-4 h-4" />,
    }
  }

  // NFT Transfer - safeTransferFrom (42842e0e) or transferFrom with 3 address params (23b872dd)
  if (selector === "42842e0e" || (selector === "23b872dd" && contractInfo?.type === "nft")) {
    const to = decodeAddress(calldata, 1)
    const tokenId = decodeUint256(calldata, 2)

    return {
      type: "nft_transfer",
      recipient: to,
      tokenId: tokenId.toString(),
      tokenName: contractInfo?.name || "NFT",
      functionName: funcInfo?.name || "transfer",
      description: `Transfer ${contractInfo?.name || "NFT"} #${tokenId}`,
      icon: <ImageIcon className="w-4 h-4" />,
    }
  }

  // Sablier Stream Creation
  if (
    contractInfo?.type === "stream" &&
    (sigFuncName.includes("create") || selector === "36efd16f" || selector === "1c31f710")
  ) {
    // Try to extract recipient from stream params - usually first address in tuple
    let recipient = ""
    if (calldata.length >= 74) {
      // Skip dynamic offset, look for first address-like data
      recipient = decodeAddress(calldata, 1) // recipient is often 2nd param after sender
    }

    return {
      type: "stream_create",
      recipient: recipient || undefined,
      functionName: sigFuncName || funcInfo?.name || "createStream",
      description: "Create payment stream",
      icon: <Droplets className="w-4 h-4" />,
      details: signature || undefined,
    }
  }

  // Sablier Stream Cancel
  if (contractInfo?.type === "stream" && (sigFuncName.includes("cancel") || selector === "40e58ee5")) {
    const streamId = decodeUint256(calldata, 0)
    return {
      type: "stream_cancel",
      tokenId: streamId.toString(),
      functionName: "cancel",
      description: `Cancel stream #${streamId}`,
      icon: <Clock className="w-4 h-4" />,
    }
  }

  // sendOrRegisterDebt - Treasury ETH transfer
  if (sigFuncName === "sendOrRegisterDebt" || selector === "5a9b0b89") {
    const recipient = decodeAddress(calldata, 0)
    const amount = decodeUint256(calldata, 1)
    const ethAmount = formatTokenAmount(amount, 18)

    return {
      type: "eth_transfer",
      recipient,
      amount: ethAmount,
      symbol: "ETH",
      functionName: "sendOrRegisterDebt",
      description: `Send ${ethAmount} ETH from Treasury`,
      icon: <Send className="w-4 h-4" />,
    }
  }

  // Generic contract call with ETH value
  if (hasEthValue) {
    return {
      type: "contract_call",
      recipient: target,
      amount: ethValue,
      symbol: "ETH",
      functionName: sigFuncName || funcInfo?.name || "call",
      description: `Call ${contractInfo?.name || "contract"} with ${ethValue} ETH`,
      icon: <FileCode className="w-4 h-4" />,
      details: signature || undefined,
    }
  }

  // Unknown/Generic contract call
  const displayFuncName = sigFuncName || funcInfo?.name || "execute"
  return {
    type: "contract_call",
    functionName: displayFuncName,
    description: `${contractInfo?.name || "Contract"}: ${displayFuncName}()`,
    icon: <FileCode className="w-4 h-4" />,
    details: signature || undefined,
  }
}

// Get color scheme based on transaction type
function getTypeColors(type: DecodedTransaction["type"]): { bg: string; text: string; border: string } {
  switch (type) {
    case "eth_transfer":
      return { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" }
    case "token_transfer":
      return { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" }
    case "nft_transfer":
      return { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" }
    case "stream_create":
    case "stream_cancel":
      return { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" }
    case "approval":
      return { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" }
    default:
      return { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/30" }
  }
}

function getTypeLabel(type: DecodedTransaction["type"]): string {
  switch (type) {
    case "eth_transfer":
      return "ETH Transfer"
    case "token_transfer":
      return "Token Transfer"
    case "nft_transfer":
      return "NFT Transfer"
    case "stream_create":
      return "Create Stream"
    case "stream_cancel":
      return "Cancel Stream"
    case "approval":
      return "Approval"
    default:
      return "Contract Call"
  }
}

interface TransactionData {
  target: string
  value: string
  signature: string
  calldata: string
  decoded: DecodedTransaction
}

interface TransactionSimulatorProps {
  proposalId: number
}

function TransactionSimulatorInner({ proposalId }: TransactionSimulatorProps) {
  const [mounted, setMounted] = useState(false)
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedTx, setExpandedTx] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchTransactionData = async () => {
      try {
        const { querySubgraph } = await import("@/lib/subgraph")
        const data = await querySubgraph(`{
          proposal(id: "${proposalId}") {
            targets
            values
            signatures
            calldatas
          }
        }`)
        const proposal = data?.proposal

        if (proposal && proposal.targets && proposal.targets.length > 0) {
          const txs: TransactionData[] = proposal.targets.map((target: string, index: number) => {
            const sig = proposal.signatures?.[index] || ""
            const calldata = proposal.calldatas?.[index] || "0x"
            const value = proposal.values?.[index] || "0"

            const decoded = decodeTransaction(target, sig, calldata, value)

            return {
              target,
              value,
              signature: sig,
              calldata,
              decoded,
            }
          })

          setTransactions(txs)
        } else {
          setError("No transaction data found")
        }
      } catch (err) {
        setError("Failed to load transaction data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactionData()
  }, [proposalId, mounted])

  if (!mounted || isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[#1a1a2e] rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-[#3a3a5a] rounded w-1/4 mb-3" />
            <div className="h-3 bg-[#3a3a5a] rounded w-3/4 mb-2" />
            <div className="h-3 bg-[#3a3a5a] rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (error || transactions.length === 0) {
    return (
      <div className="text-muted-foreground text-sm p-4 bg-[#1a1a2e] rounded-lg">
        {error || "No transactions found for this proposal."}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">
        This proposal will execute {transactions.length} transaction{transactions.length > 1 ? "s" : ""}:
      </p>

      {transactions.map((tx, index) => {
        const isExpanded = expandedTx === index
        const colors = getTypeColors(tx.decoded.type)
        const contractInfo = KNOWN_CONTRACTS[tx.target.toLowerCase()]

        return (
          <div key={index} className={`rounded-lg border ${colors.border} overflow-hidden bg-[#1a1a2e]`}>
            {/* Summary Card */}
            <button
              onClick={() => setExpandedTx(isExpanded ? null : index)}
              className="w-full p-4 text-left hover:bg-[#252540] transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${colors.bg} ${colors.text} shrink-0`}>{tx.decoded.icon}</div>

                <div className="flex-1 min-w-0">
                  {/* Type and Amount */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={`${colors.bg} ${colors.text} border-0 text-xs`}>
                      {getTypeLabel(tx.decoded.type)}
                    </Badge>
                    {tx.decoded.amount && tx.decoded.symbol && (
                      <span className="font-bold text-foreground text-lg">
                        {tx.decoded.amount} {tx.decoded.symbol}
                      </span>
                    )}
                    {tx.decoded.tokenId && tx.decoded.type === "nft_transfer" && (
                      <Badge variant="outline" className="text-purple-400 border-purple-400">
                        Token #{tx.decoded.tokenId}
                      </Badge>
                    )}
                  </div>

                  {/* Recipient */}
                  {tx.decoded.recipient && (
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">To:</span>
                      <div className="flex items-center gap-2">
                        <EnsDisplay
                          address={tx.decoded.recipient}
                          className="text-foreground font-medium"
                          showAvatar
                          avatarSize={20}
                        />
                      </div>
                    </div>
                  )}

                  {/* Contract (if not same as recipient) */}
                  {tx.decoded.recipient?.toLowerCase() !== tx.target.toLowerCase() && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>Via:</span>
                      <span className="text-foreground">{contractInfo?.name || tx.target.slice(0, 10) + "..."}</span>
                    </div>
                  )}

                  {/* Function name for contract calls */}
                  {tx.decoded.functionName && tx.decoded.type === "contract_call" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>Function:</span>
                      <code className="text-green-400">{tx.decoded.functionName}()</code>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-[#3a3a5a] pt-3 space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Target Contract</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-foreground break-all">{tx.target}</code>
                    <a
                      href={`https://etherscan.io/address/${tx.target}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {contractInfo && <span className="text-xs text-green-400">{contractInfo.name}</span>}
                </div>

                {tx.signature && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Function Signature</span>
                    <code className="text-xs font-mono text-green-400 break-all">{tx.signature}</code>
                  </div>
                )}

                {tx.calldata && tx.calldata !== "0x" && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Calldata</span>
                    <code className="block text-xs font-mono text-muted-foreground bg-[#252540] p-2 rounded break-all max-h-24 overflow-y-auto">
                      {tx.calldata}
                    </code>
                  </div>
                )}

                {tx.value !== "0" && BigInt(tx.value) > BigInt(0) && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">ETH Value</span>
                    <span className="text-sm text-blue-400 font-mono">{formatEthAmount(tx.value)} ETH</span>
                  </div>
                )}

                {tx.decoded.details && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Additional Info</span>
                    <span className="text-xs text-foreground">{tx.decoded.details}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function TransactionSimulator({ proposalId }: TransactionSimulatorProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[#1a1a2e] rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-[#3a3a5a] rounded w-1/4 mb-3" />
            <div className="h-3 bg-[#3a3a5a] rounded w-3/4 mb-2" />
            <div className="h-3 bg-[#3a3a5a] rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  return <TransactionSimulatorInner proposalId={proposalId} />
}
