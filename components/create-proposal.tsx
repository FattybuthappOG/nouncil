"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseEther } from "viem"
import { Eye, Edit3, Plus, Trash2, ArrowLeft, Send, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"

// NounsDAOData proxy contract
const NOUNS_DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365" as const

// clientId = 22 — registered for Nouncil rewards
const CLIENT_ID = 22

// ABI for createProposalCandidate
const NOUNS_DAO_DATA_ABI = [
  {
    name: "createProposalCandidate",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "signatures", type: "string[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" },
      { name: "slug", type: "string" },
      { name: "proposalIdToUpdate", type: "uint256" },
    ],
    outputs: [],
  },
] as const

// createProposal ABI for on-chain proposals (NounsDAOV3 Governor)
const NOUNS_GOVERNOR = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223E" as const
const NOUNS_GOVERNOR_ABI = [
  {
    name: "propose",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "signatures", type: "string[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

interface TransactionAction {
  target: string
  value: string
  signature: string
  calldata: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 64)
}

function MarkdownPreview({ content }: { content: string }) {
  // Simple markdown renderer
  const rendered = content
    .split("\n")
    .map((line, i) => {
      if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-bold mb-3 mt-4">{line.slice(2)}</h1>
      if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-semibold mb-2 mt-3">{line.slice(3)}</h2>
      if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-semibold mb-2 mt-3">{line.slice(4)}</h3>
      if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} className="ml-4 mb-1 list-disc">{line.slice(2)}</li>
      if (line.startsWith("> ")) return <blockquote key={i} className="border-l-4 border-primary pl-4 italic text-muted-foreground my-2">{line.slice(2)}</blockquote>
      if (line === "") return <br key={i} />
      // Bold **text**
      const boldLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic *text*
      const italicLine = boldLine.replace(/\*(.*?)\*/g, "<em>$1</em>")
      return <p key={i} className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: italicLine }} />
    })
  return <div className="prose prose-sm max-w-none text-foreground">{rendered}</div>
}

