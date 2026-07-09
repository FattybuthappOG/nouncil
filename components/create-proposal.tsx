"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import WalletConnectButton from "./wallet-connect-button"
import { parseEther, parseUnits, encodeFunctionData, decodeFunctionData, isAddress, getAddress, toFunctionSelector, encodeAbiParameters } from "viem"
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
import { marked } from "marked"
import { getReplicationData } from "@/lib/proposal-replication"
import { ProposalTransactionBuilder } from "@/components/proposal-transaction-builder"

// NounsDAOData proxy — creates proposal candidates (no clientId param on this contract)
const NOUNS_DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365" as const

// Nouns Governor V3 — propose with clientId 22 for Nouncil rewards
const NOUNS_GOVERNOR = "0x6f3E6272A167E8accb32072D08e0957f9C79223e" as const
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
  {
    name: "updateProposalCandidate",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "targets",           type: "address[]" },
      { name: "values",            type: "uint256[]" },
      { name: "signatures",        type: "string[]"  },
      { name: "calldatas",         type: "bytes[]"   },
      { name: "description",       type: "string"    },
      { name: "slug",              type: "string"    },
      { name: "proposalIdToUpdate",type: "uint256"   },
      { name: "reason",            type: "string"    },
    ],
    outputs: [],
  },
  {
    name: "updateCandidateCost",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "cancelProposalCandidate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "slug", type: "string" }],
    outputs: [],
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
  {
    name: "updateProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId",   type: "uint256"   },
      { name: "targets",      type: "address[]" },
      { name: "values",       type: "uint256[]" },
      { name: "signatures",   type: "string[]"  },
      { name: "calldatas",    type: "bytes[]"   },
      { name: "description",  type: "string"    },
      { name: "updateMessage",type: "string"    },
    ],
    outputs: [],
  },
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

// Nouns Treasury holds Nouns NFTs and can transfer them via proposals
const NOUNS_TREASURY = "0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71" as const

type ActionType = "eth" | "usdc" | "noun" | "custom" | "raw"

interface AbiInput { name: string; type: string; components?: AbiInput[] }
interface AbiFunction { name: string; type: string; stateMutability: string; inputs: AbiInput[]; outputs?: AbiInput[] }

// Common contract ABIs for known addresses (fallback when Etherscan fails)
const KNOWN_CONTRACT_ABIS: Record<string, AbiFunction[]> = {
  // Nouns Auction House Proxy (V2 uses uint192 for prices)
  "0x830bd73e4184cef73443c15111a1df14e495c706": [
    { type: "function", name: "pause", stateMutability: "nonpayable", inputs: [] },
    { type: "function", name: "unpause", stateMutability: "nonpayable", inputs: [] },
    { type: "function", name: "setReservePrice", stateMutability: "nonpayable", inputs: [{ name: "_reservePrice", type: "uint192" }] },
    { type: "function", name: "setMinBidIncrementPercentage", stateMutability: "nonpayable", inputs: [{ name: "_minBidIncrementPercentage", type: "uint8" }] },
    { type: "function", name: "setTimeBuffer", stateMutability: "nonpayable", inputs: [{ name: "_timeBuffer", type: "uint56" }] },
    { type: "function", name: "settleCurrentAndCreateNewAuction", stateMutability: "nonpayable", inputs: [] },
  ],
  // Nouns Token
  "0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03": [
    { type: "function", name: "transferFrom", stateMutability: "nonpayable", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "tokenId", type: "uint256" }] },
    { type: "function", name: "delegate", stateMutability: "nonpayable", inputs: [{ name: "delegatee", type: "address" }] },
    { type: "function", name: "setApprovalForAll", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }] },
  ],
  // Nouns DAO Treasury (Executor)
  "0xb1a32fc9f9d8b2cf86c068cae13108809547ef71": [
    { type: "function", name: "sendETH", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }] },
    { type: "function", name: "sendERC20", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "erc20Token", type: "address" }, { name: "amount", type: "uint256" }] },
  ],
  // Nouns Governor
  "0x6f3e6272a167e8accb32072d08e0957f9c79223e": [
    { type: "function", name: "setVotingDelay", stateMutability: "nonpayable", inputs: [{ name: "newVotingDelay", type: "uint256" }] },
    { type: "function", name: "setVotingPeriod", stateMutability: "nonpayable", inputs: [{ name: "newVotingPeriod", type: "uint256" }] },
    { type: "function", name: "setProposalThresholdBPS", stateMutability: "nonpayable", inputs: [{ name: "newProposalThresholdBPS", type: "uint256" }] },
  ],
  // USDC
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": [
    { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }] },
    { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }] },
  ],
  // WETH
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": [
    { type: "function", name: "deposit", stateMutability: "payable", inputs: [] },
    { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "wad", type: "uint256" }] },
    { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "dst", type: "address" }, { name: "wad", type: "uint256" }] },
    { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "guy", type: "address" }, { name: "wad", type: "uint256" }] },
  ],
}

