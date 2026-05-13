import { NextResponse } from "next/server"

// EIP-1967 implementation slot
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"

// Common proxy function names
const PROXY_FUNCTIONS = new Set(["admin", "changeAdmin", "implementation", "upgradeTo", "upgradeToAndCall", "proxyAdmin"])

async function getImplementationAddress(proxyAddress: string): Promise<string | null> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://eth.drpc.org"
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getStorageAt",
        params: [proxyAddress, IMPLEMENTATION_SLOT, "latest"],
        id: 1,
      }),
      signal: AbortSignal.timeout(5000),
    })
    const data = await response.json()
    if (data.result && data.result !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      // Extract address from 32-byte storage slot (last 20 bytes)
      return "0x" + data.result.slice(-40)
    }
  } catch (err) {
    console.error("Failed to get implementation address:", err)
  }
  return null
}

async function fetchAbiFromEtherscan(address: string): Promise<any[] | null> {
  const etherscanApiKey = process.env.ETHERSCAN_API_KEY || "YourApiKeyToken"
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getabi&address=${address}&apikey=${etherscanApiKey}`
  
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) return null
  
  const data = await response.json()
  if (data.status !== "1" || !data.result) return null
  
  try {
    return JSON.parse(data.result)
  } catch {
    return null
  }
}

function isProxyAbi(abi: any[]): boolean {
  const functions = abi.filter(item => item.type === "function")
  // If all functions are proxy-related, it's likely a proxy
  if (functions.length <= 6 && functions.every(fn => PROXY_FUNCTIONS.has(fn.name))) {
    return true
  }
  return false
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 })
  }

  try {
    // First, fetch the ABI for the given address
    let abi = await fetchAbiFromEtherscan(address)
    
    if (!abi) {
      return NextResponse.json({ error: "Contract not verified or ABI not found" }, { status: 404 })
    }

    // Check if this is a proxy contract
    if (isProxyAbi(abi)) {
      const implementationAddress = await getImplementationAddress(address)
      if (implementationAddress) {
        const implAbi = await fetchAbiFromEtherscan(implementationAddress)
        if (implAbi && implAbi.length > 0) {
          // Use implementation ABI instead
          abi = implAbi
        }
      }
    }

    return NextResponse.json({ abi })
  } catch (err: any) {
    console.error("Etherscan ABI fetch error:", err?.message)
    return NextResponse.json({ error: "Failed to fetch ABI" }, { status: 500 })
  }
}
