"use client"

import { useAccount, useConnect, useDisconnect, useEnsName } from "wagmi"
import { Button } from "./ui/button"
import { mainnet } from "wagmi/chains"
import { useState, useEffect } from "react"

interface WalletConnectButtonProps {
  colorScheme?: "default" | "pink"
}

function WalletConnectButtonInner({ colorScheme = "default" }: WalletConnectButtonProps) {
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

    return (
      <Button onClick={() => disconnect()} variant="outline" className={colorScheme === "pink" ? "border-pink-600 text-pink-600 hover:bg-pink-600/10" : ""}>
        {displayName}
      </Button>
    )
  }

  const walletConnectConnector = connectors.find((c) => c.id === "walletConnect")

  if (!walletConnectConnector) {
    return null
  }

  return (
    <Button 
      onClick={() => connect({ connector: walletConnectConnector })}
      className={colorScheme === "pink" ? pinkClasses : ""}
    >
      Connect Wallet
    </Button>
  )
}

export function WalletConnectButton({ colorScheme = "default" }: WalletConnectButtonProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" disabled className={colorScheme === "pink" ? "border-pink-600 text-pink-600" : ""}>
        Connect Wallet
      </Button>
    )
  }

  return <WalletConnectButtonInner colorScheme={colorScheme} />
}

export default WalletConnectButton
