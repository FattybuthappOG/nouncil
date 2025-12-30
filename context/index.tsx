"use client"

import { getConfig } from "@/config"
import type { ReactNode } from "react"
import { useState } from "react"
import { WagmiProvider, cookieToInitialState } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme-provider"

type Props = {
  children: ReactNode
  cookies?: string | null
}

function ContextProvider({ children, cookies }: Props) {
  const [config] = useState(() => getConfig())
  const [queryClient] = useState(() => new QueryClient())

  let initialState: ReturnType<typeof cookieToInitialState> | undefined
  try {
    initialState = cookies ? cookieToInitialState(config, cookies) : undefined
  } catch (e) {
    console.log("[v0] Error parsing cookie state, using undefined:", e)
    initialState = undefined
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <WagmiProvider config={config} initialState={initialState}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}

export default ContextProvider
