import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ContextProvider from "@/context"
import MiniappReady from "@/components/miniapp-ready"
import { SnowEffect } from "@/components/snow-effect"

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
    icon: "/nouncil-icon.svg",
    apple: "/nouncil-apple-icon.svg",
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://nouncil.wtf/images/nouncil-logo.webp",
    "fc:miniapp": "https://nouncil.wtf/.well-known/farcaster.json",
    "of:version": "vNext",
    "of:accepts:xmtp": "2024-02-01",
    "miniapp:version": "1.0.0",
  },
    generator: 'v0.app'
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-background">
      <head>
        <meta property="fc:miniapp" content="https://nouncil.wtf/.well-known/farcaster.json" />
        <meta property="miniapp:version" content="1.0.0" />
      </head>
      <body className={`${inter.className} overflow-x-hidden`}>
        <ContextProvider>
          <MiniappReady />
          <SnowEffect />
          {children}
        </ContextProvider>
      </body>
    </html>
  )
}
