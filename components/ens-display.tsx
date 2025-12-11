"use client"

import { useEnsName } from "wagmi"
import { mainnet } from "wagmi/chains"

interface EnsDisplayProps {
  address: string | undefined
  className?: string
  showFull?: boolean
}

export function EnsDisplay({ address, className = "", showFull = false }: EnsDisplayProps) {
  const { data: ensName, isLoading } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  })

  if (!address) {
    return <span className={className}>Unknown</span>
  }

  const displayClassName = `text-primary hover:underline ${className}`

  if (isLoading) {
    return (
      <span className={displayClassName}>{showFull ? address : `${address.slice(0, 6)}...${address.slice(-4)}`}</span>
    )
  }

  if (ensName) {
    return <span className={displayClassName}>{ensName}</span>
  }

  return (
    <span className={displayClassName}>{showFull ? address : `${address.slice(0, 6)}...${address.slice(-4)}`}</span>
  )
}

export default EnsDisplay
