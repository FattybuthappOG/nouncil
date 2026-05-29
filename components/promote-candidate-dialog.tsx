"use client"

import { useState, useMemo } from "react"
import { useAccount } from "wagmi"
import { useRouter } from "next/navigation"
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
  usePropose,
  useProposalThreshold,
  useVotingPower,
  useActiveProposalId,
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
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { threshold } = useProposalThreshold()
  const { votingPower: proposerVotingPower } = useVotingPower(address)
  const { activeProposalId, isLoading: isLoadingActiveProposal } = useActiveProposalId(address)
  const { proposeBySigs, isSubmitting: isSubmittingBySigs, isConfirming: isConfirmingBySigs, isSuccess: isSuccessBySigs, error: errorBySigs } = useProposeBySigs()
  const { propose, isSubmitting: isSubmittingDirect, isConfirming: isConfirmingDirect, isSuccess: isSuccessDirect, error: errorDirect } = usePropose()

  const [selectedSigners, setSelectedSigners] = useState<Set<string>>(new Set())
  const [promoteMode, setPromoteMode] = useState<"direct" | "with-sigs" | null>(null)

  // Combined states
  const isSubmitting = isSubmittingBySigs || isSubmittingDirect
  const isConfirming = isConfirmingBySigs || isConfirmingDirect
  const isSuccess = isSuccessBySigs || isSuccessDirect
  const error = errorBySigs || errorDirect

  // Get valid signatures
  const validSignatures = useMemo(() => filterValidSignatures(signatures), [signatures])

  // Calculate voting power for selected signatures
  const selectedVotingPower = useMemo(() => {
    return validSignatures
      .filter(sig => selectedSigners.has(sig.signer.id))
      .reduce((total, sig) => total + (sig.signer.nounsRepresented?.length || 0), 0)
  }, [validSignatures, selectedSigners])

  // Total available voting power from sponsors
  const totalSponsorVotingPower = useMemo(() => {
    return validSignatures.reduce(
      (total, sig) => total + (sig.signer.nounsRepresented?.length || 0),
      0
    )
  }, [validSignatures])

  // Check if proposer can propose without sponsors (proposer voting power > threshold)
  const canProposeWithoutSponsors = proposerVotingPower > threshold

  // Check if we can propose with selected sponsors
  const canProposeWithSelectedSponsors = 
    selectedSigners.size > 0 && 
    (proposerVotingPower + selectedVotingPower) > threshold

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

  const handlePromoteWithoutSponsors = async () => {
    setPromoteMode("direct")
    try {
      await propose({
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

  const handlePromoteWithSponsors = async () => {
    if (!canProposeWithSelectedSponsors) return
    setPromoteMode("with-sigs")

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
    setPromoteMode(null)
    onOpenChange(false)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // If user already has an active proposal
  const hasActiveProposal = activeProposalId !== null && activeProposalId !== undefined

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-800 text-white max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Promote to On-Chain Proposal
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create an on-chain proposal from this candidate.
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-300">
              Please connect your wallet to promote this candidate.
            </AlertDescription>
          </Alert>
        ) : isLoadingActiveProposal ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : hasActiveProposal ? (
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-300">
              You already have an active proposal. You may submit a new one when voting for{" "}
              <button
                onClick={() => router.push(`/proposals/${activeProposalId}`)}
                className="underline hover:text-yellow-200"
              >
                Proposal {activeProposalId}
              </button>{" "}
              ends.
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
            {/* Proposer can propose without sponsors */}
            {canProposeWithoutSponsors && (
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-300 space-y-3">
                  <p>
                    Your voting power ({proposerVotingPower}) meets the current proposal threshold ({threshold + 1}).
                    You can propose without sponsors.
                  </p>
                  <Button
                    onClick={handlePromoteWithoutSponsors}
                    disabled={isSubmitting || isConfirming}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSubmitting && promoteMode === "direct" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : isConfirming && promoteMode === "direct" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      "Propose without sponsors"
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Sponsor selection */}
            {validSignatures.length > 0 && (
              <>
                {canProposeWithoutSponsors && (
                  <div className="text-center text-sm text-gray-500">— or propose with sponsors —</div>
                )}

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Selected voting power</span>
                    <span className={canProposeWithSelectedSponsors ? "text-green-400" : "text-gray-300"}>
                      {proposerVotingPower} + {selectedVotingPower} = {proposerVotingPower + selectedVotingPower} / {threshold + 1}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        canProposeWithSelectedSponsors ? "bg-green-500" : "bg-nouns-blue"
                      }`}
                      style={{
                        width: `${Math.min(100, ((proposerVotingPower + selectedVotingPower) / Math.max(1, threshold + 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Sponsor list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      Sponsors ({validSignatures.length})
                    </span>
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
                    {validSignatures.map((sig) => {
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
                    })}
                  </div>
                </div>

                {!canProposeWithSelectedSponsors && selectedVotingPower > 0 && !canProposeWithoutSponsors && (
                  <Alert className="bg-yellow-500/10 border-yellow-500/30">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-300">
                      Need {(threshold + 1) - (proposerVotingPower + selectedVotingPower)} more votes to reach threshold
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* No valid signatures and can't propose alone */}
            {validSignatures.length === 0 && !canProposeWithoutSponsors && (
              <Alert className="bg-red-500/10 border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-300">
                  Not enough voting power to propose. Your voting power ({proposerVotingPower}) plus sponsor votes (0) 
                  does not meet the threshold ({threshold + 1}).
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
          ) : hasActiveProposal ? (
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          ) : (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleClose} className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">
                Cancel
              </Button>
              {validSignatures.length > 0 && (
                <Button
                  onClick={handlePromoteWithSponsors}
                  disabled={!canProposeWithSelectedSponsors || isSubmitting || isConfirming || !isConnected}
                  className="flex-1 bg-[#4ade80] text-black hover:bg-[#4ade80]/90 font-semibold disabled:opacity-50"
                >
                  {isSubmitting && promoteMode === "with-sigs" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : isConfirming && promoteMode === "with-sigs" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      Promote to Proposal
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
