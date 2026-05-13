import { NextResponse } from "next/server"

// EIP-1967 implementation storage slot
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"

// Free RPC endpoints for reading storage
const RPC_URLS = [
  "https://eth.drpc.org",
  "https://cloudflare-eth.com",
  "https://eth.llamarpc.com",
  "https://ethereum-rpc.publicnode.com",
]

// Common proxy admin function names - if ALL functions match these, it's likely a proxy
const PROXY_ADMIN_FUNCTIONS = new Set([
  "admin",
  "changeAdmin", 
  "implementation",
  "upgradeTo",
  "upgradeToAndCall",
  "proxyAdmin",
  "setProxyAdmin",
])

async function getImplementationAddress(proxyAddress: string): Promise<string | null> {
  for (const rpcUrl of RPC_URLS) {
    try {
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
        const implAddress = "0x" + data.result.slice(-40)
        // Validate it's a proper address (not zero)
        if (implAddress !== "0x0000000000000000000000000000000000000000") {
          return implAddress
        }
      }
    } catch (err) {
      // Try next RPC
      continue
    }
  }
  return null
}

async function fetchAbiFromEtherscan(address: string): Promise<any[] | null> {
  const etherscanApiKey = process.env.ETHERSCAN_API_KEY || "YourApiKeyToken"
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getabi&address=${address}&apikey=${etherscanApiKey}`
  
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) return null
    
    const data = await response.json()
    if (data.status !== "1" || !data.result) return null
    
    return JSON.parse(data.result)
  } catch {
    return null
  }
}

function isLikelyProxyContract(abi: any[]): boolean {
  const functions = abi.filter(item => item.type === "function")
  // If there are very few functions and most/all are proxy-related, it's likely a proxy
  if (functions.length === 0) return false
  if (functions.length > 10) return false // Real contracts usually have more functions
  
  const proxyFunctionCount = functions.filter(fn => PROXY_ADMIN_FUNCTIONS.has(fn.name)).length
  // If most functions are proxy admin functions, it's a proxy
  return proxyFunctionCount >= functions.length * 0.6
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

    // Check if this looks like a proxy contract
    if (isLikelyProxyContract(abi)) {
      // Try to get the implementation address from EIP-1967 slot
      const implementationAddress = await getImplementationAddress(address)
      
      if (implementationAddress) {
        // Fetch the implementation contract's ABI
        const implAbi = await fetchAbiFromEtherscan(implementationAddress)
        
        if (implAbi && implAbi.length > 0) {
          // Return implementation ABI (the actual functions users want to call)
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
