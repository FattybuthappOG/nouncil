"use client"

import { useAccount, useConnect, useDisconnect, useEnsName } from "wagmi"
import { Button } from "./ui/button"
import { mainnet } from "wagmi/chains"

export function WalletConnectButton() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id,
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

export default WalletConnectButton
