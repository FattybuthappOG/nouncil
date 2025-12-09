"use client"

import { getConfig } from "@/config"
import type { ReactNode } from "react"
import { useState } from "react"
import { type State, WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

type Props = {
  children: ReactNode
  initialState?: State | undefined
}

function ContextProvider({ children, initialState }: Props) {
  const [config] = useState(() => getConfig())
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider
