"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Check } from "lucide-react"

interface ProposalTransactionBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Contract addresses
const TREASURY_ADDRESS = "0xb1a32fc9f9d8b2cf86c068cae13108809547ef71"
const PAYER_ADDRESS = "0xd97bcd9f47cee35c0a9ec1dc40c1269afc9e8e1d"
const USDC_ADDRESS = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"

export function ProposalTransactionBuilder({ open, onOpenChange }: ProposalTransactionBuilderProps) {
  const [method, setMethod] = useState<"payer" | "treasury">("payer")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [usdcAmount, setUsdcAmount] = useState("")
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const usdcAmountWei = usdcAmount ? (BigInt(usdcAmount) * BigInt(10 ** 6)).toString() : "0"

  // Generate transaction data based on method
  let target = ""
  let signature = ""
  let calldata = ""

  if (method === "payer" && recipientAddress && usdcAmountWei) {
    // sendOrRegisterDebt(address recipient, uint256 amount)
    target = PAYER_ADDRESS
    signature = "sendOrRegisterDebt(address,uint256)"
    
    // Encode calldata: selector (5a9b0b89) + recipient + amount
    const paddedRecipient = recipientAddress.slice(2).padStart(64, "0")
    const paddedAmount = usdcAmountWei.toString(16).padStart(64, "0")
    calldata = `0x5a9b0b89${paddedRecipient}${paddedAmount}`
  } else if (method === "treasury" && recipientAddress && usdcAmountWei) {
    // Direct transfer from Treasury via ERC20 transfer
    target = USDC_ADDRESS
    signature = "transfer(address,uint256)"
    
    // Encode calldata: selector (a9059cbb) + recipient + amount
    const paddedRecipient = recipientAddress.slice(2).padStart(64, "0")
    const paddedAmount = usdcAmountWei.toString(16).padStart(64, "0")
    calldata = `0xa9059cbb${paddedRecipient}${paddedAmount}`
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const transactionJson = {
    targets: [target],
    values: ["0"],
    signatures: [signature],
    calldatas: [calldata],
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle>Generate USDC Transfer Transaction</DialogTitle>
          <DialogDescription>
            Create a proposal transaction for transferring USDC from Nouns Treasury
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Method Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Transfer Method</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as "payer" | "treasury")}>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="payer" id="payer" />
                <div className="flex-1">
                  <label htmlFor="payer" className="font-medium cursor-pointer">
                    Via Nouns Payer
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    Recommended: Uses sendOrRegisterDebt on Nouns Payer contract. USDC is sourced from Treasury but transferred through Payer contract.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="treasury" id="treasury" />
                <div className="flex-1">
                  <label htmlFor="treasury" className="font-medium cursor-pointer">
                    Direct from Treasury
                  </label>
                  <p className="text-xs text-gray-400 mt-1">
                    Direct ERC20 transfer from Treasury. USDC is transferred directly from Treasury address.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Input Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient" className="text-sm">
                Recipient Address
              </Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="mt-2 bg-gray-900 border-gray-800"
              />
            </div>

            <div>
              <Label htmlFor="amount" className="text-sm">
                Amount (USDC)
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="1000"
                value={usdcAmount}
                onChange={(e) => setUsdcAmount(e.target.value)}
                className="mt-2 bg-gray-900 border-gray-800"
              />
              {usdcAmount && (
                <p className="text-xs text-gray-400 mt-1">
                  {usdcAmount} USDC = {usdcAmountWei} wei (6 decimals)
                </p>
              )}
            </div>
          </div>

          {/* Generated Transaction */}
          {target && signature && calldata && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-base">Generated Transaction</CardTitle>
                <CardDescription>Copy these values into your proposal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-mono">Target</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(target, 0)}
                      className="h-6 gap-1"
                    >
                      {copiedIndex === 0 ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <div className="bg-gray-950 p-2 rounded font-mono text-xs break-all text-gray-300">
                    {target}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-mono">Signature</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(signature, 1)}
                      className="h-6 gap-1"
                    >
                      {copiedIndex === 1 ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <div className="bg-gray-950 p-2 rounded font-mono text-xs break-all text-gray-300">
                    {signature}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-mono">Calldata</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(calldata, 2)}
                      className="h-6 gap-1"
                    >
                      {copiedIndex === 2 ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <div className="bg-gray-950 p-2 rounded font-mono text-xs break-all text-gray-300 max-h-20 overflow-y-auto">
                    {calldata}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-mono">Full JSON</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(JSON.stringify(transactionJson), 3)}
                      className="h-6 gap-1"
                    >
                      {copiedIndex === 3 ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <div className="bg-gray-950 p-2 rounded font-mono text-xs break-all text-gray-300 max-h-32 overflow-y-auto">
                    {JSON.stringify(transactionJson, null, 2)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
