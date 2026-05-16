"use client"

import { http, createConfig, createStorage, cookieStorage } from "wagmi"
import { mainnet, base, sepolia } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

export function getConfig() {
  // Only create connectors on client side to avoid indexedDB SSR error
  const connectors =
    typeof window !== "undefined"
      ? [
          injected(),
          ...(projectId && projectId.trim()
            ? [
                walletConnect({
                  projectId: projectId.trim(),
                  showQrModal: true,
                  metadata: {
                    name: "Nouncil",
                    description: "Nouns DAO governance",
                    url: window.location.origin,
                    icons: ["https://nouncil.wtf/favicon.ico"],
                  },
                }),
              ]
            : []),
        ]
      : []

  return createConfig({
    chains: [mainnet, base, sepolia],
    connectors,
    transports: {
      [mainnet.id]: http("https://ethereum-rpc.publicnode.com"),
      [base.id]: http("https://developer-access-mainnet.base.org"),
      [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
    },
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
  })
}