export default function CreateProposal() {
  const router = useRouter()
  const { address, isConnected } = useAccount()

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("## Summary\n\nDescribe your proposal here.\n\n## Motivation\n\nWhy is this proposal needed?\n\n## Specification\n\nDetailed technical specification.\n\n## Benefits\n\nExpected outcomes and benefits for Nouns DAO.")
  const [actions, setActions] = useState<TransactionAction[]>([])
  const [tab, setTab] = useState<"write" | "preview">("write")
  const [proposalType, setProposalType] = useState<"candidate" | "onchain">("candidate")
  const [showActions, setShowActions] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  // Wagmi write
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash })

  const addAction = () => {
    setActions([...actions, { target: "", value: "0", signature: "", calldata: "0x" }])
  }

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  const updateAction = (index: number, field: keyof TransactionAction, value: string) => {
    const updated = [...actions]
    updated[index] = { ...updated[index], [field]: value }
    setActions(updated)
  }

  const handleSubmit = useCallback(async () => {
    if (!isConnected) return
    if (!title.trim() || !description.trim()) {
      setTxError("Title and description are required.")
      return
    }
    setTxError(null)

    const targets = actions.length > 0 ? actions.map(a => a.target as `0x${string}`) : ["0x0000000000000000000000000000000000000000" as `0x${string}`]
    const values = actions.length > 0 ? actions.map(a => BigInt(parseEther(a.value || "0"))) : [BigInt(0)]
    const signatures = actions.length > 0 ? actions.map(a => a.signature) : [""]
    const calldatas = actions.length > 0 ? actions.map(a => a.calldata as `0x${string}`) : ["0x" as `0x${string}`]
    const fullDescription = `# ${title}\n\n${description}`
    const slug = slugify(title)

    try {
      if (proposalType === "candidate") {
        writeContract({
          address: NOUNS_DAO_DATA,
          abi: NOUNS_DAO_DATA_ABI,
          functionName: "createProposalCandidate",
          args: [targets, values, signatures, calldatas, fullDescription, slug, BigInt(CLIENT_ID)],
          value: parseEther("0.01"), // candidate creation fee
        })
      } else {
        writeContract({
          address: NOUNS_GOVERNOR,
          abi: NOUNS_GOVERNOR_ABI,
          functionName: "propose",
          args: [targets, values, signatures, calldatas, fullDescription],
        })
      }
    } catch (err: any) {
      setTxError(err?.message || "Transaction failed")
    }
  }, [isConnected, title, description, actions, proposalType, writeContract])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </Link>
            <div className="w-px h-4 bg-border" />
            <h1 className="text-sm font-semibold">Create Proposal</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Proposal type toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setProposalType("candidate")}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                  proposalType === "candidate"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Candidate
              </button>
              <button
                onClick={() => setProposalType("onchain")}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                  proposalType === "onchain"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                On-Chain
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Info banner */}
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          {proposalType === "candidate" ? (
            <>
              <strong className="text-foreground">Proposal Candidate</strong> — Submit a draft for community feedback via NounsDAOData contract. Costs{" "}
              <strong className="text-foreground">0.01 ETH</strong>.
            </>
          ) : (
            <>
              <strong className="text-foreground">On-Chain Proposal</strong> — Submit directly to the Nouns Governor. Requires holding at least 1 Noun or a valid sponsor.
            </>
          )}
        </div>

        {/* Title */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Short, descriptive proposal title"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
          {title && (
            <p className="text-xs text-muted-foreground">Slug: <code className="bg-muted px-1 rounded">{slugify(title)}</code></p>
          )}
        </div>

        {/* Description editor */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Description</label>
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              <button
                onClick={() => setTab("write")}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded transition-colors ${
                  tab === "write" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Edit3 className="w-3 h-3" />
                Write
              </button>
              <button
                onClick={() => setTab("preview")}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded transition-colors ${
                  tab === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>
            </div>
          </div>

          {tab === "write" ? (
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={18}
              placeholder="Write your proposal in Markdown..."
              className="w-full px-3 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-y"
            />
          ) : (
            <div className="w-full min-h-[360px] px-4 py-3 rounded-lg border border-border bg-card overflow-auto">
              {description ? (
                <MarkdownPreview content={`# ${title || "Untitled"}\n\n${description}`} />
              ) : (
                <p className="text-muted-foreground text-sm italic">Nothing to preview yet.</p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">Supports Markdown: **bold**, *italic*, ## headings, - lists, {'>'} blockquotes</p>
        </div>

        {/* Transaction Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowActions(!showActions)}
            className="flex items-center justify-between w-full text-sm font-medium text-foreground py-2 border-b border-border"
          >
            <span>Transaction Actions <span className="text-xs text-muted-foreground font-normal ml-1">({actions.length})</span></span>
            {showActions ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showActions && (
            <div className="flex flex-col gap-3 pt-1">
              {actions.length === 0 && (
                <p className="text-xs text-muted-foreground">No actions added. Leave empty for a signaling proposal.</p>
              )}
              {actions.map((action, i) => (
                <div key={i} className="border border-border rounded-lg p-3 flex flex-col gap-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Action {i + 1}</span>
                    <button onClick={() => removeAction(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Target Address</label>
                      <input
                        type="text"
                        value={action.target}
                        onChange={e => updateAction(i, "target", e.target.value)}
                        placeholder="0x..."
                        className="px-2.5 py-1.5 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Value (ETH)</label>
                      <input
                        type="text"
                        value={action.value}
                        onChange={e => updateAction(i, "value", e.target.value)}
                        placeholder="0"
                        className="px-2.5 py-1.5 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Function Signature</label>
                      <input
                        type="text"
                        value={action.signature}
                        onChange={e => updateAction(i, "signature", e.target.value)}
                        placeholder="transfer(address,uint256)"
                        className="px-2.5 py-1.5 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Calldata</label>
                      <input
                        type="text"
                        value={action.calldata}
                        onChange={e => updateAction(i, "calldata", e.target.value)}
                        placeholder="0x..."
                        className="px-2.5 py-1.5 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addAction}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg px-3 py-2.5 transition-colors w-full justify-center"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Transaction Action
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {(txError || writeError) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            {txError || writeError?.message || "Transaction failed"}
          </div>
        )}

        {/* Success */}
        {isConfirmed && txHash && (
          <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-xs text-green-600 dark:text-green-400">
            Proposal submitted successfully!{" "}
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              View on Etherscan
            </a>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {isConnected ? (
              <span>Connected: <code className="bg-muted px-1 rounded">{address?.slice(0, 6)}...{address?.slice(-4)}</code></span>
            ) : (
              <span className="text-destructive">Connect your wallet to submit</span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!isConnected || isPending || isConfirming || !title.trim()}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              !isConnected || !title.trim()
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : isPending || isConfirming
                ? "bg-primary/70 text-primary-foreground cursor-wait"
                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {isPending ? "Confirm in wallet..." : isConfirming ? "Confirming..." : proposalType === "candidate" ? "Submit Candidate (0.01 ETH)" : "Submit On-Chain"}
          </button>
        </div>
      </main>
    </div>
  )
}
