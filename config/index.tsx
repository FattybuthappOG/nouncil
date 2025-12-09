import { http, createConfig } from "wagmi"
import { mainnet } from "wagmi/chains"
import { injected } from "wagmi/connectors"

export function getConfig() {
  const connectors = [injected()]

  if (typeof window !== "undefined") {
    // Import walletConnect dynamically to avoid SSR issues
    import("wagmi/connectors")
      .then(({ walletConnect }) => {
        const wcConnector = walletConnect({
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "6ce41bba38061829592921cc0b22152e",
          metadata: {
            name: "Nouncil",
            description: "Nouns DAO Governance Interface",
            url: "https://nouncil.vercel.app",
            icons: ["https://nouncil.vercel.app/favicon.ico"],
          },
          showQrModal: true,
        })
        connectors.push(wcConnector)
      })
      .catch((err) => {
        console.error("[v0] Failed to load WalletConnect:", err)
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
