"use client"

import { useAccount, useConnect, useDisconnect, useEnsName } from "wagmi"
import { Button } from "./ui/button"
import { mainnet } from "wagmi/chains"
import { useState, useEffect } from "react"
import { Wallet } from "lucide-react"

interface WalletConnectButtonProps {
  colorScheme?: "default" | "pink"
  compact?: boolean
}

function WalletConnectButtonInner({ colorScheme = "default", compact = false }: WalletConnectButtonProps) {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id,
    query: {
      enabled: !!address,
    },
  })

  const pinkClasses = "bg-pink-600 hover:bg-pink-700 text-white"

  if (isConnected && address) {
    const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`

    if (compact) {
      return (
        <Button onClick={() => disconnect()} variant="outline" size="sm" className={`p-2 ${colorScheme === "pink" ? "border-pink-600 text-pink-600 hover:bg-pink-600/10" : ""}`}>
          <Wallet className="w-4 h-4" />
        </Button>
      )
    }

    return (
      <Button onClick={() => disconnect()} variant="outline" className={colorScheme === "pink" ? "border-pink-600 text-pink-600 hover:bg-pink-600/10" : ""}>
        {displayName}
      </Button>
    )
  }

  // Try WalletConnect first, fall back to injected
  const walletConnectConnector = connectors.find((c) => c.id === "walletConnect")
  const injectedConnector = connectors.find((c) => c.id === "injected")
  const preferredConnector = walletConnectConnector || injectedConnector

  if (!preferredConnector) {
    return null
  }

  if (compact) {
    return (
      <Button 
        onClick={() => connect({ connector: preferredConnector })}
        size="sm"
        className={`p-2 ${colorScheme === "pink" ? pinkClasses : ""}`}
      >
        <Wallet className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <div className="flex gap-2">
      <Button 
        onClick={() => connect({ connector: preferredConnector })}
        className={colorScheme === "pink" ? pinkClasses : ""}
      >
        Connect Wallet
      </Button>
      {injectedConnector && (window as any).ambire?.provider && (
        <Button 
          onClick={() => connect({ connector: injectedConnector })}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          title="Connect with Ambire V2"
        >
          Ambire V2
        </Button>
      )}
    </div>
  )
}

export function WalletConnectButton({ colorScheme = "default", compact = false }: WalletConnectButtonProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    if (compact) {
      return (
        <Button variant="outline" size="sm" disabled className={`p-2 ${colorScheme === "pink" ? "border-pink-600 text-pink-600" : ""}`}>
          <Wallet className="w-4 h-4" />
        </Button>
      )
    }
    return (
      <Button variant="outline" disabled className={colorScheme === "pink" ? "border-pink-600 text-pink-600" : ""}>
        Connect Wallet
      </Button>
    )
  }

  return <WalletConnectButtonInner colorScheme={colorScheme} compact={compact} />
}

export default WalletConnectButton
