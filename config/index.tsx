import { http, createConfig } from "wagmi"
import { mainnet } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"

const connectors = [
  injected(),
  walletConnect({
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "6ce41bba38061829592921cc0b22152e",
    metadata: {
      name: "Nouncil",
      description: "Nouns DAO Governance Interface",
      url: "https://nouncil.vercel.app",
      icons: ["https://nouncil.vercel.app/favicon.ico"],
    },
    showQrModal: true,
  }),
]

export function getConfig() {
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
