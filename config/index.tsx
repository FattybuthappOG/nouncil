import { http, createConfig } from "wagmi"
import { mainnet } from "wagmi/chains"
import { walletConnect } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set")
}

export const config = createConfig({
  chains: [mainnet],
  connectors: [
    walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: "Nouncil",
        description: "Nouns DAO Governance Interface",
        url: "https://nouncil.wtf",
        icons: ["https://nouncil.wtf/images/logo-nouncil.webp"],
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
  },
})