// Parse a manual function signature like "transfer(address,uint256)" into ABI format
function parseManualSignature(sig: string): AbiFunction | null {
  const match = sig.match(/^(\w+)\s*\(([^)]*)\)$/)
  if (!match) return null
  const [, name, argsStr] = match
  const inputs = argsStr.split(",").filter(Boolean).map((type, i) => ({
    name: `arg${i}`,
    type: type.trim(),
  }))
  return { type: "function", name, stateMutability: "nonpayable", inputs }
}

interface Action {
  type: ActionType
  // transfer actions (ETH/USDC)
  recipient?: string
  amount?: string
  // Noun NFT transfer
  nounId?: string
  // custom call
  target?: string
  ethValue?: string          // only for payable functions
  fetchedAbi?: AbiFunction[] // fetched from Etherscan
  fetchError?: string
  isFetching?: boolean
  selectedFunction?: string  // function signature e.g. "pause()"
  argValues?: Record<string, string> // inputName → value
  // raw pre-encoded calldata (used when loading from template)
  rawCalldata?: string
  rawValue?: string
  signature?: string
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
  if (type === "address") {
    try {
      return getAddress(value) as `0x${string}`
    } catch {
      return value as `0x${string}`
    }
  }
  if (type === "bool") return value === "true"
  if (type.startsWith("uint") || type.startsWith("int")) return BigInt(value || "0")
  if (type === "bytes" || type.startsWith("bytes")) return value as `0x${string}`
  if (type.endsWith("[]")) {
    try { return JSON.parse(value) } catch { return [] }
  }
  return value
}

