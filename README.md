# Nouncil Governance Dashboard

A comprehensive governance dashboard for viewing and voting on Ethereum mainnet proposals from the Nouns DAO contract.

## Features

- **Real-time Proposal Data**: Fetches live proposal data from Ethereum mainnet
- **Wallet Connection**: ConnectKit integration for seamless wallet connection
- **Voting Interface**: Vote on proposals using `castRefundableVoteWithReason` with clientId: 22
- **Live Updates**: Real-time voting results and proposal status
- **Responsive Design**: Mobile-friendly interface with dark/light mode support

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Alchemy API Key for Ethereum mainnet
NEXT_PUBLIC_ALCHEMY_ID=your_alchemy_api_key_here

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

### Getting API Keys

1. **Alchemy API Key**: 
   - Sign up at [alchemy.com](https://alchemy.com)
   - Create a new app for Ethereum mainnet
   - Copy the API key

2. **WalletConnect Project ID**:
   - Sign up at [cloud.walletconnect.com](https://cloud.walletconnect.com)
   - Create a new project
   - Copy the project ID

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Voting Function

The application uses the `castRefundableVoteWithReason` function (0x8136730f) from the DAO governance contract with the following parameters:

- **Contract Address**: `0x6f3E6272A167e8AcCb32072d08E0957F9c79223d`
- **Function**: `castRefundableVoteWithReason(proposalId, support, reason, clientId)`
- **Client ID**: Always set to `22` as specified
- **Support Values**: 
  - `0` = Against
  - `1` = For  
  - `2` = Abstain

## Usage

1. Navigate to the governance page
2. Connect your wallet using the ConnectKit button
3. Select a proposal to view details and voting results
4. Cast your vote if the proposal is active and you haven't voted yet
5. Add an optional reason for your vote
6. Confirm the transaction in your wallet

## Contract Integration

The dashboard integrates with the Nouns DAO governance contract on Ethereum mainnet, providing real-time access to proposal data and voting functionality.
