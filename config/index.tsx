import { http, createConfig, cookieStorage, createStorage } from "wagmi"
import { mainnet } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

export const metadata = {
  name: "Nouncil",
  description: "Nouncil Governance Dashboard",
  url: "https://nouncil.wtf",
  icons: ["https://nouncil.wtf/logo.webp"],
}

export const config = createConfig({
  chains: [mainnet],
  connectors: [injected(), ...(projectId ? [walletConnect({ projectId, metadata, showQrModal: true })] : [])],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [mainnet.id]: http("https://eth.public-rpc.com"),
  },
})
