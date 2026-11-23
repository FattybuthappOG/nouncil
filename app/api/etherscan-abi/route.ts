import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 })
  }

  try {
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY || "YourApiKeyToken"
    const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${etherscanApiKey}`

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) {
      return NextResponse.json({ error: "Etherscan API error" }, { status: 500 })
    }

    const data = await response.json()

    if (data.status !== "1" || !data.result) {
      return NextResponse.json({ error: data.result || "Contract not verified" }, { status: 404 })
    }

    try {
      const abi = JSON.parse(data.result)
      return NextResponse.json({ abi })
    } catch {
      return NextResponse.json({ error: "Invalid ABI format" }, { status: 500 })
    }
  } catch (err: any) {
    console.error("[v0] Etherscan ABI fetch error:", err?.message)
    return NextResponse.json({ error: "Failed to fetch ABI" }, { status: 500 })
  }
}
