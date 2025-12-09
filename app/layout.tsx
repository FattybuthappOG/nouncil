import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import ContextProvider from "@/context"
import { headers } from "next/headers"

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
    "fc:frame:image": "https://nouncil.app/og-image.png",
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

  return (
    <html lang="en">
      <body className={inter.className}>
        <ContextProvider cookies={cookies}>{children}</ContextProvider>
      </body>
    </html>
  )
}
