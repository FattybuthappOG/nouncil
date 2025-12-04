import { http, createConfig, createStorage, cookieStorage } from "wagmi"
import { mainnet } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

export const config = createConfig({
  chains: [mainnet],
  connectors: [injected(), ...(projectId ? [walletConnect({ projectId })] : [])],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [mainnet.id]: http("https://eth.merkle.io"),
  },
})
