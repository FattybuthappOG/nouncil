"use client"

import { useState, useEffect } from "react"
import { usePublicClient } from "wagmi"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, FileCode } from "lucide-react"
import { EnsDisplay } from "@/components/ens-display"

// Known Nouns contracts for better labeling
const KNOWN_CONTRACTS: Record<string, string> = {
  "0x6f3e6272a167e8accb32072d08e0957f9c79223d": "Nouns DAO Proxy",
  "0x0bc3807ec262cb779b38d65b38158acc3bfede10": "Nouns DAO Logic V3",
  "0x830bd73e4184cef73443c15111a1df14e495c706": "Nouns DAO Executor",
  "0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03": "Nouns Token",
  "0x0bc3807ec262cb779b38d65b38158acc3bfede10": "Nouns Descriptor",
  "0xb1a32fc9f9d8b2cf86c068cae13108809547ef71": "Nouns Art",
  "0x2573c60a6d127755aa2dc85e342f7da2378a0cc5": "Nouns Auction House",
}

interface TransactionData {
  target: string
  value: string
  signature: string
  calldata: string
}

interface TransactionSimulatorProps {
  proposalId: number
}

export function TransactionSimulator({ proposalId }: TransactionSimulatorProps) {
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [contractNames, setContractNames] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const publicClient = usePublicClient()

  useEffect(() => {
    const fetchTransactionData = async () => {
      try {
        const response = await fetch(
          "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `
              query {
                proposal(id: "${proposalId}") {
                  targets
                  values
                  signatures
                  calldatas
                }
              }
            `,
            }),
          },
        )

        const data = await response.json()
        const proposal = data?.data?.proposal

        if (proposal && proposal.targets) {
          const txs: TransactionData[] = proposal.targets.map((target: string, index: number) => ({
            target: target,
            value: proposal.values?.[index] || "0",
            signature: proposal.signatures?.[index] || "",
            calldata: proposal.calldatas?.[index] || "0x",
          }))

          setTransactions(txs)

          // Resolve contract names for each target
          const names: Record<string, string> = {}
          for (const target of proposal.targets) {
            const lowerTarget = target.toLowerCase()
            // Check if it's a known contract first
            if (KNOWN_CONTRACTS[lowerTarget]) {
              names[target] = KNOWN_CONTRACTS[lowerTarget]
            } else {
              // Try ENS reverse lookup
              try {
                const ensName = await publicClient?.getEnsName({
                  address: target as `0x${string}`,
                })
                if (ensName) {
                  names[target] = ensName
                }
              } catch (error) {}
            }
          }
          setContractNames(names)
        }
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactionData()
  }, [proposalId, publicClient])

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FileCode className="w-5 h-5" />
          Transaction Simulator
        </h2>
        <div className="text-gray-400 text-sm">Loading transaction data...</div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 overflow-hidden max-w-full">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <FileCode className="w-5 h-5" />
        Transaction Simulator
      </h2>
      <div className="space-y-4">
        {transactions.map((tx, index) => (
          <div key={index} className="bg-gray-700 rounded-lg p-4 border border-gray-600 overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Transaction {index + 1}
                </Badge>
                {tx.value !== "0" && (
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    {(Number(tx.value) / 1e18).toFixed(4)} ETH
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">To: </span>
                <div className="flex items-center gap-2 mt-1">
                  {contractNames[tx.target] ? (
                    <span className="text-white font-medium truncate">{contractNames[tx.target]}</span>
                  ) : (
                    <EnsDisplay address={tx.target as `0x${string}`} />
                  )}
                  <a
                    href={`https://etherscan.io/address/${tx.target}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <code className="block mt-1 text-xs text-gray-500 font-mono break-all">{tx.target}</code>
              </div>

              {tx.signature && (
                <div>
                  <span className="text-gray-400">Function: </span>
                  <code className="text-green-400 font-mono text-xs break-all overflow-wrap-anywhere block">
                    {tx.signature}
                  </code>
                </div>
              )}

              {tx.calldata && tx.calldata !== "0x" && (
                <div>
                  <span className="text-gray-400">Calldata: </span>
                  <code className="block mt-1 text-xs text-gray-500 font-mono break-all bg-gray-900 p-2 rounded overflow-hidden">
                    {tx.calldata.length > 200 ? `${tx.calldata.slice(0, 200)}...` : tx.calldata}
                  </code>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
