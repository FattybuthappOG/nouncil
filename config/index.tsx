"use client"

import { http, createConfig } from "wagmi"
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
              qrModalOptions: {
                themeMode: "dark",
                enableExplorer: true,
                explorerRecommendedWalletIds: [
                  "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa", // Coinbase
                  "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369", // Rainbow
                  "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
                  "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0", // Trust
                ],
              },
            }),
          ]
        : []),
      injected(),
    ],
    transports: {
      [mainnet.id]: http("https://ethereum-rpc.publicnode.com"),
    },
    ssr: true,
  })
}
