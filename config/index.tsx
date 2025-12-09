import { createConfig, http, cookieStorage, createStorage } from "wagmi"
import { mainnet } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  console.warn("[v0] WalletConnect Project ID not found - WalletConnect will not be available")
}

const metadata = {
  name: "Nouncil",
  description: "Nouncil DAO Governance Dashboard",
  url: "https://nouncil.vercel.app",
  icons: ["https://nouncil.vercel.app/apple-icon"],
}

export const config = createConfig({
  chains: [mainnet],
  connectors: projectId
    ? [
        injected(),
        walletConnect({
          projectId,
          metadata,
          showQrModal: true,
        }),
      ]
    : [injected()],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    [mainnet.id]: http(),
  },
})
