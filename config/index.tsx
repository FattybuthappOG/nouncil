import { http, createConfig } from "wagmi"
import { mainnet } from "wagmi/chains"
import { injected } from "wagmi/connectors"

let walletConnectConnector: any = null

async function getWalletConnectConnector() {
  if (typeof window === "undefined") return null

  if (!walletConnectConnector) {
    try {
      const { walletConnect } = await import("wagmi/connectors")
      walletConnectConnector = walletConnect({
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "6ce41bba38061829592921cc0b22152e",
        metadata: {
          name: "Nouncil",
          description: "Nouns DAO Governance Interface",
          url: "https://nouncil.vercel.app",
          icons: ["https://nouncil.vercel.app/favicon.ico"],
        },
        showQrModal: true,
      })
    } catch (err) {
      console.error("[v0] Failed to load WalletConnect:", err)
      return null
    }
  }

  return walletConnectConnector
}

export function getConfig() {
  // Start with injected connector
  const connectors = [injected()]

  // Try to add WalletConnect if on client
  if (typeof window !== "undefined") {
    // We can't await here, so we'll add it after initial render
    getWalletConnectConnector().then((wc) => {
      if (wc && !connectors.includes(wc)) {
        connectors.push(wc)
      }
    })
  }

  return createConfig({
    chains: [mainnet],
    connectors,
    ssr: true,
    transports: {
      [mainnet.id]: http("https://eth.merkle.io", {
        timeout: 30_000,
        retryCount: 3,
        retryDelay: 1000,
      }),
    },
  })
}
