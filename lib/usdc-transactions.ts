/**
 * USDC Transaction Generator Utilities
 * Handles generating calldata for USDC transfers via Treasury or Payer
 */

export const CONTRACTS = {
  // Nouns Treasury / Executor (uses treasury ETH and tokens)
  TREASURY: "0xb1a32fc9f9d8b2cf86c068cae13108809547ef71",
  // Nouns Payer (receives USDC from treasury via sendOrRegisterDebt)
  PAYER: "0xd97bcd9f47cee35c0a9ec1dc40c1269afc9e8e1d",
  // USDC Token
  USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
} as const

/**
 * Generate USDC transfer calldata via Nouns Payer contract
 * Uses sendOrRegisterDebt function which is more gas-efficient for repeated payments
 */
export function generatePayerTransferCalldata(recipient: string, amountUSDC: bigint): string {
  // Validate recipient is a valid address
  if (!recipient.match(/^0x[0-9a-fA-F]{40}$/)) {
    throw new Error("Invalid recipient address")
  }

  if (amountUSDC <= 0n) {
    throw new Error("Amount must be greater than 0")
  }

  // Convert USDC amount to wei (6 decimals)
  const amountWei = amountUSDC * BigInt(10 ** 6)

  // Function selector for sendOrRegisterDebt(address,uint256)
  const selector = "5a9b0b89"

  // Encode recipient (address, 32 bytes)
  const recipientEncoded = recipient.slice(2).padStart(64, "0")

  // Encode amount (uint256, 32 bytes)
  const amountEncoded = amountWei.toString(16).padStart(64, "0")

  return `0x${selector}${recipientEncoded}${amountEncoded}`
}

/**
 * Generate USDC transfer calldata via direct ERC20 transfer
 * Transfers USDC directly from Treasury
 */
export function generateDirectTransferCalldata(recipient: string, amountUSDC: bigint): string {
  // Validate recipient is a valid address
  if (!recipient.match(/^0x[0-9a-fA-F]{40}$/)) {
    throw new Error("Invalid recipient address")
  }

  if (amountUSDC <= 0n) {
    throw new Error("Amount must be greater than 0")
  }

  // Convert USDC amount to wei (6 decimals)
  const amountWei = amountUSDC * BigInt(10 ** 6)

  // Function selector for transfer(address,uint256)
  const selector = "a9059cbb"

  // Encode recipient (address, 32 bytes)
  const recipientEncoded = recipient.slice(2).padStart(64, "0")

  // Encode amount (uint256, 32 bytes)
  const amountEncoded = amountWei.toString(16).padStart(64, "0")

  return `0x${selector}${recipientEncoded}${amountEncoded}`
}

/**
 * Generate complete USDC proposal transaction
 */
export interface USDCTransactionOptions {
  method: "payer" | "treasury"
  recipient: string
  amountUSDC: bigint
}

export function generateUSDCTransaction(options: USDCTransactionOptions) {
  const { method, recipient, amountUSDC } = options

  const isPayerMethod = method === "payer"

  return {
    target: isPayerMethod ? CONTRACTS.PAYER : CONTRACTS.USDC,
    signature: isPayerMethod
      ? "sendOrRegisterDebt(address,uint256)"
      : "transfer(address,uint256)",
    calldata: isPayerMethod
      ? generatePayerTransferCalldata(recipient, amountUSDC)
      : generateDirectTransferCalldata(recipient, amountUSDC),
    value: "0",
  }
}

/**
 * Format USDC amount from wei to human-readable string
 */
export function formatUSDC(weiAmount: bigint): string {
  if (weiAmount === BigInt(0)) return "0"

  const divisor = BigInt(10 ** 6)
  const intPart = weiAmount / divisor
  const fracPart = weiAmount % divisor

  if (fracPart === BigInt(0)) {
    return intPart.toLocaleString()
  }

  const fracStr = fracPart.toString().padStart(6, "0")
  const trimmedFrac = fracStr.replace(/0+$/, "")

  if (trimmedFrac.length === 0) {
    return intPart.toLocaleString()
  }

  return `${intPart.toLocaleString()}.${trimmedFrac}`
}
