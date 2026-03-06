"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import WalletConnectButton from "./wallet-connect-button"
import { parseEther, parseUnits, encodeFunctionData, encodeAbiParameters, parseAbi, parseAbiItem, isAddress } from "viem"
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Link2, Image, Minus, Eye, Edit3, Plus, Trash2, ArrowLeft,
  Send, ChevronDown, ChevronUp, Coins, Banknote, AlertCircle, CheckCircle2, Wallet,
} from "lucide-react"
import Link from "next/link"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TiptapLink from "@tiptap/extension-link"
import TiptapImage from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"

// NounsDAOData proxy — creates proposal candidates (no clientId param on this contract)
const NOUNS_DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365" as const

// Nouns Governor V3 — propose with clientId 22 for Nouncil rewards
const NOUNS_GOVERNOR = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223E" as const
const CLIENT_ID = 22 // Nouncil client ID — registered for DAO rewards

const NOUNS_DAO_DATA_ABI = [
  {
    name: "createProposalCandidate",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "targets",           type: "address[]" },
      { name: "values",            type: "uint256[]" },
      { name: "signatures",        type: "string[]"  },
      { name: "calldatas",         type: "bytes[]"   },
      { name: "description",       type: "string"    },
      { name: "slug",              type: "string"    },
      { name: "proposalIdToUpdate",type: "uint256"   },  // 0 for new candidates
    ],
    outputs: [],
  },
  {
    name: "createCandidateCost",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

const NOUNS_GOVERNOR_ABI = [
  {
    name: "propose",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "targets",     type: "address[]" },
      { name: "values",      type: "uint256[]" },
      { name: "signatures",  type: "string[]"  },
      { name: "calldatas",   type: "bytes[]"   },
      { name: "description", type: "string"    },
      { name: "clientId",    type: "uint32"    },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "proposalThreshold",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

// Nouns token for balance/voting power checks
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

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as const
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const

type ActionType = "eth" | "usdc" | "custom"

interface AbiInput { name: string; type: string; components?: AbiInput[] }
interface AbiFunction { name: string; type: string; stateMutability: string; inputs: AbiInput[] }

interface Action {
  type: ActionType
  // transfer actions
  recipient?: string
  amount?: string
  // custom call
  target?: string
  ethValue?: string          // only for payable functions
  fetchedAbi?: AbiFunction[] // fetched from Etherscan
  fetchError?: string
  isFetching?: boolean
  selectedFunction?: string  // function name
  argValues?: Record<string, string> // inputName → value
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

// Convert Tiptap HTML to Markdown for on-chain description
function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "_$1_")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "_$1_")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, "![]($1)")
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, c) => c.trim().split("\n").map((l: string) => `> ${l}`).join("\n") + "\n\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<ul[^>]*>|<\/ul>/gi, "\n")
    .replace(/<ol[^>]*>|<\/ol>/gi, "\n")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, "```\n$1\n```\n")
    .replace(/<hr[^>]*>/gi, "\n---\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function coerceArg(value: string, type: string): unknown {
  if (type === "address") return value as `0x${string}`
  if (type === "bool") return value === "true"
  if (type.startsWith("uint") || type.startsWith("int")) return BigInt(value || "0")
  if (type === "bytes" || type.startsWith("bytes")) return value as `0x${string}`
  if (type.endsWith("[]")) {
    try { return JSON.parse(value) } catch { return [] }
  }
  return value
}

