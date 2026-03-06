"use client"

import { http, createConfig } from "wagmi"
import { mainnet, base, sepolia } from "wagmi/chains"
import { injected } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

// WalletConnect requires full Worker support including .terminate()
// The v0 sandbox exposes Worker but its instances don't have .terminate(), causing crashes
function isWorkerAvailable() {
  try {
    if (typeof window === "undefined") return false
    if (typeof Worker === "undefined") return false
    // Verify terminate exists on the prototype — WalletConnect calls it internally
    if (typeof Worker.prototype.terminate !== "function") return false
    return true
  } catch {
    return false
  }
}

export function getConfig() {
  return createConfig({
    chains: [mainnet, base, sepolia],
    connectors: [
      injected(),
    ],
    transports: {
      [mainnet.id]: http("https://ethereum-rpc.publicnode.com"),
      [base.id]: http("https://developer-access-mainnet.base.org"),
      [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
    },
    ssr: true,
  })
}
