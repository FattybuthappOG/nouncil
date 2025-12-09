"use client"

import { getConfig } from "@/config"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useState } from "react"
import { WagmiProvider } from "wagmi"

function ContextProvider({ children }: { children: ReactNode }) {
  const [config] = useState(() => {
    // Only create config on client side
    if (typeof window !== "undefined") {
      return getConfig()
    }
    return null
  })

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

  if (!config) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider
