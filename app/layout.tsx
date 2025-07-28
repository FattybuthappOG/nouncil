import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Nouncil Governance",
  description: "Decentralized Governance Platform",
  generator: "v0.dev",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/images/nouncil-logo.webp", sizes: "32x32", type: "image/webp" },
      { url: "/images/nouncil-logo.webp", sizes: "16x16", type: "image/webp" },
    ],
    apple: [{ url: "/images/nouncil-logo.webp", sizes: "180x180", type: "image/webp" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nouncil Governance",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Nouncil Governance",
    title: "Nouncil Governance",
    description: "Decentralized Governance Platform",
  },
  twitter: {
    card: "summary",
    title: "Nouncil Governance",
    description: "Decentralized Governance Platform",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="v0-attribution" content="false" />

        {/* Favicon */}
        <link rel="icon" href="/images/nouncil-logo.webp" type="image/webp" />
        <link rel="icon" href="/images/nouncil-logo.webp" sizes="16x16" type="image/webp" />
        <link rel="icon" href="/images/nouncil-logo.webp" sizes="32x32" type="image/webp" />
        <link rel="shortcut icon" href="/images/nouncil-logo.webp" type="image/webp" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/images/nouncil-logo.webp" type="image/webp" sizes="any" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/images/nouncil-logo.webp" />
        <link rel="apple-touch-icon" sizes="57x57" href="/images/nouncil-logo.webp" />
        <link rel="apple-touch-icon" sizes="72x72" href="/images/nouncil-logo.webp" />
        <link rel="apple-touch-icon" sizes="76x76" href="/images/nouncil-logo.webp" />
        <link rel="apple-touch-icon" sizes="114x114" href="/images/nouncil-logo.webp" />
        <link rel="apple-touch-icon" sizes="120x120" href="/images/nouncil-logo.webp" />
        <link rel="apple-touch-icon" sizes="144x144" href="/images/nouncil-logo.webp" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/nouncil-logo.webp" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/nouncil-logo.webp" />

        {/* Android Chrome Icons */}
        <link rel="icon" type="image/webp" sizes="192x192" href="/images/nouncil-logo.webp" />
        <link rel="icon" type="image/webp" sizes="512x512" href="/images/nouncil-logo.webp" />

        {/* Web App Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme Color */}
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-TileImage" content="/images/nouncil-logo.webp" />

        {/* Apple Web App */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Nouncil Governance" />

        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
