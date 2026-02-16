import { NextResponse } from "next/server"

const NOUNS_GOVERNOR = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d"

// RPC endpoints - ordered by reliability. Use env var if available.
const RPC_URLS = [
  process.env.ETH_RPC_URL,
  "https://ethereum-rpc.publicnode.com",
  "https://cloudflare-eth.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
].filter(Boolean) as string[]

const PROPOSAL_STATES = [
  "Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed", "Vetoed",
]

// In-memory cache to avoid repeated RPC calls
const cache: { proposals?: { data: any; timestamp: number }; single: Record<string, { data: any; timestamp: number }> } = { single: {} }
const CACHE_TTL_LIST = 60_000 // 1 minute for list
const CACHE_TTL_SINGLE = 120_000 // 2 minutes for single proposal

// Batch JSON-RPC: send multiple calls in a SINGLE HTTP request
// Falls back to sequential calls if batch is not supported
async function batchRpcCall(calls: { method: string; params: any[] }[]): Promise<any[]> {
  const batch = calls.map((c, i) => ({
    jsonrpc: "2.0",
    method: c.method,
    params: c.params,
    id: i + 1,
  }))

  // Try batch first
  for (const url of RPC_URLS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) continue
      const results = await res.json()
      if (!Array.isArray(results)) continue
      results.sort((a: any, b: any) => a.id - b.id)
      const successes = results.filter((r: any) => !r.error && r.result)
      if (successes.length >= calls.length * 0.5) {
        return results.map((r: any) => r.result || null)
      }
    } catch {
      continue
    }
  }

  // Fallback: sequential calls with first working RPC
  for (const url of RPC_URLS) {
    try {
      const results: (any | null)[] = []
      let failed = false
      for (const call of calls) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 6000)
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: call.method, params: call.params, id: 1 }),
          signal: controller.signal,
        })
        clearTimeout(timeout)
        if (!res.ok) { failed = true; break }
        const json = await res.json()
        results.push(json.error ? null : json.result)
      }
      if (!failed && results.length === calls.length) return results
    } catch {
      continue
    }
  }

  throw new Error("All RPC endpoints failed for batch call")
}

// Single RPC call
async function rpcCall(method: string, params: any[]): Promise<any> {
  for (const url of RPC_URLS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) continue
      const json = await res.json()
      if (json.error) continue
      return json.result
    } catch {
      continue
    }
  }
  throw new Error("All RPC endpoints failed")
}

function encodeFunctionCall(selector: string, ...args: bigint[]): string {
  let data = selector
  for (const arg of args) {
    data += arg.toString(16).padStart(64, "0")
  }
  return data
}

function decodeSlot(hex: string, slot: number): bigint {
  const start = 2 + slot * 64
  return BigInt("0x" + hex.slice(start, start + 64))
}

function decodeAddress(hex: string, slot: number): string {
  const start = 2 + slot * 64
  return "0x" + hex.slice(start + 24, start + 64)
}

