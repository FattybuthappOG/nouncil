import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ContextProvider from "@/context"
import { headers } from "next/headers"
import { cookieToInitialState } from "wagmi"
import { getConfig } from "@/config"
import MiniappReady from "@/components/miniapp-ready"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Nouncil",
  description: "Nouncil DAO Governance Dashboard",
  applicationName: "Nouncil",
  appleWebApp: {
    capable: true,
    title: "Nouncil",
    statusBarStyle: "default",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "data:image/svg+xml;charset=utf-8;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTAgMFY3MkgyNFYyNEg0OFYwSDBaTTcyIDcyVjI0SDQ4VjcySDcyWiIgZmlsbD0iI2UyMDAxMCIvPgo8L3N2Zz4K",
    apple: "/apple-icon",
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://nouncil.wtf/images/nouncil-logo.webp",
    "fc:miniapp": "https://nouncil.wtf/.well-known/farcaster.json",
    "of:version": "vNext",
    "of:accepts:xmtp": "2024-02-01",
  },
    generator: 'v0.app'
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersObj = await headers()
  const cookies = headersObj.get("cookie")

  let initialState
  try {
    initialState = cookieToInitialState(getConfig(), cookies)
  } catch (error) {
    // If cookie is malformed, start fresh with undefined state
    console.warn("Failed to parse wagmi cookie state, starting fresh:", error)
    initialState = undefined
  }

  return (
    <html lang="en">
      <head>
        <meta property="fc:miniapp" content="https://nouncil.wtf/.well-known/farcaster.json" />
      </head>
      <body className={inter.className}>
        <ContextProvider initialState={initialState}>
          <MiniappReady />
          {children}
        </ContextProvider>
      </body>
    </html>
  )
}
