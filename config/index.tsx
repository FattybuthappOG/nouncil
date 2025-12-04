import { http, createConfig, createStorage, cookieStorage } from "wagmi"
import { mainnet } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

export const config = createConfig({
  chains: [mainnet],
  connectors: [
    injected(),
    ...(projectId
      ? [
          walletConnect({
            projectId,
            metadata: {
              name: "Nouncil",
              description: "Nouns DAO Governance Interface",
              url: typeof window !== "undefined" ? window.location.origin : "https://nouncil.wtf",
              icons: ["https://nouns.wtf/favicon.ico"],
            },
            showQrModal: true,
            qrModalOptions: {
              themeMode: "dark",
            },
          }),
        ]
      : []),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [mainnet.id]: http("https://eth.merkle.io", {
      timeout: 30_000,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
})
