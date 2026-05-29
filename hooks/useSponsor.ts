"use client"

import { useCallback, useState } from "react"
import { useSignTypedData, useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount, useChainId, useSwitchChain } from "wagmi"
import { keccak256, encodeAbiParameters, encodePacked, stringToBytes } from "viem"
import { GOVERNOR_CONTRACT } from "@/lib/contracts"

// Nouns DAO is on Ethereum mainnet (chain 1)
const NOUNS_CHAIN_ID = 1

// Nouncil client ID
const CLIENT_ID = 22

// NounsDAOData contract for adding signatures
const NOUNS_DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365" as `0x${string}`

// Nouns Token contract for voting power
const NOUNS_TOKEN = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" as `0x${string}`

// ABI for addSignature function
const ADD_SIGNATURE_ABI = [
  {
    inputs: [
      { name: "sig", type: "bytes" },
      { name: "expirationTimestamp", type: "uint256" },
      { name: "proposer", type: "address" },
      { name: "slug", type: "string" },
      { name: "proposalIdToUpdate", type: "uint256" },
      { name: "encodedProp", type: "bytes" },
      { name: "reason", type: "string" },
    ],
    name: "addSignature",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

// ABI for Nouns token voting power
const NOUNS_TOKEN_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getCurrentVotes",
    outputs: [{ name: "", type: "uint96" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// EIP-712 Types for signing proposals
const PROPOSAL_TYPES = {
  Proposal: [
    { name: "proposer", type: "address" },
    { name: "targets", type: "address[]" },
    { name: "values", type: "uint256[]" },
    { name: "signatures", type: "string[]" },
    { name: "calldatas", type: "bytes[]" },
    { name: "description", type: "string" },
    { name: "expiry", type: "uint256" },
  ],
} as const

// EIP-712 Types for signing proposal updates
const UPDATE_PROPOSAL_TYPES = {
  UpdateProposal: [
    { name: "proposalId", type: "uint256" },
    { name: "proposer", type: "address" },
    { name: "targets", type: "address[]" },
    { name: "values", type: "uint256[]" },
    { name: "signatures", type: "string[]" },
    { name: "calldatas", type: "bytes[]" },
    { name: "description", type: "string" },
    { name: "expiry", type: "uint256" },
  ],
} as const

export interface CandidateSignature {
  sig: string
  signer: {
    id: string
    nounsRepresented?: { id: string }[]
  }
  expirationTimestamp: string
  canceled: boolean
  reason?: string
}

export interface ProposalCandidate {
  id: string
  slug: string
  proposer: string
  targets: string[]
  values: string[]
  signatures: string[]
  calldatas: string[]
  description: string
  canceled: boolean
  latestVersion?: {
    content?: {
      targets: string[]
      values: string[]
      signatures: string[]
      calldatas: string[]
      description: string
    }
  }
}

/**
 * Hook to get the proposal threshold (minimum votes needed to create a proposal)
 */
export function useProposalThreshold() {
  // Hardcoded threshold of 4 sponsors needed for promotion to on-chain
  return {
    threshold: 4,
    isLoading: false,
    error: null,
  }
}

/**
 * Hook to get the current voting power of an address
 */
export function useVotingPower(address: `0x${string}` | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: NOUNS_TOKEN,
    abi: NOUNS_TOKEN_ABI,
    functionName: "getCurrentVotes",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  return {
    votingPower: data ? Number(data) : 0,
    isLoading,
    error,
  }
}

/**
 * Encode proposal data for the NounsDAOData contract's addSignature function.
 * This matches Camp's calcProposalEncodeData exactly:
 * each array/string field is individually keccak256-hashed before encoding.
 */
export function encodeProposalData(
  proposer: `0x${string}`,
  targets: `0x${string}`[],
  values: bigint[],
  signatures: string[],
  calldatas: `0x${string}`[],
  description: string,
  proposalIdToUpdate: bigint = 0n
): `0x${string}` {
  // Hash each signature string
  const signatureHashes = signatures.map(sig => keccak256(stringToBytes(sig)))
  // Hash each calldata bytes
  const calldataHashes = calldatas.map(cd => keccak256(cd))

  if (proposalIdToUpdate > 0n) {
    return encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "address" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
      ],
      [
        proposalIdToUpdate,
        proposer,
        keccak256(encodePacked(["address[]"], [targets])),
        keccak256(encodePacked(["uint256[]"], [values])),
        keccak256(encodePacked(["bytes32[]"], [signatureHashes])),
        keccak256(encodePacked(["bytes32[]"], [calldataHashes])),
        keccak256(stringToBytes(description)),
      ]
    )
  }

  return encodeAbiParameters(
    [
      { type: "address" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "bytes32" },
    ],
    [
      proposer,
      keccak256(encodePacked(["address[]"], [targets])),
      keccak256(encodePacked(["uint256[]"], [values])),
      keccak256(encodePacked(["bytes32[]"], [signatureHashes])),
      keccak256(encodePacked(["bytes32[]"], [calldataHashes])),
      keccak256(stringToBytes(description)),
    ]
  )
}

/**
 * Hook for signing a proposal candidate using EIP-712 typed data
 */
export function useSignProposalCandidate() {
  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const [error, setError] = useState<Error | null>(null)

  const signCandidate = useCallback(
    async ({
      proposer,
      targets,
      values,
      signatures,
      calldatas,
      description,
      expirationTimestamp,
      proposalIdToUpdate = 0n,
    }: {
      proposer: `0x${string}`
      targets: `0x${string}`[]
      values: bigint[]
      signatures: string[]
      calldatas: `0x${string}`[]
      description: string
      expirationTimestamp: bigint
      proposalIdToUpdate?: bigint
    }) => {
      try {
        setError(null)

        // Ensure wallet is on Ethereum mainnet before signing
        if (chainId !== NOUNS_CHAIN_ID) {
          await switchChainAsync({ chainId: NOUNS_CHAIN_ID })
          // Wait a tick for the chain switch to propagate
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        // Always use NOUNS_CHAIN_ID in the domain, not the current chainId
        // This ensures the signature is valid for mainnet even if chainId state hasn't updated yet
        const domain = {
          name: "Nouns DAO",
          chainId: NOUNS_CHAIN_ID,
          verifyingContract: GOVERNOR_CONTRACT.address,
        } as const

        const message = proposalIdToUpdate > 0n
          ? {
              proposalId: proposalIdToUpdate,
              proposer,
              targets,
              values,
              signatures,
              calldatas,
              description,
              expiry: expirationTimestamp,
            }
          : {
              proposer,
              targets,
              values,
              signatures,
              calldatas,
              description,
              expiry: expirationTimestamp,
            }

        const signature = await signTypedDataAsync({
          domain,
          types: proposalIdToUpdate > 0n ? UPDATE_PROPOSAL_TYPES : PROPOSAL_TYPES,
          primaryType: proposalIdToUpdate > 0n ? "UpdateProposal" : "Proposal",
          message,
        })

        return signature
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to sign"))
        throw err
      }
    },
    [signTypedDataAsync, chainId, switchChainAsync]
  )

  return {
    signCandidate,
    isSigning,
    error,
  }
}

/**
 * Hook for adding a signature to a candidate via NounsDAOData contract
 */
export function useAddSignatureToCandidate() {
  const { writeContractAsync, isPending: isSubmitting } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [error, setError] = useState<Error | null>(null)

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const addSignature = useCallback(
    async ({
      signature,
      expirationTimestamp,
      proposer,
      slug,
      encodedProp,
      reason = "",
      proposalIdToUpdate = 0n,
    }: {
      signature: `0x${string}`
      expirationTimestamp: bigint
      proposer: `0x${string}`
      slug: string
      encodedProp: `0x${string}`
      reason?: string
      proposalIdToUpdate?: bigint
    }) => {
      try {
        setError(null)
        const hash = await writeContractAsync({
          address: NOUNS_DAO_DATA,
          abi: ADD_SIGNATURE_ABI,
          functionName: "addSignature",
          args: [signature, expirationTimestamp, proposer, slug, proposalIdToUpdate || 0n, encodedProp, reason || ""],
        })
        setTxHash(hash)
        return hash
      } catch (err) {
        console.error("addSignature error:", err)
        setError(err instanceof Error ? err : new Error("Failed to submit signature"))
        throw err
      }
    },
    [writeContractAsync]
  )

  return {
    addSignature,
    isSubmitting,
    isConfirming,
    isSuccess,
    txHash,
    error,
  }
}

/**
 * Hook for promoting a candidate to an on-chain proposal using proposeBySigs
 */
export function useProposeBySigs() {
  const { writeContractAsync, isPending: isSubmitting } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [error, setError] = useState<Error | null>(null)

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const proposeBySigs = useCallback(
    async ({
      proposerSignatures,
      targets,
      values,
      signatures,
      calldatas,
      description,
    }: {
      proposerSignatures: Array<{
        sig: `0x${string}`
        signer: `0x${string}`
        expirationTimestamp: bigint
      }>
      targets: `0x${string}`[]
      values: bigint[]
      signatures: string[]
      calldatas: `0x${string}`[]
      description: string
    }) => {
      try {
        setError(null)
        const hash = await writeContractAsync({
          address: GOVERNOR_CONTRACT.address,
          abi: GOVERNOR_CONTRACT.abi,
          functionName: "proposeBySigs",
          args: [
            proposerSignatures,
            targets,
            values,
            signatures,
            calldatas,
            description,
            CLIENT_ID, // Nouncil client ID = 22
          ],
        })
        setTxHash(hash)
        return hash
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to create proposal"))
        throw err
      }
    },
    [writeContractAsync]
  )

  return {
    proposeBySigs,
    isSubmitting,
    isConfirming,
    isSuccess,
    txHash,
    error,
  }
}

/**
 * Calculate total voting power from signatures.
 * Accepts both CandidateSignature[] (from useSponsor) and the flat shape from useCandidateSignatures.
 */
export function calculateTotalVotingPower(signatures: Array<any>): number {
  const now = Math.floor(Date.now() / 1000)

  return signatures
    .filter(sig => !sig.canceled && Number(sig.expirationTimestamp) > now)
    .reduce((total, sig) => {
      // Flat shape from useCandidateSignatures has a `votes` field
      // CandidateSignature shape has signer.nounsRepresented
      const votes =
        typeof sig.votes === "number"
          ? sig.votes
          : sig.signer?.nounsRepresented?.length || 1
      return total + votes
    }, 0)
}

/**
 * Filter valid (non-expired, non-canceled) signatures
 */
export function filterValidSignatures(signatures: Array<any>): any[] {
  const now = Math.floor(Date.now() / 1000)
  return signatures.filter(sig => !sig.canceled && Number(sig.expirationTimestamp) > now)
}

/**
 * Get default expiration timestamp (30 days from now)
 */
export function getDefaultExpiration(): bigint {
  const thirtyDaysInSeconds = 30 * 24 * 60 * 60
  return BigInt(Math.floor(Date.now() / 1000) + thirtyDaysInSeconds)
}

/**
 * Hook for creating a direct on-chain proposal (without sponsor signatures).
 * Only the connected wallet's voting power is used.
 */
export function usePropose() {
  const { writeContractAsync, isPending: isSubmitting } = useWriteContract()
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [error, setError] = useState<Error | null>(null)

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const propose = useCallback(
    async ({
      targets,
      values,
      signatures,
      calldatas,
      description,
    }: {
      targets: `0x${string}`[]
      values: bigint[]
      signatures: string[]
      calldatas: `0x${string}`[]
      description: string
    }) => {
      try {
        setError(null)
        const hash = await writeContractAsync({
          address: GOVERNOR_CONTRACT.address,
          abi: [
            {
              inputs: [
                { name: "targets", type: "address[]" },
                { name: "values", type: "uint256[]" },
                { name: "signatures", type: "string[]" },
                { name: "calldatas", type: "bytes[]" },
                { name: "description", type: "string" },
                { name: "clientId", type: "uint32" },
              ],
              name: "propose",
              outputs: [{ type: "uint256" }],
              stateMutability: "nonpayable",
              type: "function",
            },
          ],
          functionName: "propose",
          args: [targets, values, signatures, calldatas, description, CLIENT_ID],
        })
        setTxHash(hash)
        return hash
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to create proposal"))
        throw err
      }
    },
    [writeContractAsync]
  )

  return {
    propose,
    isSubmitting,
    isConfirming,
    isSuccess,
    txHash,
    error,
  }
}

/**
 * Hook to check if the connected user already has an active proposal.
 * Returns the proposal ID if one exists, null otherwise.
 */
export function useActiveProposalId(address?: `0x${string}`) {
  const { data, isLoading, error } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: [
      {
        inputs: [{ name: "account", type: "address" }],
        name: "latestProposalIds",
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "latestProposalIds",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // If user has a latest proposal, check if it's still active
  const latestProposalId = data ? Number(data) : 0

  const { data: proposalState, isLoading: isLoadingState } = useReadContract({
    address: GOVERNOR_CONTRACT.address,
    abi: GOVERNOR_CONTRACT.abi,
    functionName: "state",
    args: latestProposalId > 0 ? [BigInt(latestProposalId)] : undefined,
    query: { enabled: latestProposalId > 0 },
  })

  // Proposal states: 0=Pending, 1=Active, 2=Canceled, 3=Defeated, 4=Succeeded, 5=Queued, 6=Expired, 7=Executed
  // Active states where user can't create new proposal: 0 (Pending), 1 (Active), 5 (Queued)
  const activeStates = [0, 1, 5]
  const isActive = proposalState !== undefined && activeStates.includes(Number(proposalState))

  return {
    activeProposalId: isActive ? latestProposalId : null,
    isLoading: isLoading || isLoadingState,
    error,
  }
}
