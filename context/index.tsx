"use client"

import { getConfig } from "@/config"
import type { ReactNode } from "react"
import { useState, useEffect } from "react"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme-provider"

type Props = {
  children: ReactNode
}

function ContextProvider({ children }: Props) {
  const [config] = useState(() => getConfig())
  const [queryClient] = useState(() => new QueryClient())

  // Suppress WalletConnect telemetry errors in browser environment
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalFetch = window.fetch
      window.fetch = function (...args) {
        const url = args[0]
        // Block WalletConnect telemetry requests but allow other fetches
        if (typeof url === "string" && url.includes("pulse.walletconnect.org")) {
          return Promise.reject(new Error("WalletConnect telemetry disabled"))
        }
        return originalFetch.apply(this, args)
      }
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}

export default ContextProvider