function resolveAction(action: Action): { target: `0x${string}`; value: bigint; signature: string; calldata: `0x${string}` } {
  if (action.type === "eth") {
    if (!isAddress(action.recipient || "")) throw new Error("Invalid recipient address for ETH transfer")
    return { target: action.recipient as `0x${string}`, value: parseEther(action.amount || "0"), signature: "", calldata: "0x" }
  }
  if (action.type === "weth" || action.type === "usdc") {
    if (!isAddress(action.recipient || "")) throw new Error(`Invalid recipient address for ${action.type.toUpperCase()} transfer`)
    const tokenAddress = action.type === "weth" ? WETH : USDC
    const decimals = action.type === "usdc" ? 6 : 18
    const transferAbi = parseAbi(["function transfer(address to, uint256 amount) returns (bool)"])
    const data = encodeFunctionData({ abi: transferAbi, functionName: "transfer", args: [action.recipient as `0x${string}`, parseUnits(action.amount || "0", decimals)] })
    return { target: tokenAddress, value: 0n, signature: "", calldata: data }
  }
  // custom: encode from fetched ABI + selected function + arg values
  if (!isAddress(action.target || "")) throw new Error("Invalid target address for custom call")
  const fn = action.fetchedAbi?.find(f => f.name === action.selectedFunction)
  if (!fn) throw new Error("Select a function")
  const argVals = action.argValues || {}
  const encodedArgs = fn.inputs.map(inp => coerceArg(argVals[inp.name] || "", inp.type))
  const calldata = encodeFunctionData({
    abi: [fn] as any,
    functionName: fn.name,
    args: encodedArgs,
  })
  const ethValue = fn.stateMutability === "payable" ? parseEther(action.ethValue || "0") : 0n
  return { target: action.target as `0x${string}`, value: ethValue, signature: "", calldata }
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

// --- Link dialog ---
function LinkDialog({ onConfirm, onClose, initialText }: {
  onConfirm: (text: string, url: string) => void
  onClose: () => void
  initialText: string
}) {
  const [text, setText] = useState(initialText)
  const [url, setUrl]   = useState("")
  const urlRef = useRef<HTMLInputElement>(null)
  useEffect(() => { urlRef.current?.focus() }, [])
  const submit = () => {
    if (!url.trim()) return
    const href = url.startsWith("http") ? url : `https://${url}`
    onConfirm(text, href)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm flex flex-col gap-3" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-foreground">Insert Link</p>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Display text</label>
          <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Click here"
            className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">URL</label>
          <input ref={urlRef} type="url" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit() }} placeholder="https://nouns.wtf"
            className="px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button type="button" onClick={submit} disabled={!url.trim()} className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">Insert</button>
        </div>
      </div>
    </div>
  )
}

