"use client"

import { getConfig } from "@/config"
import type { ReactNode } from "react"
import { useState, useEffect } from "react"
import { WagmiProvider, cookieToInitialState } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme-provider"

type Props = {
  children: ReactNode
  cookies?: string | null
}

function ContextProvider({ children, cookies }: Props) {
  // Suppress WalletConnect provider.disconnect errors (known issue with @walletconnect/core)
  useEffect(() => {
    const originalError = console.error
    console.error = (...args) => {
      const message = args[0]?.toString?.() || ""
      if (message.includes("provider.disconnect is not a function")) {
        return // Suppress this known WalletConnect error
      }
      originalError.apply(console, args)
    }
    return () => {
      console.error = originalError
    }
  }, [])
  const [config] = useState(() => getConfig())
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  )

  const initialState = cookies ? cookieToInitialState(config, cookies) : undefined

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <WagmiProvider config={config} initialState={initialState}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}

export default ContextProvider
