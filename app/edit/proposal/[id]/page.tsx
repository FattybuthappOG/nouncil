"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAccount, useReadContract } from "wagmi"

const CreateProposal = dynamic(() => import("@/components/create-proposal"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  ),
})

// Nouns Governor contract
const NOUNS_GOVERNOR = "0x6f3E6272A167E8accb32072D08e0957f9C79223d" as const

const NOUNS_GOVERNOR_ABI = [
  {
    name: "proposalsV3",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "proposer", type: "address" },
      { name: "proposalThreshold", type: "uint256" },
      { name: "quorumVotes", type: "uint256" },
      { name: "eta", type: "uint256" },
      { name: "startBlock", type: "uint256" },
      { name: "endBlock", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "againstVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
      { name: "canceled", type: "bool" },
      { name: "vetoed", type: "bool" },
      { name: "executed", type: "bool" },
      { name: "totalSupply", type: "uint256" },
      { name: "creationBlock", type: "uint256" },
      { name: "updatePeriodEndBlock", type: "uint256" },
    ],
  },
  {
    name: "getActions",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "signatures", type: "string[]" },
      { name: "calldatas", type: "bytes[]" },
    ],
  },
] as const

interface ProposalData {
  id: number
  proposer: string
  description: string
  title: string
  targets: string[]
  values: string[]
  signatures: string[]
  calldatas: string[]
  updatePeriodEndBlock: bigint
  canceled: boolean
  executed: boolean
}

export default function EditProposalPage() {
  const params = useParams()
  const router = useRouter()
  const proposalId = Number(params.id)
  const { address } = useAccount()
  
  const [mounted, setMounted] = useState(false)
  const [proposal, setProposal] = useState<ProposalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentBlock, setCurrentBlock] = useState<bigint>(0n)

  // Fetch proposal data from contract
  const { data: proposalV3Data } = useReadContract({
    address: NOUNS_GOVERNOR,
    abi: NOUNS_GOVERNOR_ABI,
    functionName: "proposalsV3",
    args: [BigInt(proposalId)],
  })

  // Fetch proposal actions from contract
  const { data: actionsData } = useReadContract({
    address: NOUNS_GOVERNOR,
    abi: NOUNS_GOVERNOR_ABI,
    functionName: "getActions",
    args: [BigInt(proposalId)],
  })

  useEffect(() => {
    setMounted(true)
    // Get current block number
    fetch("https://eth.llamarpc.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.result) {
          setCurrentBlock(BigInt(data.result))
        }
      })
      .catch(() => {})
  }, [])

  // Fetch proposal description from API
  useEffect(() => {
    if (!mounted || !proposalId) return

    const loadProposalDescription = async () => {
      try {
        const res = await fetch(`/api/nouns/proposals?id=${proposalId}`)
        const data = await res.json()
        if (data) {
          // Extract title from description
          const desc = data.description || ""
          const titleMatch = desc.match(/^#\s*(.+?)(?:\n|$)/)
          const title = titleMatch ? titleMatch[1].trim() : desc.split("\n")[0]
          const description = titleMatch 
            ? desc.replace(/^#\s*.+?\n/, "").trim()
            : desc

          setProposal(prev => prev ? { ...prev, title, description } : null)
        }
      } catch {
        // Non-critical, description may be unavailable
      }
    }

    loadProposalDescription()
  }, [mounted, proposalId])

  // Process contract data
  useEffect(() => {
    if (!proposalV3Data || !actionsData) return

    const [
      id, proposer, , , , , , , , , canceled, , executed, , , updatePeriodEndBlock
    ] = proposalV3Data

    setProposal(prev => ({
      id: Number(id),
      proposer: proposer as string,
      title: prev?.title || `Proposal ${id}`,
      description: prev?.description || "",
      targets: [...actionsData[0]] as string[],
      values: actionsData[1].map(v => v.toString()),
      signatures: [...actionsData[2]] as string[],
      calldatas: [...actionsData[3]] as string[],
      updatePeriodEndBlock,
      canceled,
      executed,
    }))
    setIsLoading(false)
  }, [proposalV3Data, actionsData])

  // Validate edit permissions
  useEffect(() => {
    if (!proposal || !mounted) return

    if (proposal.canceled) {
      setError("This proposal has been canceled and cannot be edited")
      return
    }

    if (proposal.executed) {
      setError("This proposal has been executed and cannot be edited")
      return
    }

    if (currentBlock > 0n && currentBlock >= proposal.updatePeriodEndBlock) {
      setError("The update period for this proposal has ended. It can no longer be edited.")
      return
    }

    if (address && address.toLowerCase() !== proposal.proposer.toLowerCase()) {
      setError("Only the proposer can edit this proposal")
      return
    }

    setError(null)
  }, [proposal, currentBlock, address, mounted])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            className="mb-6 gap-2 text-gray-300 hover:text-white"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="bg-[#252540] border border-[#3a3a5a] rounded-lg p-6">
            <p className="text-red-400">{error}</p>
            {currentBlock > 0n && proposal && (
              <p className="text-gray-400 text-sm mt-2">
                Current block: {currentBlock.toString()} / Update period ends at block: {proposal.updatePeriodEndBlock.toString()}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!proposal) {
    return null
  }

  return (
    <CreateProposal
      editMode="proposal"
      proposalId={proposal.id}
      initialData={{
        title: proposal.title,
        description: proposal.description,
        targets: proposal.targets,
        values: proposal.values,
        signatures: proposal.signatures,
        calldatas: proposal.calldatas,
      }}
    />
  )
}