// Fetch proposal list using batch RPC (2 HTTP requests total: 1 for count, 1 batch for all proposal data)
async function fetchProposalList(limit: number, statusFilter: string) {
  // Check cache
  if (cache.proposals && Date.now() - cache.proposals.timestamp < CACHE_TTL_LIST) {
    const cached = cache.proposals.data
    if (statusFilter === "all") {
      return { proposals: cached.proposals.slice(0, limit), totalCount: cached.totalCount }
    }
    const filtered = cached.proposals.filter((p: any) => {
      if (statusFilter === "active") return [0, 1, 5].includes(p.stateNumber)
      if (statusFilter === "executed") return p.stateNumber === 7
      if (statusFilter === "defeated") return p.stateNumber === 3
      if (statusFilter === "vetoed") return p.stateNumber === 8
      if (statusFilter === "canceled") return p.stateNumber === 2
      return true
    })
    return { proposals: filtered.slice(0, limit), totalCount: filtered.length }
  }

  // Step 1: Get proposal count (single call)
  const PROPOSAL_COUNT_SEL = "0xda35c664"
  const countResult = await rpcCall("eth_call", [
    { to: NOUNS_GOVERNOR, data: PROPOSAL_COUNT_SEL },
    "latest",
  ])
  const totalCount = Number(BigInt(countResult))
  if (totalCount === 0) return { proposals: [], totalCount: 0 }

  // Step 2: Batch fetch proposals + states (2 calls per proposal, all in ONE HTTP request)
  // Fetch the most recent proposals (up to 25 to have enough after filtering)
  const fetchCount = Math.min(totalCount, 25)
  const ids: number[] = []
  for (let i = totalCount; i >= 1 && ids.length < fetchCount; i--) {
    ids.push(i)
  }

  const PROPOSALS_SEL = "0x013cf08b"
  const STATE_SEL = "0x3e4f49e6"

  const batchCalls = ids.flatMap(id => [
    { method: "eth_call", params: [{ to: NOUNS_GOVERNOR, data: encodeFunctionCall(PROPOSALS_SEL, BigInt(id)) }, "latest"] },
    { method: "eth_call", params: [{ to: NOUNS_GOVERNOR, data: encodeFunctionCall(STATE_SEL, BigInt(id)) }, "latest"] },
  ])

  const results = await batchRpcCall(batchCalls)

  const proposals = ids.map((id, idx) => {
    const propResult = results[idx * 2]
    const stateResult = results[idx * 2 + 1]

    if (!propResult || !stateResult) {
      return {
        id,
        description: `Proposal ${id}`,
        proposer: "0x0",
        forVotes: "0",
        againstVotes: "0",
        abstainVotes: "0",
        quorumVotes: "0",
        status: "UNKNOWN",
        stateNumber: 1,
        startBlock: "0",
        endBlock: "0",
      }
    }

    const proposer = decodeAddress(propResult, 1)
    const startBlock = decodeSlot(propResult, 5)
    const endBlock = decodeSlot(propResult, 6)
    const forVotes = decodeSlot(propResult, 7)
    const againstVotes = decodeSlot(propResult, 8)
    const abstainVotes = decodeSlot(propResult, 9)
    const stateNumber = Number(BigInt(stateResult))
    const stateName = PROPOSAL_STATES[stateNumber] || "Unknown"

    return {
      id,
      description: `Proposal ${id}`,
      proposer,
      forVotes: forVotes.toString(),
      againstVotes: againstVotes.toString(),
      abstainVotes: abstainVotes.toString(),
      quorumVotes: "0",
      status: stateName.toUpperCase(),
      stateNumber,
      startBlock: startBlock.toString(),
      endBlock: endBlock.toString(),
    }
  })

  // Cache all proposals
  cache.proposals = { data: { proposals, totalCount }, timestamp: Date.now() }

  // Filter if needed
  if (statusFilter !== "all") {
    const filtered = proposals.filter((p: any) => {
      if (statusFilter === "active") return [0, 1, 5].includes(p.stateNumber)
      if (statusFilter === "executed") return p.stateNumber === 7
      if (statusFilter === "defeated") return p.stateNumber === 3
      if (statusFilter === "vetoed") return p.stateNumber === 8
      if (statusFilter === "canceled") return p.stateNumber === 2
      return true
    })
    return { proposals: filtered.slice(0, limit), totalCount: filtered.length }
  }

  return { proposals: proposals.slice(0, limit), totalCount }
}

