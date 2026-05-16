"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, PenLine } from "lucide-react"
import {
  useSignProposalCandidate,
  useAddSignatureToCandidate,
  useVotingPower,
  encodeProposalData,
  getDefaultExpiration,
  type ProposalCandidate,
} from "@/hooks/useSponsor"

interface SponsorCandidateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: ProposalCandidate
  onSuccess?: () => void
}

export function SponsorCandidateDialog({
  open,
  onOpenChange,
  candidate,
  onSuccess,
}: SponsorCandidateDialogProps) {
  const { address, isConnected } = useAccount()
  const { votingPower } = useVotingPower(address)
  const { signCandidate, isSigning, error: signError } = useSignProposalCandidate()
  const {
    addSignature,
    isSubmitting,
    isConfirming,
    isSuccess,
    error: submitError,
  } = useAddSignatureToCandidate()

  const [reason, setReason] = useState("")
  const [expirationDays, setExpirationDays] = useState(30)
  const [signature, setSignature] = useState<`0x${string}` | null>(null)
  const [step, setStep] = useState<"sign" | "submit" | "done">("sign")

  // Get the latest version's content or fall back to root level
  const content = candidate.latestVersion?.content || {
    targets: candidate.targets,
    values: candidate.values,
    signatures: candidate.signatures,
    calldatas: candidate.calldatas,
    description: candidate.description,
  }

  const handleSign = async () => {
    if (!address) return

    try {
      const expirationTimestamp = BigInt(
        Math.floor(Date.now() / 1000) + expirationDays * 24 * 60 * 60
      )

      const sig = await signCandidate({
        proposer: candidate.proposer as `0x${string}`,
        targets: content.targets as `0x${string}`[],
        values: content.values.map((v) => BigInt(v)),
        signatures: content.signatures,
        calldatas: content.calldatas as `0x${string}`[],
        description: content.description,
        expirationTimestamp,
      })

      setSignature(sig)
      setStep("submit")
    } catch (err) {
      console.error("Failed to sign:", err)
    }
  }

  const handleSubmit = async () => {
    if (!signature || !address) return

    try {
      const expirationTimestamp = BigInt(
        Math.floor(Date.now() / 1000) + expirationDays * 24 * 60 * 60
      )

      const encodedProp = encodeProposalData(
        candidate.proposer as `0x${string}`,
        content.targets as `0x${string}`[],
        content.values.map((v) => BigInt(v)),
        content.signatures,
        content.calldatas as `0x${string}`[],
        content.description
      )

      console.log("[v0] Submitting signature with:", {
        candidateSlug: candidate.slug,
        encodedPropLength: encodedProp.length,
        expirationDays,
      })

      await addSignature({
        signature,
        expirationTimestamp,
        proposer: candidate.proposer as `0x${string}`,
        slug: candidate.slug,
        encodedProp,
        reason,
      })

      console.log("[v0] Signature submitted successfully")
      setStep("done")
      onSuccess?.()
    } catch (err) {
      console.error("[v0] Failed to submit signature:", err)
    }
  }

  const handleClose = () => {
    setStep("sign")
    setSignature(null)
    setReason("")
    onOpenChange(false)
  }

  const error = signError || submitError

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            Sponsor Candidate
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Sign to support this proposal candidate. Your signature helps it reach the threshold needed to go on-chain.
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-300">
              Please connect your wallet to sponsor this candidate.
            </AlertDescription>
          </Alert>
        ) : votingPower === 0 ? (
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-300">
              You need to hold or be delegated at least 1 Noun to sponsor candidates.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {step === "sign" && (
              <>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-400">Your voting power</p>
                  <p className="text-xl font-semibold">{votingPower} {votingPower === 1 ? "vote" : "votes"}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiration">Signature expiration (days)</Label>
                  <Input
                    id="expiration"
                    type="number"
                    min={1}
                    max={365}
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(Number(e.target.value))}
                    className="bg-gray-800 border-gray-700"
                  />
                  <p className="text-xs text-gray-500">
                    Your signature will expire {expirationDays} days from now
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (optional)</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why are you supporting this candidate?"
                    className="bg-gray-800 border-gray-700 min-h-[80px]"
                  />
                </div>
              </>
            )}

            {step === "submit" && (
              <div className="space-y-4">
                <Alert className="bg-green-500/10 border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-300">
                    Signature created! Now submit it to the contract to register your sponsorship.
                  </AlertDescription>
                </Alert>

                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-400">Signature preview</p>
                  <p className="text-xs font-mono break-all text-gray-300">
                    {signature?.slice(0, 42)}...
                  </p>
                </div>
              </div>
            )}

            {step === "done" && (
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-300">
                  Your sponsorship has been submitted successfully! Thank you for supporting this candidate.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-300">
                  {error.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "sign" && isConnected && votingPower > 0 && (
            <Button
              onClick={handleSign}
              disabled={isSigning}
              className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-gray-900 font-semibold"
            >
              {isSigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : (
                "Sign to Sponsor"
              )}
            </Button>
          )}

          {step === "submit" && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isConfirming}
              className="w-full bg-nouns-blue hover:bg-nouns-blue/90"
            >
              {isSubmitting || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isConfirming ? "Confirming..." : "Submitting..."}
                </>
              ) : (
                "Submit Signature"
              )}
            </Button>
          )}

          {step === "done" && (
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
