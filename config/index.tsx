"use client"

import { http, createConfig, cookieStorage, createStorage } from "wagmi"
import { mainnet } from "wagmi/chains"
import { walletConnect, injected } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

export function getConfig() {
  return createConfig({
    chains: [mainnet],
    connectors: [
      ...(typeof window !== "undefined" && projectId
        ? [
            walletConnect({
              projectId,
              showQrModal: true,
            }),
          ]
        : []),
      injected(),
    ],
    transports: {
      [mainnet.id]: http("https://eth.merkle.io"),
    },
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
  })
}