// Fetch a single proposal (3 RPC calls max, with event log for description)
async function fetchSingleProposal(id: number) {
  // Check cache
  const cacheKey = String(id)
  if (cache.single[cacheKey] && Date.now() - cache.single[cacheKey].timestamp < CACHE_TTL_SINGLE) {
    return cache.single[cacheKey].data
  }

  const PROPOSALS_SEL = "0x013cf08b"
  const STATE_SEL = "0x3e4f49e6"

  // Batch: proposal data + state in ONE request
  const results = await batchRpcCall([
    { method: "eth_call", params: [{ to: NOUNS_GOVERNOR, data: encodeFunctionCall(PROPOSALS_SEL, BigInt(id)) }, "latest"] },
    { method: "eth_call", params: [{ to: NOUNS_GOVERNOR, data: encodeFunctionCall(STATE_SEL, BigInt(id)) }, "latest"] },
  ])

  const proposalResult = results[0]
  const stateResult = results[1]

  if (!proposalResult || !stateResult) {
    throw new Error("Failed to read proposal from contract")
  }

  const proposer = decodeAddress(proposalResult, 1)
  const startBlock = decodeSlot(proposalResult, 5)
  const endBlock = decodeSlot(proposalResult, 6)
  const forVotes = decodeSlot(proposalResult, 7)
  const againstVotes = decodeSlot(proposalResult, 8)
  const abstainVotes = decodeSlot(proposalResult, 9)
  const creationBlock = decodeSlot(proposalResult, 14)
  const stateNumber = Number(BigInt(stateResult))

  // Try to get description from ProposalCreated event log (1 additional RPC call)
  let description = `# Proposal ${id}\n\nNouns DAO Proposal ${id}`
  try {
    const eventTopic = "0x7d84a6263ae0d98d3329bd7b46bb4e8d6f98cd35a7adb45c274c8b7fd5ebd5e0"
    const blockHex = "0x" + creationBlock.toString(16)
    const logs = await rpcCall("eth_getLogs", [{
      address: NOUNS_GOVERNOR,
      topics: [eventTopic],
      fromBlock: blockHex,
      toBlock: blockHex,
    }])
    if (logs?.length > 0) {
      for (const log of logs) {
        const data = log.data as string
        if (!data || data.length < 66) continue
        const logId = Number(BigInt("0x" + data.slice(2, 66)))
        if (logId !== id) continue
        try {
          const descOffset = Number(BigInt("0x" + data.slice(2 + 8 * 64, 2 + 9 * 64)))
          const descLenStart = 2 + descOffset * 2
          const descLen = Number(BigInt("0x" + data.slice(descLenStart, descLenStart + 64)))
          const descHex = data.slice(descLenStart + 64, descLenStart + 64 + descLen * 2)
          const bytes = new Uint8Array(descLen)
          for (let i = 0; i < descLen; i++) {
            bytes[i] = parseInt(descHex.slice(i * 2, i * 2 + 2), 16)
          }
          const decoded = new TextDecoder().decode(bytes)
          if (decoded.length > 0) description = decoded
        } catch { /* skip */ }
      }
    }
  } catch { /* description stays as fallback */ }

  const result = {
    id,
    proposer,
    signers: [],
    description,
    forVotes: forVotes.toString(),
    againstVotes: againstVotes.toString(),
    abstainVotes: abstainVotes.toString(),
    quorumVotes: "0",
    status: (PROPOSAL_STATES[stateNumber] || "Unknown").toUpperCase(),
    stateNumber,
    startBlock: startBlock.toString(),
    endBlock: endBlock.toString(),
    creationBlock: creationBlock.toString(),
    createdTransactionHash: "",
  }

  // Cache it
  cache.single[cacheKey] = { data: result, timestamp: Date.now() }

  return result
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proposalId = searchParams.get("id")
  const limit = parseInt(searchParams.get("limit") || "20")
  const statusFilter = searchParams.get("status") || "all"

  try {
    if (proposalId) {
      const result = await fetchSingleProposal(parseInt(proposalId))
      return NextResponse.json(result)
    } else {
      const result = await fetchProposalList(limit, statusFilter)
      return NextResponse.json(result)
    }
  } catch (error: any) {
    console.error("Error fetching Nouns proposals:", error?.message || error)
    return NextResponse.json(
      { error: "Failed to fetch proposals", details: error?.message },
      { status: 500 },
    )
  }
}
