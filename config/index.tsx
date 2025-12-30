"use client"

import { http, createConfig, cookieStorage, createStorage } from "wagmi"
import { mainnet } from "wagmi/chains"
import { walletConnect, injected } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || ""

export function getConfig() {
  const rpcUrl = alchemyApiKey ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}` : "https://eth.publicnode.com"

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
      [mainnet.id]: http(rpcUrl),
    },
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
  })
}

// The config should only be created inside components via getConfig()
