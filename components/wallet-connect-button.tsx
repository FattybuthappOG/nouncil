"use client"

import { useAccount, useConnect, useDisconnect, useEnsName } from "wagmi"
import { Button } from "./ui/button"
import { mainnet } from "wagmi/chains"
import { useState, useEffect, useRef } from "react"
import { Wallet, X } from "lucide-react"

interface WalletConnectButtonProps {
  colorScheme?: "default" | "pink"
  compact?: boolean
}

function WalletConnectButtonInner({ colorScheme = "default", compact = false }: WalletConnectButtonProps) {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [showModal, setShowModal] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id,
    query: {
      enabled: !!address,
    },
  })

  // Close modal on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModal(false)
      }
    }
    if (showModal) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showModal])

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

  const walletConnectConnector = connectors.find((c) => c.id === "walletConnect")
  const injectedConnector = connectors.find((c) => c.id === "injected")

  const handleAmbireConnect = () => {
    setShowModal(false)
    if ((window as any).ambire?.provider || (window as any).ethereum?.isAmbire) {
      if (injectedConnector) {
        connect({ connector: injectedConnector })
      }
    } else {
      window.open("https://wallet.ambire.com", "_blank")
    }
  }

  const handleWalletConnectConnect = () => {
    setShowModal(false)
    // Prefer WalletConnect for QR code scanning on desktop
    if (walletConnectConnector) {
      connect({ connector: walletConnectConnector })
    } else if (injectedConnector) {
      // Fallback to injected if WalletConnect is not available
      connect({ connector: injectedConnector })
    }
  }

  const handleInjectedConnect = () => {
    setShowModal(false)
    // Use injected connector for browser extensions (MetaMask, etc.)
    if (injectedConnector) {
      connect({ connector: injectedConnector })
    }
  }

  if (compact) {
    return (
      <div className="relative" ref={modalRef}>
        <Button
          onClick={() => setShowModal((v) => !v)}
          size="sm"
          className={`p-2 ${colorScheme === "pink" ? pinkClasses : ""}`}
        >
          <Wallet className="w-4 h-4" />
        </Button>
        {showModal && (
          <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-border bg-background shadow-lg p-2 flex flex-col gap-1">
            {injectedConnector && (
              <WalletOption
                label="Browser Wallet"
                description="MetaMask, etc."
                icon={<BrowserWalletIcon />}
                onClick={handleInjectedConnect}
              />
            )}
            {walletConnectConnector && (
              <WalletOption
                label="WalletConnect"
                description="Scan QR code"
                icon={<WalletConnectIcon />}
                onClick={handleWalletConnectConnect}
              />
            )}
            <WalletOption
              label="Ambire V2"
              description="Smart contract wallet"
              icon={<AmbireIcon />}
              onClick={handleAmbireConnect}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={modalRef}>
      <Button
        onClick={() => setShowModal((v) => !v)}
        className={colorScheme === "pink" ? pinkClasses : ""}
      >
        Connect Wallet
      </Button>
      {showModal && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-lg border border-border bg-background shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Select wallet</span>
            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 flex flex-col gap-1">
            {injectedConnector && (
              <WalletOption
                label="Browser Wallet"
                description="MetaMask, etc."
                icon={<BrowserWalletIcon />}
                onClick={handleInjectedConnect}
              />
            )}
            {walletConnectConnector && (
              <WalletOption
                label="WalletConnect"
                description="Scan QR code"
                icon={<WalletConnectIcon />}
                onClick={handleWalletConnectConnect}
              />
            )}
            <WalletOption
              label="Ambire V2"
              description="Smart contract wallet"
              icon={<AmbireIcon />}
              onClick={handleAmbireConnect}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function WalletOption({ label, description, icon, onClick }: { label: string; description: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors text-left"
    >
      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  )
}

function BrowserWalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
      <path d="M6 8h2M16 8h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function WalletConnectIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4.91 7.46C8.84 3.52 15.16 3.52 19.09 7.46L19.56 7.93C19.76 8.13 19.76 8.46 19.56 8.66L17.96 10.27C17.86 10.37 17.7 10.37 17.6 10.27L16.95 9.62C14.2 6.87 9.8 6.87 7.05 9.62L6.35 10.32C6.25 10.42 6.09 10.42 5.99 10.32L4.39 8.71C4.19 8.51 4.19 8.18 4.39 7.98L4.91 7.46ZM22.37 10.74L23.79 12.16C23.99 12.36 23.99 12.69 23.79 12.89L17.28 19.4C17.08 19.6 16.75 19.6 16.55 19.4L12.03 14.88C11.98 14.83 11.9 14.83 11.85 14.88L7.33 19.4C7.13 19.6 6.8 19.6 6.6 19.4L0.21 12.89C0.01 12.69 0.01 12.36 0.21 12.16L1.63 10.74C1.83 10.54 2.16 10.54 2.36 10.74L6.88 15.26C6.93 15.31 7.01 15.31 7.06 15.26L11.58 10.74C11.78 10.54 12.11 10.54 12.31 10.74L16.83 15.26C16.88 15.31 16.96 15.31 17.01 15.26L21.53 10.74C21.73 10.54 22.07 10.54 22.37 10.74Z" fill="#3B99FC"/>
    </svg>
  )
}

function AmbireIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#6B4EFF"/>
      <path d="M12 4L20 19H4L12 4Z" fill="white" fillOpacity="0.9"/>
      <path d="M12 9L16.5 17H7.5L12 9Z" fill="#6B4EFF"/>
    </svg>
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
