"use client"

import { http, createConfig } from "wagmi"
import { mainnet, base, sepolia } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

function buildConnectors() {
  const connectors = []
  
  // Always include injected (MetaMask, Ambire, etc.)
  connectors.push(injected())
  
  // Only add WalletConnect if projectId is set
  if (projectId && projectId.trim()) {
    try {
      connectors.push(
        walletConnect({
          projectId: projectId.trim(),
          showQrModal: true,
          metadata: {
            name: "Nouncil",
            description: "Nouns DAO governance",
            url: "https://nouncil.wtf",
            icons: ["https://nouncil.wtf/favicon.ico"],
          },
          qrModalOptions: {
            themeMode: "dark",
            enableExplorer: true,
            explorerRecommendedWalletIds: [
              "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa", // Coinbase
              "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369", // Rainbow
              "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
              "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0", // Trust
              "3099ebb6137c649b969b2fe215625050cdfbe91b5811a1e6ae78faf05c37d4b8", // Ambire
            ],
          },
        })
      )
    } catch (e) {
      console.warn("[wallet] WalletConnect initialization failed:", e)
      // Continue with injected-only fallback
    }
  }
  
  return connectors
}

export function getConfig() {
  return createConfig({
    chains: [mainnet, base, sepolia],
    connectors: buildConnectors(),
    transports: {
      [mainnet.id]: http("https://ethereum-rpc.publicnode.com"),
      [base.id]: http("https://developer-access-mainnet.base.org"),
      [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
    },
    ssr: true,
  })
}
