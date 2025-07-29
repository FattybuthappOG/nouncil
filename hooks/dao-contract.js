import { parseEventLogs } from "viem";
import React from "react";
import { useReadContract, useSimulateContract } from "wagmi";
import { CHAIN_ID, NOUNCIL_CLIENT_ID } from "@/constants/env";
import { unparse as unparseTransactions } from "@/utils/transactions";
import { resolveIdentifier } from "@/contracts";
import { useActions } from "@/store";
import useBlockNumber from "@/hooks/block-number";
import usePublicClient from "@/hooks/public-client";
import { useWallet } from "@/hooks/wallet";
import useRegisterEvent from "@/hooks/register-event";
import { useCurrentVotes } from "@/hooks/token-contract";
import { useWriteContract } from "@/hooks/contract-write";

const { address: contractAddress } = resolveIdentifier("dao");

const getClientId = () => NOUNCIL_CLIENT_ID;

const useRead = ({ enabled = true, ...options }) =>
  useReadContract({
    chainId: CHAIN_ID,
    address: contractAddress,
    ...options,
    query: { enabled },
  });

const useSimulate = ({ enabled = true, ...options }) =>
  useSimulateContract({
    chainId: CHAIN_ID,
    address: contractAddress,
    ...options,
    query: { enabled },
  });

export const useProposalThreshold = () => {
  const { data } = useRead({
    abi: [
      {
        inputs: [],
        name: "proposalThreshold",
        outputs: [{ type: "uint256" }],
        type: "function",
      },
    ],
    functionName: "proposalThreshold",
  });

  return data == null ? null : Number(data);
};

const useLatestProposalId = (accountAddress) => {
  const { data, isSuccess } = useRead({
    abi: [
      {
        inputs: [{ type: "address" }],
        name: "latestProposalIds",
        outputs: [{ type: "uint256" }],
        type: "function",
      },
    ],
    functionName: "latestProposalIds",
    args: [accountAddress],
    enabled: accountAddress != null,
  });

  if (!isSuccess) return undefined;

  return data == null ? null : Number(data);
};

export const useProposalCount = () => {
  const { data, isSuccess } = useRead({
    abi: [
      {
        inputs: [],
        name: "proposalCount",
        outputs: [{ type: "uint256" }],
        type: "function",
      },
    ],
    functionName: "proposalCount",
  });

  return isSuccess ? Number(data) : null;
};

export const useProposalDynamicQuorum = (proposalId) => {
  const { data, isSuccess } = useRead({
    abi: [
      {
        inputs: [{ type: "uint256" }],
        name: "quorumVotes",
        outputs: [{ type: "uint256" }],
        type: "function",
      },
    ],
    functionName: "quorumVotes",
    args: [proposalId],
  });

  if (!isSuccess) return undefined;

  return Number(data);
};

export const useDynamicQuorumParamsAt = (blockNumber) => {
  const { data: quorumParams } = useRead({
    abi: [
      {
        inputs: [{ type: "uint256" }],
        name: "getDynamicQuorumParamsAt",
        outputs: [
          { type: "uint16" },
          { type: "uint16" },
          { type: "uint32" },
        ],
        type: "function",
      },
    ],
    functionName: "getDynamicQuorumParamsAt",
    args: [blockNumber],
    enabled: blockNumber != null,
  });

  if (quorumParams == null) return null;

  return {
    minQuorumVotesBPS: quorumParams[0],
    maxQuorumVotesBPS: quorumParams[1],
    quorumCoefficient: quorumParams[2],
  };
};

export const useCurrentDynamicQuorum = ({ againstVotes = 0 } = {}) => {
  const latestQuorumRef = React.useRef();

  const blockNumber = useBlockNumber({ watch: true, cache: 20_000 });

  const { data: adjustedTotalSupply } = useRead({
    abi: [
      {
        inputs: [],
        name: "adjustedTotalSupply",
        outputs: [{ type: "uint256" }],
        type: "function",
      },
    ],
    functionName: "adjustedTotalSupply",
  });
  const quorumParams = useDynamicQuorumParamsAt(blockNumber);

  const { data, isSuccess } = useRead({
    abi: [
      {
        inputs: [
          { type: "uint256" },
          { type: "uint256" },
          {
            components: [
              { type: "uint16", name: "minQuorumVotesBPS" },
              { type: "uint16", name: "maxQuorumVotesBPS" },
              { type: "uint32", name: "quorumCoefficient" },
            ],
            type: "tuple",
          },
        ],
        name: "dynamicQuorumVotes",
        outputs: [{ type: "uint256" }],
        type: "function",
      },
    ],
    functionName: "dynamicQuorumVotes",
    args: [againstVotes, adjustedTotalSupply, quorumParams],
    enabled: adjustedTotalSupply != null && quorumParams != null,
  });

  React.useEffect(() => {
    if (isSuccess) latestQuorumRef.current = Number(data);
  });

  if (!isSuccess) return latestQuorumRef.current;

  return Number(data);
};
