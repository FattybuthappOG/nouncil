"use client"

import { http, createConfig, createStorage, cookieStorage } from "wagmi"
import { mainnet, base, sepolia } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

export function getConfig() {
  return createConfig({
    chains: [mainnet, base, sepolia],
    connectors: [
      injected(),
      ...(projectId && projectId.trim()
        ? [
            walletConnect({
              projectId: projectId.trim(),
              showQrModal: true,
              metadata: {
                name: "Nouncil",
                description: "Nouns DAO governance",
                url: typeof window !== "undefined" ? window.location.origin : "https://nouncil.wtf",
                icons: ["https://nouncil.wtf/favicon.ico"],
              },
            }),
          ]
        : []),
    ],
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
