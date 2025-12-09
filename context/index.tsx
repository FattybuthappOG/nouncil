"use client"

import { getConfig } from "@/config"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useState, useEffect } from "react"
import { WagmiProvider } from "wagmi"

function ContextProvider({ children }: { children: ReactNode }) {
  const [config] = useState(() => getConfig())

  useEffect(() => {
    // This triggers the async WalletConnect loading
    const timer = setTimeout(() => {
      // Config will be updated with WalletConnect after it loads
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider
