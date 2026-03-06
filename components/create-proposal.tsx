"use client"

import { useState, useCallback, useRef } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import { parseEther, parseUnits, encodeFunctionData, parseAbi, isAddress } from "viem"
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Link2, Image, Minus, Eye, Edit3, Plus, Trash2, ArrowLeft,
  Send, ChevronDown, ChevronUp, Coins, Banknote, Code2, AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TiptapLink from "@tiptap/extension-link"
import TiptapImage from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"

// NounsDAOData proxy contract — clientId 22 for Nouncil rewards
const NOUNS_DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365" as const
const CLIENT_ID = 22

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

// Nouns token contract for balance/voting power checks
const NOUNS_TOKEN = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" as const
const NOUNS_TOKEN_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getCurrentVotes",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint96" }],
  },
] as const

// Known token contracts
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as const
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const

type ActionType = "eth" | "weth" | "usdc" | "custom"

interface Action {
  type: ActionType
  // ETH / WETH / USDC send
  recipient?: string
  amount?: string
  // Custom call
  target?: string
  value?: string
  abi?: string
  functionName?: string
  args?: string
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

function resolveAction(action: Action): { target: `0x${string}`; value: bigint; signature: string; calldata: `0x${string}` } {
  if (action.type === "eth") {
    return {
      target: (action.recipient || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      value: parseEther(action.amount || "0"),
      signature: "",
      calldata: "0x",
    }
  }
  if (action.type === "weth" || action.type === "usdc") {
    const tokenAddress = action.type === "weth" ? WETH : USDC
    const decimals = action.type === "usdc" ? 6 : 18
    const transferAbi = parseAbi(["function transfer(address to, uint256 amount)"])
    const data = encodeFunctionData({
      abi: transferAbi,
      functionName: "transfer",
      args: [(action.recipient || "0x0000000000000000000000000000000000000000") as `0x${string}`, parseUnits(action.amount || "0", decimals)],
    })
    return { target: tokenAddress, value: 0n, signature: "transfer(address,uint256)", calldata: data }
  }
  // custom
  return {
    target: (action.target || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    value: parseEther(action.value || "0"),
    signature: action.functionName || "",
    calldata: (action.args || "0x") as `0x${string}`,
  }
}

// --- Toolbar button ---
function ToolbarBtn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={`p-1.5 rounded transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
    >
      {children}
    </button>
  )
}

// --- Rich text editor ---
function RichEditor({ onChange }: { onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false }),
      TiptapImage,
      Placeholder.configure({ placeholder: "Describe your proposal — motivation, specification, benefits..." }),
    ],
    editorProps: {
      attributes: {
        class: "min-h-[320px] px-4 py-3 text-sm leading-relaxed text-foreground focus:outline-none prose prose-sm max-w-none dark:prose-invert",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  const addLink = useCallback(() => {
    const url = window.prompt("URL")
    if (!url || !editor) return
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(() => {
    const url = window.prompt("Image URL")
    if (!url || !editor) return
    editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
          <Quote className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">
          <Code2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn active={editor.isActive("link")} onClick={addLink} title="Add link">
          <Link2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={false} onClick={addImage} title="Add image">
          <Image className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          <Minus className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

// --- Action type label ---
const ACTION_LABELS: Record<ActionType, { label: string; icon: React.ReactNode }> = {
  eth:    { label: "Send ETH",  icon: <Coins className="w-3.5 h-3.5" /> },
  weth:   { label: "Send WETH", icon: <Banknote className="w-3.5 h-3.5" /> },
  usdc:   { label: "Send USDC", icon: <Banknote className="w-3.5 h-3.5" /> },
  custom: { label: "Custom Call", icon: <Code2 className="w-3.5 h-3.5" /> },
}

// --- Action form ---
function ActionForm({ action, index, onChange, onRemove }: {
  action: Action; index: number
  onChange: (i: number, a: Action) => void
  onRemove: (i: number) => void
}) {
  const set = (patch: Partial<Action>) => onChange(index, { ...action, ...patch })

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Action header with type selector */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">Action {index + 1}</span>
        <div className="flex-1 flex items-center gap-1">
          {(["eth", "weth", "usdc", "custom"] as ActionType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => set({ type: t })}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                action.type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {ACTION_LABELS[t].icon}
              <span className="hidden sm:inline">{ACTION_LABELS[t].label}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => onRemove(index)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action body */}
      <div className="p-3 flex flex-col gap-2">
        {(action.type === "eth" || action.type === "weth" || action.type === "usdc") && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Recipient Address or ENS</label>
              <input
                type="text"
                value={action.recipient || ""}
                onChange={e => set({ recipient: e.target.value })}
                placeholder="0x... or vitalik.eth"
                className="px-2.5 py-1.5 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              {action.recipient && !isAddress(action.recipient) && !action.recipient.endsWith(".eth") && (
                <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />Enter a valid address or ENS name</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Amount ({action.type.toUpperCase()})</label>
              <input
                type="text"
                value={action.amount || ""}
                onChange={e => set({ amount: e.target.value })}
                placeholder={action.type === "usdc" ? "1000" : "1.5"}
                className="px-2.5 py-1.5 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </>
        )}

        {action.type === "custom" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Target Contract</label>
                <input
                  type="text"
                  value={action.target || ""}
                  onChange={e => set({ target: e.target.value })}
                  placeholder="0x..."
                  className="px-2.5 py-1.5 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">ETH Value (optional)</label>
                <input
                  type="text"
                  value={action.value || ""}
                  onChange={e => set({ value: e.target.value })}
                  placeholder="0"
                  className="px-2.5 py-1.5 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Function Signature</label>
              <input
                type="text"
                value={action.functionName || ""}
                onChange={e => set({ functionName: e.target.value })}
                placeholder="transfer(address,uint256)"
                className="px-2.5 py-1.5 rounded-md border border-border bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Calldata (hex)</label>
              <input
                type="text"
                value={action.args || ""}
                onChange={e => set({ args: e.target.value })}
                placeholder="0x..."
                className="px-2.5 py-1.5 rounded-md border border-border bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// --- Main component ---
export default function CreateProposal() {
  const { address, isConnected } = useAccount()
  const [title, setTitle] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [actions, setActions] = useState<Action[]>([])
  const [proposalType, setProposalType] = useState<"candidate" | "onchain">("candidate")
  const [showActions, setShowActions] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash })

  // Check Noun balance and voting power (delegations)
  const { data: nounBalance } = useReadContract({
    address: NOUNS_TOKEN,
    abi: NOUNS_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const { data: votingPower } = useReadContract({
    address: NOUNS_TOKEN,
    abi: NOUNS_TOKEN_ABI,
    functionName: "getCurrentVotes",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const nounsOwned = nounBalance ? Number(nounBalance) : 0
  const delegatedVotes = votingPower ? Number(votingPower) : 0
  // Fee is waived if user holds at least 1 Noun or has at least 1 delegated vote
  const hasFeeWaiver = nounsOwned >= 1 || delegatedVotes >= 1
  const candidateFee = hasFeeWaiver ? 0n : parseEther("0.01")

  const addAction = (type: ActionType = "eth") => {
    setActions(prev => [...prev, { type, recipient: "", amount: "" }])
    setShowActions(true)
  }

  const removeAction = (i: number) => setActions(prev => prev.filter((_, idx) => idx !== i))
  const updateAction = (i: number, a: Action) => setActions(prev => prev.map((x, idx) => idx === i ? a : x))

  const handleSubmit = useCallback(async () => {
    if (!isConnected) return
    if (!title.trim()) { setTxError("Title is required."); return }
    setTxError(null)

    let resolved
    try {
      resolved = actions.map(resolveAction)
    } catch (e: any) {
      setTxError("Error encoding actions: " + e.message)
      return
    }

    const targets = resolved.length > 0 ? resolved.map(r => r.target) : ["0x0000000000000000000000000000000000000000" as `0x${string}`]
    const values  = resolved.length > 0 ? resolved.map(r => r.value)  : [0n]
    const sigs    = resolved.length > 0 ? resolved.map(r => r.signature) : [""]
    const datas   = resolved.length > 0 ? resolved.map(r => r.calldata)  : ["0x" as `0x${string}`]
    const fullDescription = `# ${title}\n\n${bodyHtml}`
    const slug = slugify(title)

    try {
      if (proposalType === "candidate") {
        writeContract({
          address: NOUNS_DAO_DATA,
          abi: NOUNS_DAO_DATA_ABI,
          functionName: "createProposalCandidate",
          args: [targets, values, sigs, datas, fullDescription, slug, BigInt(CLIENT_ID)],
          value: candidateFee,
        })
      } else {
        writeContract({
          address: NOUNS_GOVERNOR,
          abi: NOUNS_GOVERNOR_ABI,
          functionName: "propose",
          args: [targets, values, sigs, datas, fullDescription],
        })
      }
    } catch (err: any) {
      setTxError(err?.message || "Transaction failed")
    }
  }, [isConnected, title, bodyHtml, actions, proposalType, writeContract])

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Back</span>
            </Link>
            <div className="w-px h-4 bg-border shrink-0" />
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Proposal title..."
              className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
        {title && (
          <p className="text-xs text-muted-foreground -mt-2">
            Slug: <code className="bg-muted px-1 rounded">{slugify(title)}</code>
          </p>
        )}

        {/* Rich-text editor */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Description</label>
            <button
              type="button"
              onClick={() => setShowPreview(p => !p)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border transition-colors ${
                showPreview ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:text-foreground bg-card"
              }`}
            >
              {showPreview ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showPreview ? "Edit" : "Preview"}
            </button>
          </div>

          {showPreview ? (
            <div
              className="border border-border rounded-lg bg-card px-4 py-3 min-h-[320px] text-sm text-foreground prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: bodyHtml || "<p class='text-muted-foreground italic'>Nothing to preview.</p>" }}
            />
          ) : (
            <RichEditor onChange={setBodyHtml} />
          )}
        </div>

        {/* Transaction Actions */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowActions(s => !s)}
            className="flex items-center justify-between w-full text-sm font-medium text-foreground py-2 border-b border-border"
          >
            <span>
              Transaction Actions
              <span className="text-xs text-muted-foreground font-normal ml-2">
                {actions.length === 0 ? "optional — leave empty for a signaling proposal" : `${actions.length} action${actions.length > 1 ? "s" : ""}`}
              </span>
            </span>
            {showActions ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showActions && (
            <div className="flex flex-col gap-3">
              {actions.map((action, i) => (
                <ActionForm key={i} action={action} index={i} onChange={updateAction} onRemove={removeAction} />
              ))}

              {/* Add action buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["eth", "weth", "usdc", "custom"] as ActionType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addAction(t)}
                    className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <Plus className="w-3 h-3" />
                    {ACTION_LABELS[t].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!showActions && (
            <button
              type="button"
              onClick={() => setShowActions(true)}
              className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg px-3 py-2 transition-colors hover:border-primary/40 w-full"
            >
              <Plus className="w-3 h-3" />
              Add transaction actions
            </button>
          )}
        </div>

        {/* Error */}
        {(txError || writeError) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {txError || writeError?.message || "Transaction failed"}
          </div>
        )}

        {/* Success */}
        {isConfirmed && txHash && (
          <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-xs text-green-600 dark:text-green-400">
            Proposal submitted successfully!{" "}
            <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
              View on Etherscan
            </a>
          </div>
        )}

        {/* Submit row */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {isConnected
                ? <span>Connected: <code className="bg-muted px-1 rounded">{address?.slice(0, 6)}...{address?.slice(-4)}</code></span>
                : <span className="text-destructive">Connect wallet to submit</span>
              }
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* If user holds 1+ Nouns, show both options side by side at submit time */}
              {isConnected && nounsOwned >= 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setProposalType("candidate"); handleSubmit() }}
                    disabled={isPending || isConfirming || !title.trim()}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border transition-all ${
                      !title.trim()
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : isPending || isConfirming
                        ? "bg-muted text-muted-foreground cursor-wait"
                        : "bg-card text-foreground hover:bg-muted active:scale-95"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit as Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => { setProposalType("onchain"); handleSubmit() }}
                    disabled={isPending || isConfirming || !title.trim()}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      !title.trim()
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : isPending || isConfirming
                        ? "bg-primary/70 text-primary-foreground cursor-wait"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit On-Chain
                  </button>
                </>
              ) : (
                /* No Nouns — single candidate submit button, fee shown if no waiver */
                <button
                  type="button"
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
                  {isPending
                    ? "Confirm in wallet..."
                    : isConfirming
                    ? "Confirming..."
                    : hasFeeWaiver
                    ? "Submit Candidate"
                    : "Submit Candidate (0.01 ETH)"
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