// --- Rich text editor ---
function RichEditor({ onChange }: { onChange: (html: string) => void }) {
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; selectedText: string }>({ open: false, selectedText: "" })

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: true, autolink: true, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      TiptapImage,
      Placeholder.configure({ placeholder: "Describe your proposal — motivation, specification, benefits..." }),
    ],
    editorProps: {
      attributes: { class: "min-h-[320px] px-4 py-3 text-sm leading-relaxed text-foreground focus:outline-none prose prose-sm max-w-none dark:prose-invert" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  const openLinkDialog = useCallback(() => {
    if (!editor) return
    const selected = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, "")
    setLinkDialog({ open: true, selectedText: selected })
  }, [editor])

  const handleLinkConfirm = useCallback((text: string, url: string) => {
    if (!editor) return
    setLinkDialog({ open: false, selectedText: "" })
    const { from, to } = editor.state.selection
    if (from !== to) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
    } else {
      editor.chain().focus().insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text || url}</a>`).run()
    }
  }, [editor])

  const addImage = useCallback(() => {
    const url = window.prompt("Image URL")
    if (!url || !editor) return
    editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <>
      {linkDialog.open && <LinkDialog initialText={linkDialog.selectedText} onConfirm={handleLinkConfirm} onClose={() => setLinkDialog({ open: false, selectedText: "" })} />}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
          <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="w-3.5 h-3.5" /></ToolbarBtn>
          <div className="w-px h-4 bg-border mx-1" />
          <ToolbarBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1"><Heading1 className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><Heading2 className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3"><Heading3 className="w-3.5 h-3.5" /></ToolbarBtn>
          <div className="w-px h-4 bg-border mx-1" />
          <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote"><Quote className="w-3.5 h-3.5" /></ToolbarBtn>
          <div className="w-px h-4 bg-border mx-1" />
          <ToolbarBtn active={editor.isActive("link")} onClick={openLinkDialog} title="Add link"><Link2 className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn active={false} onClick={addImage} title="Add image"><Image className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="w-3.5 h-3.5" /></ToolbarBtn>
        </div>
        <EditorContent editor={editor} />
      </div>
    </>
  )
}

// --- Custom call action: fetches ABI from Etherscan then shows function picker + arg inputs ---
function CustomCallForm({ action, onChange }: { action: Action; onChange: (a: Action) => void }) {
  const targetRef = useRef<string>("")

  // Fetch ABI from Etherscan when a valid address is entered
  useEffect(() => {
    const addr = action.target?.trim() || ""
    if (!isAddress(addr) || addr === targetRef.current) return
    targetRef.current = addr
    onChange({ ...action, isFetching: true, fetchError: undefined, fetchedAbi: undefined, selectedFunction: undefined, argValues: {} })

    fetch(`/api/etherscan-abi?address=${addr}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          onChange({ ...action, target: addr, isFetching: false, fetchError: data.error, fetchedAbi: undefined })
        } else {
          const writeFns: AbiFunction[] = (data.abi as AbiFunction[]).filter(
            f => f.type === "function" && ["nonpayable", "payable"].includes(f.stateMutability)
          )
          onChange({ ...action, target: addr, isFetching: false, fetchError: undefined, fetchedAbi: writeFns, selectedFunction: writeFns[0]?.name, argValues: {} })
        }
      })
      .catch(() => onChange({ ...action, target: addr, isFetching: false, fetchError: "Failed to fetch ABI", fetchedAbi: undefined }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.target])

  const selectedFn = action.fetchedAbi?.find(f => f.name === action.selectedFunction)
  const isPayable = selectedFn?.stateMutability === "payable"

  const setArg = (name: string, val: string) =>
    onChange({ ...action, argValues: { ...(action.argValues || {}), [name]: val } })

  return (
    <div className="flex flex-col gap-3">
      {/* Step 1: target address */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Target contract address</label>
        <input
          type="text"
          value={action.target || ""}
          onChange={e => onChange({ ...action, target: e.target.value, fetchedAbi: undefined, fetchError: undefined, selectedFunction: undefined, argValues: {} })}
          placeholder="0x..."
          className="px-3 py-2 rounded-md border border-border bg-background text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      {/* Loading */}
      {action.isFetching && (
        <p className="text-xs text-muted-foreground animate-pulse">Fetching contract ABI...</p>
      )}

      {/* Error — offer raw ABI paste fallback */}
      {action.fetchError && (
        <p className="text-xs text-destructive">{action.fetchError}. Paste the function signature manually below.</p>
      )}

      {/* Step 2: function selector — only shown after ABI is loaded */}
      {action.fetchedAbi && action.fetchedAbi.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Function</label>
          <select
            value={action.selectedFunction || ""}
            onChange={e => onChange({ ...action, selectedFunction: e.target.value, argValues: {} })}
            className="px-3 py-2 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            {action.fetchedAbi.map(fn => (
              <option key={fn.name} value={fn.name}>
                {fn.name}({fn.inputs.map(i => `${i.type} ${i.name}`).join(", ")})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Step 3: per-argument inputs */}
      {selectedFn && selectedFn.inputs.map(inp => (
        <div key={inp.name} className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{inp.name}</span>
            <span className="ml-1 text-muted-foreground/70">({inp.type})</span>
          </label>
          <input
            type="text"
            value={(action.argValues || {})[inp.name] || ""}
            onChange={e => setArg(inp.name, e.target.value)}
            placeholder={inp.type === "address" ? "0x..." : inp.type.startsWith("uint") || inp.type.startsWith("int") ? "0" : inp.type === "bool" ? "true / false" : "..."}
            className="px-3 py-2 rounded-md border border-border bg-background text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      ))}

      {/* Step 4: ETH value — only for payable functions */}
      {isPayable && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">ETH value to send</label>
          <input
            type="text"
            value={action.ethValue || ""}
            onChange={e => onChange({ ...action, ethValue: e.target.value })}
            placeholder="0.0"
            className="px-3 py-2 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      )}
    </div>
  )
}

// --- Action form ---
function ActionForm({ action, index, onChange, onRemove }: { action: Action; index: number; onChange: (a: Action) => void; onRemove: () => void }) {
  const types: { value: ActionType; label: string }[] = [
    { value: "eth",    label: "Send ETH" },
    { value: "usdc",   label: "Send USDC" },
    { value: "custom", label: "Custom Call" },
  ]
  return (
    <div className="border border-border rounded-lg p-3 flex flex-col gap-3 bg-card">
      <div className="flex items-center justify-between gap-2">
        <select
          value={action.type}
          onChange={e => onChange({ type: e.target.value as ActionType })}
          className="text-xs font-medium bg-muted border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none"
        >
          {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>

      {(action.type === "eth" || action.type === "usdc") && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Recipient address</label>
            <input type="text" value={action.recipient || ""} onChange={e => onChange({ ...action, recipient: e.target.value })} placeholder="0x..."
              className="px-3 py-2 rounded-md border border-border bg-background text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Amount ({action.type.toUpperCase()})</label>
            <input type="text" value={action.amount || ""} onChange={e => onChange({ ...action, amount: e.target.value })} placeholder="0.0"
              className="px-3 py-2 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
        </>
      )}

      {action.type === "custom" && <CustomCallForm action={action} onChange={onChange} />}
    </div>
  )
}

// --- Main component ---
export default function CreateProposal() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
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

  // Fetch the real createCandidateCost from chain
  const { data: createCandidateCost } = useReadContract({
    address: NOUNS_DAO_DATA,
    abi: NOUNS_DAO_DATA_ABI,
    functionName: "createCandidateCost",
  })

  // Fetch proposalThreshold dynamically from the Governor (nouns-camp pattern)
  const { data: proposalThresholdRaw } = useReadContract({
    address: NOUNS_GOVERNOR,
    abi: NOUNS_GOVERNOR_ABI,
    functionName: "proposalThreshold",
  })
  const proposalThreshold = proposalThresholdRaw != null ? Number(proposalThresholdRaw) : null

  const nounsOwned     = nounBalance != null ? Number(nounBalance) : 0
  const delegatedVotes = votingPower != null ? Number(votingPower) : 0
  // Also count owned Nouns as votes — getCurrentVotes only reflects delegated-to-self if user delegated
  const effectiveVotes = Math.max(nounsOwned, delegatedVotes)
  const hasFeeWaiver   = effectiveVotes >= 1
  // Can go on-chain if votes exceed the threshold.
  // If threshold hasn't loaded yet, fall back to owning at least 1 Noun.
  const canProposeOnChain = proposalThreshold !== null
    ? effectiveVotes > proposalThreshold
    : nounsOwned >= 1



  // Fee is 0 if user has voting power, otherwise use on-chain cost (fallback 0.01 ETH)
  const candidateFee = hasFeeWaiver ? 0n : (createCandidateCost ?? parseEther("0.01"))

  const connectWallet = () => {
    const wc = connectors.find(c => c.id === "walletConnect") ?? connectors[0]
    if (wc) connect({ connector: wc })
  }

  const addAction    = (type: ActionType = "eth") => { setActions(prev => [...prev, { type, recipient: "", amount: "" }]); setShowActions(true) }
  const removeAction = (i: number) => setActions(prev => prev.filter((_, idx) => idx !== i))
  const updateAction = (i: number, a: Action) => setActions(prev => prev.map((x, idx) => idx === i ? a : x))

  const handleSubmit = useCallback(async (type: "candidate" | "onchain") => {
    if (!isConnected) return
    if (!title.trim()) { setTxError("Title is required."); return }
    setTxError(null)
    setProposalType(type)

    let resolved
    try {
      resolved = actions.length > 0 ? actions.map(resolveAction) : null
    } catch (e: any) {
      setTxError("Error encoding actions: " + e.message)
      return
    }

    // Empty proposal needs a no-op target (address(1)) per nouns-camp convention
    const targets: `0x${string}`[] = resolved ? resolved.map(r => r.target)    : ["0x0000000000000000000000000000000000000001"]
    const values:  bigint[]        = resolved ? resolved.map(r => r.value)     : [0n]
    const sigs:    string[]        = resolved ? resolved.map(r => r.signature) : [""]
    const datas:   `0x${string}`[] = resolved ? resolved.map(r => r.calldata)  : ["0x"]

    // On-chain description format: "# Title\n\nBody markdown"
    const markdown    = htmlToMarkdown(bodyHtml)
    const description = `# ${title}\n\n${markdown}`.trim()
    const slug        = slugify(title)

    try {
      if (type === "candidate") {
        writeContract({
          address: NOUNS_DAO_DATA,
          abi: NOUNS_DAO_DATA_ABI,
          functionName: "createProposalCandidate",
          // proposalIdToUpdate = 0 for new candidates (NOT clientId — data contract has no clientId)
          args: [targets, values, sigs, datas, description, slug, 0n],
          value: candidateFee,
        })
      } else {
        // On-chain proposal via Governor — clientId 22 for Nouncil rewards
        writeContract({
          address: NOUNS_GOVERNOR,
          abi: NOUNS_GOVERNOR_ABI,
          functionName: "propose",
          args: [targets, values, sigs, datas, description, CLIENT_ID],
        })
      }
    } catch (err: any) {
      setTxError(err?.message || "Transaction failed")
    }
  }, [isConnected, title, bodyHtml, actions, writeContract, candidateFee])

  const candidateFeeDisplay = hasFeeWaiver ? null : createCandidateCost
    ? `${Number(createCandidateCost) / 1e18} ETH`
    : "0.01 ETH"

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block"><WalletConnectButton /></span>
            <span className="sm:hidden"><WalletConnectButton compact /></span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Give your proposal a clear, descriptive title..."
            className="w-full bg-transparent text-lg sm:text-2xl font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none border-b border-border pb-2 focus:border-primary transition-colors"
          />
          {title && (
            <p className="text-xs text-muted-foreground">
              Slug: <code className="bg-muted px-1 rounded">{slugify(title)}</code>
            </p>
          )}
        </div>

        {/* Rich-text editor */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Description</label>
            <button
              type="button"
              onClick={() => setShowPreview(p => !p)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPreview ? "Edit" : "Preview"}
            </button>
          </div>
          {showPreview ? (
            <div
              className="min-h-[200px] px-4 py-3 border border-border rounded-lg bg-card text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: bodyHtml || "<p class='text-muted-foreground'>Nothing to preview yet.</p>" }}
            />
          ) : (
            <RichEditor onChange={setBodyHtml} />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              Transactions
              {actions.length > 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">({actions.length})</span>}
            </label>
            <button type="button" onClick={() => setShowActions(p => !p)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {showActions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showActions ? "Hide" : "Add transactions"}
            </button>
          </div>

          {showActions && (
            <div className="flex flex-col gap-3">
              {actions.map((action, i) => (
                <ActionForm key={i} action={action} index={i} onChange={a => updateAction(i, a)} onRemove={() => removeAction(i)} />
              ))}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => addAction("eth")} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Coins className="w-3.5 h-3.5" /> Send ETH
                </button>
                <button type="button" onClick={() => addAction("usdc")} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Banknote className="w-3.5 h-3.5" /> Send USDC
                </button>
                <button type="button" onClick={() => addAction("custom")} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Custom call
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error / success */}
        {(txError || (writeError && !txError)) && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{txError || writeError?.message}</span>
          </div>
        )}
        {isConfirmed && (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Successfully submitted! {txHash && <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">View on Etherscan</a>}</span>
          </div>
        )}

        {/* Submit row */}
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            {!isConnected ? (
              /* Not connected — single green button that opens wallet modal */
              <button
                type="button"
                onClick={connectWallet}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-[hsl(var(--nouncil-green))] text-[hsl(var(--nouncil-green-foreground))] hover:brightness-110 active:scale-95 flex-1"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                Connect wallet to submit
              </button>
            ) : canProposeOnChain ? (
              /* Has enough votes to propose on-chain — show both options */
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit("candidate")}
                  disabled={isPending || isConfirming || !title.trim()}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border transition-all flex-1 ${
                    !title.trim() || isPending || isConfirming
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-card text-foreground hover:bg-muted active:scale-95"
                  }`}
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span>{isPending && proposalType === "candidate" ? "Confirm in wallet..." : isConfirming && proposalType === "candidate" ? "Confirming..." : "Submit as Candidate"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit("onchain")}
                  disabled={isPending || isConfirming || !title.trim()}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 ${
                    !title.trim() || isPending || isConfirming
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-[hsl(var(--nouncil-green))] text-[hsl(var(--nouncil-green-foreground))] hover:brightness-110 active:scale-95"
                  }`}
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span>{isPending && proposalType === "onchain" ? "Confirm in wallet..." : isConfirming && proposalType === "onchain" ? "Confirming..." : "Submit On-Chain"}</span>
                </button>
              </>
            ) : (
              /* Connected but below threshold — single candidate button */
              <button
                type="button"
                onClick={() => handleSubmit("candidate")}
                disabled={isPending || isConfirming || !title.trim()}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 ${
                  !title.trim() || isPending || isConfirming
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-[hsl(var(--nouncil-green))] text-[hsl(var(--nouncil-green-foreground))] hover:brightness-110 active:scale-95"
                }`}
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isPending ? "Confirm in wallet..." : isConfirming ? "Confirming..." : candidateFeeDisplay ? `Submit Candidate (${candidateFeeDisplay})` : "Submit Candidate"}
                </span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
