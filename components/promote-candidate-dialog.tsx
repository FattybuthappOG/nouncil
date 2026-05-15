"use client"

import { useState, useMemo } from "react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertCircle, Rocket, Users } from "lucide-react"
import {
  useProposeBySigs,
  useProposalThreshold,
  filterValidSignatures,
  type CandidateSignature,
  type ProposalCandidate,
} from "@/hooks/useSponsor"

interface PromoteCandidateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: ProposalCandidate
  signatures: CandidateSignature[]
  onSuccess?: () => void
}

export function PromoteCandidateDialog({
  open,
  onOpenChange,
  candidate,
  signatures,
  onSuccess,
}: PromoteCandidateDialogProps) {
  const { isConnected } = useAccount()
  const { threshold } = useProposalThreshold()
  const { proposeBySigs, isSubmitting, isConfirming, isSuccess, error } = useProposeBySigs()

  const [selectedSigners, setSelectedSigners] = useState<Set<string>>(new Set())

  // Get valid signatures
  const validSignatures = useMemo(() => filterValidSignatures(signatures), [signatures])

  // Calculate voting power for selected signatures
  const selectedVotingPower = useMemo(() => {
    return validSignatures
      .filter(sig => selectedSigners.has(sig.signer.id))
      .reduce((total, sig) => total + (sig.signer.nounsRepresented?.length || 0), 0)
  }, [validSignatures, selectedSigners])

  // Total available voting power
  const totalAvailableVotingPower = useMemo(() => {
    return validSignatures.reduce(
      (total, sig) => total + (sig.signer.nounsRepresented?.length || 0),
      0
    )
  }, [validSignatures])

  // Check if we have enough voting power
  const hasEnoughVotingPower = selectedVotingPower >= threshold

  // Get the latest version's content or fall back to root level
  const content = candidate.latestVersion?.content || {
    targets: candidate.targets,
    values: candidate.values,
    signatures: candidate.signatures,
    calldatas: candidate.calldatas,
    description: candidate.description,
  }

  const toggleSigner = (signerId: string) => {
    setSelectedSigners(prev => {
      const next = new Set(prev)
      if (next.has(signerId)) {
        next.delete(signerId)
      } else {
        next.add(signerId)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedSigners(new Set(validSignatures.map(sig => sig.signer.id)))
  }

  const handlePromote = async () => {
    if (!hasEnoughVotingPower) return

    try {
      // Build proposer signatures array
      const proposerSignatures = validSignatures
        .filter(sig => selectedSigners.has(sig.signer.id))
        .map(sig => ({
          sig: sig.sig as `0x${string}`,
          signer: sig.signer.id as `0x${string}`,
          expirationTimestamp: BigInt(sig.expirationTimestamp),
        }))

      await proposeBySigs({
        proposerSignatures,
        targets: content.targets as `0x${string}`[],
        values: content.values.map(v => BigInt(v)),
        signatures: content.signatures,
        calldatas: content.calldatas as `0x${string}`[],
        description: content.description,
      })

      onSuccess?.()
    } catch (err) {
      console.error("Failed to promote candidate:", err)
    }
  }

  const handleClose = () => {
    setSelectedSigners(new Set())
    onOpenChange(false)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-800 text-white max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Promote to On-Chain Proposal
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Select sponsors whose signatures will be used to create the on-chain proposal.
            You need at least {threshold} votes to reach the proposal threshold.
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-300">
              Please connect your wallet to promote this candidate.
            </AlertDescription>
          </Alert>
        ) : isSuccess ? (
          <Alert className="bg-green-500/10 border-green-500/30">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-300">
              Proposal created successfully! The candidate is now an on-chain proposal.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Selected voting power</span>
                <span className={hasEnoughVotingPower ? "text-green-400" : "text-gray-300"}>
                  {selectedVotingPower} / {threshold}
                </span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    hasEnoughVotingPower ? "bg-green-500" : "bg-nouns-blue"
                  }`}
                  style={{
                    width: `${Math.min(100, (selectedVotingPower / Math.max(1, threshold)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Sponsor list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Sponsors ({validSignatures.length})
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Select all
                </Button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-800 rounded-lg p-2">
                {validSignatures.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No valid signatures yet
                  </p>
                ) : (
                  validSignatures.map((sig) => {
                    const votes = sig.signer.nounsRepresented?.length || 0
                    const isSelected = selectedSigners.has(sig.signer.id)
                    const expDate = new Date(Number(sig.expirationTimestamp) * 1000)

                    return (
                      <label
                        key={sig.signer.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? "bg-gray-800" : "hover:bg-gray-800/50"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSigner(sig.signer.id)}
                          className="border-gray-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {formatAddress(sig.signer.id)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {votes} {votes === 1 ? "vote" : "votes"}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            Expires {expDate.toLocaleDateString()}
                          </p>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            {!hasEnoughVotingPower && selectedVotingPower > 0 && (
              <Alert className="bg-yellow-500/10 border-yellow-500/30">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-300">
                  Need {threshold - selectedVotingPower} more votes to reach threshold
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
          {isSuccess ? (
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          ) : (
            <Button
              onClick={handlePromote}
              disabled={!hasEnoughVotingPower || isSubmitting || isConfirming || !isConnected}
              className="w-full bg-nouns-blue hover:bg-nouns-blue/90 disabled:opacity-50"
            >
              {isSubmitting || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isConfirming ? "Confirming..." : "Creating Proposal..."}
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Create On-Chain Proposal
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper component for Label since we don't have it imported
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>
}
