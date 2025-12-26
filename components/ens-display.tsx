"use client"

import { useEnsName, useEnsAvatar } from "wagmi"
import { mainnet } from "wagmi/chains"
import { useState, useEffect } from "react"
import Link from "next/link"

interface EnsDisplayProps {
  address: string | undefined
  className?: string
  showFull?: boolean
  showAvatar?: boolean
  avatarSize?: number
  disableLink?: boolean
}

function EnsDisplayInner({
  address,
  className = "",
  showFull = false,
  showAvatar = false,
  avatarSize = 20,
  disableLink = false,
}: EnsDisplayProps) {
  const { data: ensName, isLoading: ensLoading } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
    query: {
      enabled: !!address,
    },
  })

  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
    chainId: mainnet.id,
    query: {
      enabled: !!ensName && showAvatar,
    },
  })

  if (!address) {
    return <span className={className}>Unknown</span>
  }

  const truncatedAddress = showFull ? address : `${address.slice(0, 6)}...${address.slice(-4)}`
  const displayName = ensName || truncatedAddress
  const etherscanUrl = `https://etherscan.io/address/${address}`

  const content = (
    <span className={`flex items-center gap-2`}>
      {showAvatar &&
        (ensAvatar ? (
          <img
            src={ensAvatar || "/placeholder.svg"}
            alt={displayName}
            className="rounded-full"
            style={{ width: avatarSize, height: avatarSize }}
          />
        ) : (
          <span
            className="rounded-full bg-gradient-to-br from-blue-500 to-purple-500"
            style={{ width: avatarSize, height: avatarSize }}
          />
        ))}
      {displayName}
    </span>
  )

  if (ensLoading) {
    return (
      <span className={`flex items-center gap-2 text-primary ${className}`}>
        {showAvatar && (
          <span className="rounded-full bg-muted animate-pulse" style={{ width: avatarSize, height: avatarSize }} />
        )}
        {truncatedAddress}
      </span>
    )
  }

  if (disableLink) {
    return <span className={`text-primary ${className}`}>{content}</span>
  }

  return (
    <Link
      href={etherscanUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-primary hover:underline transition-colors ${className}`}
    >
      {content}
    </Link>
  )
}

export function EnsDisplay(props: EnsDisplayProps) {
  const [mounted, setMounted] = useState(false)
  const { address, className = "", showFull = false, showAvatar = false, avatarSize = 20, disableLink = false } = props

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    if (!address) {
      return <span className={className}>Unknown</span>
    }
    const truncatedAddress = showFull ? address : `${address.slice(0, 6)}...${address.slice(-4)}`
    const etherscanUrl = `https://etherscan.io/address/${address}`

    const content = (
      <span className={`flex items-center gap-2`}>
        {showAvatar && (
          <span className="rounded-full bg-muted animate-pulse" style={{ width: avatarSize, height: avatarSize }} />
        )}
        {truncatedAddress}
      </span>
    )

    if (disableLink) {
      return <span className={`text-primary ${className}`}>{content}</span>
    }

    return (
      <Link
        href={etherscanUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-primary hover:underline transition-colors ${className}`}
      >
        {content}
      </Link>
    )
  }

  return <EnsDisplayInner {...props} />
}

export default EnsDisplay