function resolveAction(action: Action): { target: `0x${string}`; value: bigint; signature: string; calldata: `0x${string}` } {
  if (action.type === "raw") {
    // Pre-encoded calldata from template - pass through directly
    if (!isAddress(action.target || "")) throw new Error("Invalid target address for raw call")
    const normalizedTarget = getAddress(action.target!) as `0x${string}`
    const value = action.rawValue ? BigInt(action.rawValue) : 0n
    return {
      target: normalizedTarget,
      value,
      signature: action.signature || "",
      calldata: (action.rawCalldata || "0x") as `0x${string}`,
    }
  }
  if (action.type === "eth") {
    // ETH transfer: empty signature and "0x" calldata
    if (!isAddress(action.recipient || "")) throw new Error("Invalid recipient address for ETH transfer")
    return { target: action.recipient as `0x${string}`, value: parseEther(action.amount || "0"), signature: "", calldata: "0x" }
  }
  if (action.type === "usdc") {
    if (!isAddress(action.recipient || "")) throw new Error("Invalid recipient address for USDC transfer")
    // USDC uses 6 decimals
    const amountInUnits = parseUnits(action.amount || "0", 6)
    // Use legacy format: signature contains function name+types, calldata contains only encoded params
    const signature = "transfer(address,uint256)"
    const calldata = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [action.recipient as `0x${string}`, amountInUnits]
    )
    return { target: USDC, value: 0n, signature, calldata }
  }
  if (action.type === "noun") {
    // Request a Noun NFT from the treasury
    if (!isAddress(action.recipient || "")) throw new Error("Invalid recipient address for Noun transfer")
    const nounId = BigInt(action.nounId || "0")
    // Use legacy format for transferFrom
    const signature = "transferFrom(address,address,uint256)"
    const calldata = encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "uint256" }],
      [NOUNS_TREASURY, action.recipient as `0x${string}`, nounId]
    )
    return { target: NOUNS_TOKEN, value: 0n, signature, calldata }
  }
  // custom: encode from fetched ABI + selected function + arg values
  if (!isAddress(action.target || "")) throw new Error("Invalid target address for custom call")
  // Normalize target address to proper checksum format
  const normalizedTarget = getAddress(action.target!) as `0x${string}`
  // Find function by matching signature (handles overloaded functions)
  const fn = action.fetchedAbi?.find(f => {
    const sig = `${f.name}(${f.inputs?.map(i => i.type).join(",") || ""})`
    return sig === action.selectedFunction
  })
  if (!fn) throw new Error("Select a function")
  const argVals = action.argValues || {}
  const encodedArgs = fn.inputs.map(inp => coerceArg(argVals[inp.name] || "", inp.type))
  
  // Use legacy format: signature = "functionName(type1,type2,...)", calldata = encoded params only
  const signature = `${fn.name}(${fn.inputs.map(i => i.type).join(",")})`
  const calldata = fn.inputs.length > 0
    ? encodeAbiParameters(
        fn.inputs.map(i => ({ type: i.type })),
        encodedArgs
      )
    : "0x" as `0x${string}`
  
  const ethValue = fn.stateMutability === "payable" ? parseEther(action.ethValue || "0") : 0n
  return { target: normalizedTarget, value: ethValue, signature, calldata }
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
function RichEditor({ onChange, initialContent }: { onChange: (html: string) => void; initialContent?: string }) {
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; selectedText: string }>({ open: false, selectedText: "" })
  // Capture initialContent only once via a ref — never update it — so the
  // editor doesn't reset its content (and cursor) on every keystroke.
  const initialContentRef = useRef(initialContent)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: true, autolink: true, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      TiptapImage,
      Placeholder.configure({ placeholder: "Describe your proposal — motivation, specification, benefits..." }),
    ],
    // Pass content once at creation time — tiptap owns the state from here on.
    content: initialContentRef.current || "",
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
  const [manualSig, setManualSig] = useState("")

  // Fetch ABI from Etherscan when a valid address is entered
  useEffect(() => {
    const addr = action.target?.trim().toLowerCase() || ""
    if (!isAddress(addr) || addr === targetRef.current) return
    targetRef.current = addr
    
    // Check for known contract ABI first
    const knownAbi = KNOWN_CONTRACT_ABIS[addr]
    if (knownAbi) {
      const firstSig = `${knownAbi[0].name}(${knownAbi[0].inputs?.map(i => i.type).join(",") || ""})`
      onChange({ ...action, target: addr, isFetching: false, fetchError: undefined, fetchedAbi: knownAbi, selectedFunction: firstSig, argValues: {} })
      return
    }
    
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
          if (writeFns.length === 0) {
            onChange({ ...action, target: addr, isFetching: false, fetchError: "No write functions found", fetchedAbi: undefined })
            return
          }
          // Use signature as key to properly handle overloaded functions
          const firstSig = `${writeFns[0].name}(${writeFns[0].inputs?.map(i => i.type).join(",") || ""})`
          onChange({ ...action, target: addr, isFetching: false, fetchError: undefined, fetchedAbi: writeFns, selectedFunction: firstSig, argValues: {} })
        }
      })
      .catch(() => onChange({ ...action, target: addr, isFetching: false, fetchError: "Failed to fetch ABI", fetchedAbi: undefined }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.target])

  // Handle manual signature entry
  const handleManualSigSubmit = () => {
    const parsed = parseManualSignature(manualSig.trim())
    if (parsed) {
      const sig = `${parsed.name}(${parsed.inputs?.map(i => i.type).join(",") || ""})`
      onChange({ ...action, fetchError: undefined, fetchedAbi: [parsed], selectedFunction: sig, argValues: {} })
      setManualSig("")
    }
  }

  // Find selected function by signature (handles overloaded functions)
  const selectedFn = action.fetchedAbi?.find(f => {
    const sig = `${f.name}(${f.inputs?.map(i => i.type).join(",") || ""})`
    return sig === action.selectedFunction
  })
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

      {/* Error — offer manual signature input */}
      {action.fetchError && !action.fetchedAbi && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-destructive">{action.fetchError}</p>
          <p className="text-xs text-muted-foreground">Enter function signature manually (e.g., transfer(address,uint256)):</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualSig}
              onChange={e => setManualSig(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleManualSigSubmit()}
              placeholder="functionName(type1,type2)"
              className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              type="button"
              onClick={handleManualSigSubmit}
              disabled={!manualSig.trim()}
              className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Use
            </button>
          </div>
        </div>
      )}

      {/* Step 2: function selector — only shown after ABI is loaded */}
      {action.fetchedAbi && action.fetchedAbi.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">
            Function <span className="text-muted-foreground/70">({action.fetchedAbi.length} available)</span>
          </label>
          <select
            value={action.selectedFunction || ""}
            onChange={e => onChange({ ...action, selectedFunction: e.target.value, argValues: {} })}
            className="px-3 py-2 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="">Select a function</option>
            {action.fetchedAbi.map((fn, idx) => {
              // Use comma without space for signature matching
              const sigValue = `${fn.name}(${fn.inputs?.map(i => i.type).join(",") || ""})`
              // Display with space for readability
              const sigDisplay = `${fn.name}(${fn.inputs?.map(i => i.type).join(", ") || ""})`
              return (
                <option key={`${fn.name}-${idx}`} value={sigValue}>
                  {sigDisplay}
                </option>
              )
            })}
          </select>
          {selectedFn && (
            <p className="text-[10px] text-muted-foreground/70">
              {selectedFn.stateMutability === "payable" ? "💰 Payable" : "Write function"}
              {selectedFn.outputs && selectedFn.outputs.length > 0 && ` • Returns: ${selectedFn.outputs.map(o => o.type).join(", ")}`}
            </p>
          )}
        </div>
      )}

      {/* Step 3: per-argument inputs */}
      {selectedFn && selectedFn.inputs.map(inp => {
        const isArray = inp.type.endsWith("[]")
        const baseType = inp.type.replace("[]", "")
        let placeholder = "..."
        let helpText = ""
        
        if (baseType === "address") {
          placeholder = "0x..."
          helpText = "Ethereum address"
        } else if (baseType.startsWith("uint") || baseType.startsWith("int")) {
          placeholder = "0"
          helpText = baseType
        } else if (baseType === "bool") {
          placeholder = "true / false"
          helpText = "Boolean value"
        } else if (baseType === "bytes" || baseType.startsWith("bytes")) {
          placeholder = "0x..."
          helpText = "Hex encoded bytes"
        } else if (baseType === "string") {
          placeholder = "text"
          helpText = "Text string"
        }
        
        if (isArray) {
          helpText += " (array - use JSON format like [\"addr1\", \"addr2\"])"
          placeholder = isArray && baseType === "address" ? "[\"0x...\", \"0x...\"]" : "[...]"
        }
        
        return (
          <div key={inp.name} className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{inp.name}</span>
              <span className="ml-1 text-muted-foreground/70">({inp.type})</span>
            </label>
            <input
              type="text"
              value={(action.argValues || {})[inp.name] || ""}
              onChange={e => setArg(inp.name, e.target.value)}
              placeholder={placeholder}
              className="px-3 py-2 rounded-md border border-border bg-background text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            {helpText && <p className="text-[10px] text-muted-foreground/60">{helpText}</p>}
          </div>
        )
      })}

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
    { value: "noun",   label: "Request Noun NFT" },
    { value: "custom", label: "Custom Call" },
    { value: "raw",    label: "Custom Call (raw)" },
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

      {action.type === "noun" && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Noun ID to request from treasury</label>
            <input type="text" value={action.nounId || ""} onChange={e => onChange({ ...action, nounId: e.target.value })} placeholder="e.g. 42"
              className="px-3 py-2 rounded-md border border-border bg-background text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the token ID of a Noun held by the treasury. Check{" "}
              <a href="https://nouns.wtf/explore?owner=0xb1a32fc9f9d8b2cf86c068cae13108809547ef71" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">treasury Nouns</a>
              {" "}to find available Nouns.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Recipient address</label>
            <input type="text" value={action.recipient || ""} onChange={e => onChange({ ...action, recipient: e.target.value })} placeholder="0x..."
              className="px-3 py-2 rounded-md border border-border bg-background text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
        </>
      )}

      {action.type === "custom" && <CustomCallForm action={action} onChange={onChange} />}

      {action.type === "raw" && (
        <div className="flex flex-col gap-2">
          {action.isFetching ? (
            <p className="text-xs text-muted-foreground animate-pulse">Decoding transaction...</p>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Target contract address</label>
                <p className="px-3 py-2 rounded-md border border-border bg-muted text-xs font-mono text-foreground">{action.target}</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Calldata</label>
                <p className="px-3 py-2 rounded-md border border-border bg-muted text-xs font-mono text-foreground break-all">{action.rawCalldata}</p>
              </div>
              <p className="text-xs text-amber-500">Could not decode ABI. Transaction will be submitted with raw calldata.</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// --- Main component ---
export interface EditModeProps {
  editMode?: "candidate" | "proposal"
  candidateSlug?: string      // For editing candidates
  proposalId?: number         // For editing on-chain proposals in Updatable state
  initialData?: {
    title: string
    description: string
    targets: string[]
    values: string[]
    signatures: string[]
    calldatas: string[]
  }
}

export default function CreateProposal({ editMode, candidateSlug, proposalId, initialData }: EditModeProps = {}) {
  const searchParams = useSearchParams()
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const [title, setTitle] = useState(initialData?.title || "")
  const [bodyHtml, setBodyHtml] = useState("")
  // Stable ref for RichEditor's initialContent — only updated when edit-mode
  // data loads, never on each keystroke, so the editor never resets its cursor.
  const editorInitialContentRef = useRef("")
  // Bump this key to force RichEditor to remount when initial content is loaded
  // (edit mode or template), so it picks up the ref value.
  const [editorKey, setEditorKey] = useState(0)
  const [actions, setActions] = useState<Action[]>([])
  const [proposalType, setProposalType] = useState<"candidate" | "onchain">(editMode === "proposal" ? "onchain" : "candidate")
  const [showActions, setShowActions] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [updateReason, setUpdateReason] = useState("") // For edit mode
  const [showTransactionBuilder, setShowTransactionBuilder] = useState(false)

  // Load edit mode data on mount
  useEffect(() => {
    if (!editMode || !initialData) return
    
    setTitle(initialData.title || "")
    const htmlContent = marked.parse(initialData.description || "", { async: false }) as string
    setBodyHtml(htmlContent)
    editorInitialContentRef.current = htmlContent
    setEditorKey(k => k + 1)
    
    if (!initialData.targets?.length) return
    
    const targets = initialData.targets
    const calldatas = initialData.calldatas || []
    const values = initialData.values || []
    const signatures = initialData.signatures || []
    
    // Start all actions as "raw" while we decode in background
    const rawActions: Action[] = targets.map((target, idx) => ({
      type: "raw" as ActionType,
      target,
      rawValue: values[idx] || "0",
      signature: signatures[idx] || "",
      rawCalldata: calldatas[idx] || "0x",
      isFetching: true,
    }))
    setActions(rawActions)
    setShowActions(true)
    
    // Decode actions using ABI
    const uniqueTargets = [...new Set(targets)]
    const abiCache: Record<string, AbiFunction[]> = {}
    
    Promise.all(
      uniqueTargets.map(target =>
        fetch(`/api/etherscan-abi?address=${target}`)
          .then(r => r.json())
          .then(d => {
            if (!d.error && d.abi) {
              const writeFns: AbiFunction[] = (d.abi as AbiFunction[]).filter(
                f => f.type === "function" && ["nonpayable", "payable"].includes(f.stateMutability)
              )
              abiCache[target.toLowerCase()] = writeFns
            }
          })
          .catch(() => {})
      )
    ).then(() => {
      setActions(prev =>
        prev.map((action, idx) => {
          if (action.type !== "raw") return action
          const target = targets[idx]
          const calldata = calldatas[idx] || "0x"
          const signature = signatures[idx] || ""
          const writeFns = abiCache[target?.toLowerCase()]
          
          if (!writeFns || writeFns.length === 0) {
            return { ...action, type: "custom" as ActionType, fetchedAbi: [], fetchError: "Could not fetch contract ABI", isFetching: false }
          }
          
          // Match by explicit signature (params-only calldata)
          if (signature) {
            const sigMatch = signature.match(/^(\w+)\((.*)\)$/)
            if (sigMatch) {
              const [, fnName, paramTypesStr] = sigMatch
              const paramTypes = paramTypesStr ? paramTypesStr.split(",").map(t => t.trim()) : []
              const matchingFn = writeFns.find(fn => fn.name === fnName && fn.inputs.length === paramTypes.length && fn.inputs.every((inp, i) => inp.type === paramTypes[i]))
              if (matchingFn) {
                const argValues: Record<string, string> = {}
                if (calldata && calldata !== "0x" && matchingFn.inputs.length > 0) {
                  try {
                    const fnSelector = toFunctionSelector(signature)
                    const fullCalldata = (fnSelector + calldata.slice(2)) as `0x${string}`
                    const decoded = decodeFunctionData({ abi: [matchingFn] as any, data: fullCalldata })
                    matchingFn.inputs.forEach((inp, i) => {
                      const val = (decoded.args as any[])?.[i]
                      argValues[inp.name] = val !== undefined ? String(val) : ""
                    })
                  } catch {}
                }
                const sig = `${matchingFn.name}(${matchingFn.inputs?.map(i => i.type).join(",") || ""})`
                return { ...action, type: "custom" as ActionType, fetchedAbi: writeFns, selectedFunction: sig, argValues, isFetching: false }
              }
            }
          }

          // Fallback A: calldata has 4-byte selector (full calldata format)
          if (calldata && calldata.length >= 10 && calldata !== "0x") {
            const calldataSelector = calldata.slice(0, 10).toLowerCase()
            const matchingFn = writeFns.find(fn => {
              try { return toFunctionSelector(`${fn.name}(${fn.inputs?.map(i => i.type).join(",") || ""})`).toLowerCase() === calldataSelector }
              catch { return false }
            })
            if (matchingFn) {
              try {
                const decoded = decodeFunctionData({ abi: [matchingFn] as any, data: calldata as `0x${string}` })
                const argValues: Record<string, string> = {}
                matchingFn.inputs.forEach((inp, i) => {
                  const val = (decoded.args as any[])?.[i]
                  argValues[inp.name] = val !== undefined ? String(val) : ""
                })
                const sig = `${matchingFn.name}(${matchingFn.inputs?.map(i => i.type).join(",") || ""})`
                return { ...action, type: "custom" as ActionType, fetchedAbi: writeFns, selectedFunction: sig, argValues, isFetching: false }
              } catch {}
            }
          }

          // Fallback B: no signature, params-only calldata — brute-force each fn
          if (calldata && calldata !== "0x") {
            for (const fn of writeFns) {
              try {
                const fnSig = `${fn.name}(${fn.inputs?.map(i => i.type).join(",") || ""})`
                const fullCalldata = (toFunctionSelector(fnSig) + calldata.slice(2)) as `0x${string}`
                const decoded = decodeFunctionData({ abi: [fn] as any, data: fullCalldata })
                const argValues: Record<string, string> = {}
                fn.inputs.forEach((inp, i) => {
                  const val = (decoded.args as any[])?.[i]
                  argValues[inp.name] = val !== undefined ? String(val) : ""
                })
                return { ...action, type: "custom" as ActionType, fetchedAbi: writeFns, selectedFunction: fnSig, argValues, isFetching: false }
              } catch {}
            }
          }

          return { ...action, type: "custom" as ActionType, fetchedAbi: writeFns, selectedFunction: undefined, argValues: {}, isFetching: false }
        })
      )
    })
  }, [editMode, initialData])

  // Load replicated data on mount if available
  useEffect(() => {
    const replicationType = searchParams.get("replicate")
    if (!replicationType) return
    const data = getReplicationData()
    if (!data) return

    setTitle(data.title || "")
    const htmlContent = marked.parse(data.description || "", { async: false }) as string
    setBodyHtml(htmlContent)
    editorInitialContentRef.current = htmlContent
    setEditorKey(k => k + 1)
    setProposalType(data.type === "candidate" ? "candidate" : "onchain")

    if (!data.targets?.length) return

    // Capture data for async operations
    const targets = data.targets
    const calldatas = data.calldatas || []
    const values = data.values || []
    const signatures = data.signatures || []

    // Start all actions as "raw" while we decode in background
    const rawActions: Action[] = targets.map((target, idx) => ({
      type: "raw" as ActionType,
      target,
      rawValue: values[idx] || "0",
      signature: signatures[idx] || "",
      rawCalldata: calldatas[idx] || "0x",
      isFetching: true,
    }))
    setActions(rawActions)
    setShowActions(true)

    // For each unique target, fetch the ABI and decode the calldata
    const uniqueTargets = [...new Set(targets)]
    const abiCache: Record<string, AbiFunction[]> = {}

    Promise.all(
      uniqueTargets.map(target =>
        fetch(`/api/etherscan-abi?address=${target}`)
          .then(r => r.json())
          .then(d => {
            if (!d.error && d.abi) {
              const writeFns: AbiFunction[] = (d.abi as AbiFunction[]).filter(
                f => f.type === "function" && ["nonpayable", "payable"].includes(f.stateMutability)
              )
              abiCache[target.toLowerCase()] = writeFns
            }
          })
          .catch(() => {})
      )
    ).then(() => {
      setActions(prev =>
        prev.map((action, idx) => {
          if (action.type !== "raw") return action
          const target = targets[idx]
          const calldata = calldatas[idx] || "0x"
          const signature = signatures[idx] || ""
          const writeFns = abiCache[target?.toLowerCase()]

          if (!writeFns || writeFns.length === 0) {
            // No ABI available - convert to custom anyway so user can manually enter target
            return {
              ...action,
              type: "custom" as ActionType,
              fetchedAbi: [],
              fetchError: "Could not fetch contract ABI",
              selectedFunction: undefined,
              argValues: {},
              isFetching: false,
            }
          }
          
          // Nouns DAO stores signatures separately (e.g., "setReservePrice(uint192)")
          // and calldatas contain only the encoded parameters without the selector
          // Use the signature to find the matching function
          if (signature) {
            // Parse the signature to extract function name and param types
            const sigMatch = signature.match(/^(\w+)\((.*)\)$/)
            if (sigMatch) {
              const [, fnName, paramTypesStr] = sigMatch
              const paramTypes = paramTypesStr ? paramTypesStr.split(",").map(t => t.trim()) : []
              
              // Find matching function in ABI
              const matchingFn = writeFns.find(fn => {
                const nameMatch = fn.name === fnName
                const lengthMatch = fn.inputs.length === paramTypes.length
                const typesMatch = fn.inputs.every((inp, i) => inp.type === paramTypes[i])
                return nameMatch && lengthMatch && typesMatch
              })
              
              if (matchingFn) {
                // Decode the calldata (which contains only params, no selector)
                const argValues: Record<string, string> = {}
                
                if (calldata && calldata !== "0x" && matchingFn.inputs.length > 0) {
                  try {
                    // Build full calldata with selector for decoding
                    const fnSelector = toFunctionSelector(signature)
                    const fullCalldata = fnSelector + calldata.slice(2) // Add selector to params
                    const decoded = decodeFunctionData({ abi: [matchingFn] as any, data: fullCalldata as `0x${string}` })
                    matchingFn.inputs.forEach((inp, i) => {
                      const val = (decoded.args as any[])?.[i]
                      argValues[inp.name] = val !== undefined ? String(val) : ""
                    })
                  } catch {
                    // Failed to decode params - leave argValues empty
                  }
                }
                
                const sig = `${matchingFn.name}(${matchingFn.inputs?.map(i => i.type).join(",") || ""})`
                return {
                  ...action,
                  type: "custom" as ActionType,
                  fetchedAbi: writeFns,
                  selectedFunction: sig,
                  argValues,
                  isFetching: false,
                  fetchError: undefined,
                }
              }
            }
          }
          
          // Fallback A: calldata has a 4-byte selector (modern full-calldata format)
          if (calldata && calldata.length >= 10 && calldata !== "0x") {
            const calldataSelector = calldata.slice(0, 10).toLowerCase()
            const matchingFn = writeFns.find(fn => {
              try {
                const fnSelector = toFunctionSelector(`${fn.name}(${fn.inputs?.map(i => i.type).join(",") || ""})`)
                return fnSelector.toLowerCase() === calldataSelector
              } catch {
                return false
              }
            })
            if (matchingFn) {
              try {
                const decoded = decodeFunctionData({ abi: [matchingFn] as any, data: calldata as `0x${string}` })
                const argValues: Record<string, string> = {}
                matchingFn.inputs.forEach((inp, i) => {
                  const val = (decoded.args as any[])?.[i]
                  argValues[inp.name] = val !== undefined ? String(val) : ""
                })
                const sig = `${matchingFn.name}(${matchingFn.inputs?.map(i => i.type).join(",") || ""})`
                return {
                  ...action,
                  type: "custom" as ActionType,
                  fetchedAbi: writeFns,
                  selectedFunction: sig,
                  argValues,
                  isFetching: false,
                  fetchError: undefined,
                }
              } catch {
                // Decode failed, continue to next fallback
              }
            }
          }

          // Fallback B: calldata is params-only (no selector) — try each function
          // by prepending its selector and attempting to decode
          if (calldata && calldata !== "0x") {
            for (const fn of writeFns) {
              try {
                const fnSig = `${fn.name}(${fn.inputs?.map(i => i.type).join(",") || ""})`
                const fnSelector = toFunctionSelector(fnSig)
                const fullCalldata = (fnSelector + calldata.slice(2)) as `0x${string}`
                const decoded = decodeFunctionData({ abi: [fn] as any, data: fullCalldata })
                const argValues: Record<string, string> = {}
                fn.inputs.forEach((inp, i) => {
                  const val = (decoded.args as any[])?.[i]
                  argValues[inp.name] = val !== undefined ? String(val) : ""
                })
                return {
                  ...action,
                  type: "custom" as ActionType,
                  fetchedAbi: writeFns,
                  selectedFunction: fnSig,
                  argValues,
                  isFetching: false,
                  fetchError: undefined,
                }
              } catch {
                // This function didn't match, try the next
              }
            }
          }

          // Fallback C: nothing decoded — show custom editor with ABI loaded, no args
          return {
            ...action,
            type: "custom" as ActionType,
            fetchedAbi: writeFns,
            selectedFunction: undefined,
            argValues: {},
            isFetching: false,
          }
        })
      )
    })
  }, [searchParams])

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

  // Fetch the updateCandidateCost for editing candidates
  const { data: updateCandidateCost } = useReadContract({
    address: NOUNS_DAO_DATA,
    abi: NOUNS_DAO_DATA_ABI,
    functionName: "updateCandidateCost",
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
  // Use updateCandidateCost for editing, createCandidateCost for creating
  const baseFee = editMode === "candidate" ? (updateCandidateCost ?? createCandidateCost ?? parseEther("0.01")) : (createCandidateCost ?? parseEther("0.01"))
  const candidateFee = hasFeeWaiver ? 0n : baseFee

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
    const slug        = candidateSlug || slugify(title)

    try {
      if (editMode === "candidate" && candidateSlug) {
        // Update existing candidate
        writeContract({
          address: NOUNS_DAO_DATA,
          abi: NOUNS_DAO_DATA_ABI,
          functionName: "updateProposalCandidate",
          args: [targets, values, sigs, datas, description, candidateSlug, 0n, updateReason],
          value: candidateFee, // Update cost (usually same as create, waived for Nouners)
        })
      } else if (editMode === "proposal" && proposalId) {
        // Update on-chain proposal in Updatable state
        writeContract({
          address: NOUNS_GOVERNOR,
          abi: NOUNS_GOVERNOR_ABI,
          functionName: "updateProposal",
          args: [BigInt(proposalId), targets, values, sigs, datas, description, updateReason],
        })
      } else if (type === "candidate") {
        // Create new candidate
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
  }, [isConnected, title, bodyHtml, actions, writeContract, candidateFee, editMode, candidateSlug, proposalId, updateReason])

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
            <RichEditor key={editorKey} onChange={setBodyHtml} initialContent={editorInitialContentRef.current} />
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
                <button type="button" onClick={() => setShowTransactionBuilder(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Generate USDC Transaction
                </button>
                <button type="button" onClick={() => addAction("noun")} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Image className="w-3.5 h-3.5" /> Request Noun
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

        {/* Update reason (only in edit mode) */}
        {editMode && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Update Reason {editMode === "proposal" ? "(shown on-chain)" : ""}
            </label>
            <textarea
              value={updateReason}
              onChange={e => setUpdateReason(e.target.value)}
              placeholder="Briefly explain what changed and why..."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
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
                Connect wallet to {editMode ? "update" : "submit"}
              </button>
            ) : editMode ? (
              /* Edit mode — single update button */
              <button
                type="button"
                onClick={() => handleSubmit(editMode === "proposal" ? "onchain" : "candidate")}
                disabled={isPending || isConfirming || !title.trim()}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 ${
                  !title.trim() || isPending || isConfirming
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-[hsl(var(--nouncil-green))] text-[hsl(var(--nouncil-green-foreground))] hover:brightness-110 active:scale-95"
                }`}
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isPending ? "Confirm in wallet..." : isConfirming ? "Confirming..." : `Update ${editMode === "proposal" ? "Proposal" : "Candidate"}`}
                </span>
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

      {/* Transaction Builder Dialog */}
      <ProposalTransactionBuilder open={showTransactionBuilder} onOpenChange={setShowTransactionBuilder} />
    </div>
  )
}
