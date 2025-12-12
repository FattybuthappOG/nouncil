"use client"

import { useEnsName } from "wagmi"
import { mainnet } from "wagmi/chains"
import { useState, useEffect } from "react"

interface EnsDisplayProps {
  address: string | undefined
  className?: string
  showFull?: boolean
}

export function EnsDisplay({ address, className = "", showFull = false }: EnsDisplayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: ensName, isLoading } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
    query: {
      enabled: mounted && !!address, // Only fetch when mounted and address exists
    },
  })

  if (!address) {
    return <span className={className}>Unknown</span>
  }

  const displayClassName = `text-primary hover:underline ${className}`

  if (!mounted || isLoading) {
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
