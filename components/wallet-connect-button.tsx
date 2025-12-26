"use client"

import { useAccount, useConnect, useDisconnect, useEnsName } from "wagmi"
import { Button } from "./ui/button"
import { mainnet } from "wagmi/chains"
import { useState, useEffect } from "react"

function WalletConnectButtonInner() {
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

  if (isConnected && address) {
    const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`

    return (
      <Button onClick={() => disconnect()} variant="outline">
        {displayName}
      </Button>
    )
  }

  const walletConnectConnector = connectors.find((c) => c.id === "walletConnect")

  if (!walletConnectConnector) {
    return null
  }

  return <Button onClick={() => connect({ connector: walletConnectConnector })}>Connect Wallet</Button>
}

export function WalletConnectButton() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="outline" disabled>
        Connect Wallet
      </Button>
    )
  }

  return <WalletConnectButtonInner />
}

export default WalletConnectButton
