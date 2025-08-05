import { useState, useEffect } from "react"
import { useReadContracts, useBalance } from "wagmi"
import { TREASURY_CONTRACT, COMMON_TOKENS, ERC20_ABI } from "@/lib/contracts"
import { formatUnits } from "viem"

export interface TokenBalance {
  name: string
  symbol: string
  balance: string
  decimals: number
  value?: number // USD value if available
  address: string
}

export interface TreasuryData {
  ethBalance: string
  totalValueUSD: number
  tokenBalances: TokenBalance[]
  lastUpdated: Date
}

export function useTreasuryData() {
  const [treasuryData, setTreasuryData] = useState<TreasuryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get ETH balance
  const { data: ethBalance, isLoading: ethLoading, error: ethError } = useBalance({
    address: TREASURY_CONTRACT.address,
  })

  // Prepare contracts for token balance queries
  const tokenContracts = Object.entries(COMMON_TOKENS).map(([symbol, address]) => [
    {
      address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [TREASURY_CONTRACT.address],
    },
    {
      address,
      abi: ERC20_ABI,
      functionName: "symbol",
    },
    {
      address,
      abi: ERC20_ABI,
      functionName: "name",
    },
    {
      address,
      abi: ERC20_ABI,
      functionName: "decimals",
    },
  ]).flat()

  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useReadContracts({
    contracts: tokenContracts,
  })

  useEffect(() => {
    if (ethLoading || tokenLoading) {
      setIsLoading(true)
      return
    }

    if (ethError || tokenError) {
      setError(ethError?.message || tokenError?.message || "Failed to fetch treasury data")
      setIsLoading(false)
      return
    }

    try {
      const ethBalanceFormatted = ethBalance ? formatUnits(ethBalance.value, 18) : "0"
      
      const tokenBalances: TokenBalance[] = []
      
      if (tokenData) {
        const tokens = Object.entries(COMMON_TOKENS)
        
        for (let i = 0; i < tokens.length; i++) {
          const [symbol, address] = tokens[i]
          const baseIndex = i * 4
          
          const balance = tokenData[baseIndex]?.result as bigint | undefined
          const tokenSymbol = tokenData[baseIndex + 1]?.result as string | undefined
          const tokenName = tokenData[baseIndex + 2]?.result as string | undefined
          const decimals = tokenData[baseIndex + 3]?.result as number | undefined
          
          if (balance !== undefined && decimals !== undefined && tokenSymbol && tokenName) {
            const formattedBalance = formatUnits(balance, decimals)
            
            // Only include tokens with non-zero balances
            if (Number(formattedBalance) > 0) {
              tokenBalances.push({
                name: tokenName,
                symbol: tokenSymbol,
                balance: formattedBalance,
                decimals,
                address,
              })
            }
          }
        }
      }

      // Calculate total value (simplified - would need price API for real USD values)
      const ethValue = Number(ethBalanceFormatted) * 3000 // Rough ETH price estimate
      const totalValueUSD = ethValue // + token values when price API is integrated

      setTreasuryData({
        ethBalance: ethBalanceFormatted,
        totalValueUSD,
        tokenBalances,
        lastUpdated: new Date(),
      })

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process treasury data")
    } finally {
      setIsLoading(false)
    }
  }, [ethBalance, ethLoading, ethError, tokenData, tokenLoading, tokenError])

  const refreshData = () => {
    setIsLoading(true)
    // The useBalance and useReadContracts hooks will automatically refetch
  }

  return {
    treasuryData,
    isLoading,
    error,
    refreshData,
  }
}