# Governance Voting Client

A comprehensive voting client that shows Ethereum mainnet proposal data and allows users to vote using the `castRefundableVoteWithReason` function with `clientId` always set to 22.

## Features

### 📊 Real-time Proposal Data
- Fetches live proposal data from Ethereum mainnet contract `0x6f3E6272A167e8AcCb32072d08E0957F9c79223d`
- Shows proposal status (Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed)
- Displays voting results with real-time vote counts and percentages
- Shows proposal deadlines and voting periods

### 🗳️ Smart Voting Interface
- **Three voting options**: For, Against, Abstain
- **Reason field**: Optional text field for explaining vote decisions
- **Client ID 22**: Automatically uses clientId 22 as specified
- **Wallet integration**: ConnectKit for seamless wallet connection
- **Vote validation**: Prevents double voting and voting on closed proposals

### 🔐 Secure Transaction Handling
- Uses the `castRefundableVoteWithReason` function (0x8136730f)
- Real-time transaction status updates
- Etherscan transaction links for verification
- Error handling and user feedback

## Smart Contract Integration

### Contract Address
```
0x6f3E6272A167e8AcCb32072d08E0957F9c79223d
```

### Key Functions Used
- `proposalCount()` - Get total number of proposals
- `state(proposalId)` - Get proposal status
- `proposalVotes(proposalId)` - Get vote counts
- `proposalDeadline(proposalId)` - Get voting deadline
- `hasVoted(proposalId, account)` - Check if user has voted
- `castRefundableVoteWithReason(proposalId, support, reason, clientId)` - Cast vote

### Vote Types
- `0` - Against
- `1` - For  
- `2` - Abstain

## Usage

### Accessing the Voting Client
1. Navigate to `/governance` in your browser
2. Connect your wallet using the ConnectKit button
3. Select a proposal from the proposal selector
4. Review the voting results and proposal details
5. Cast your vote if the proposal is active and you haven't voted yet

### Voting Process
1. **Connect Wallet**: Click "Connect Wallet" and choose your preferred wallet
2. **Select Proposal**: Use the proposal selector buttons to choose which proposal to view/vote on
3. **Review Data**: Check the current voting results, deadline, and proposal status
4. **Cast Vote**: 
   - Click "Cast Your Vote" button
   - Select For, Against, or Abstain
   - Optionally add a reason for your vote
   - Click "Submit Vote"
5. **Confirm Transaction**: Approve the transaction in your wallet
6. **Track Status**: View transaction hash and status updates

## Technical Implementation

### Components
- `GovernanceVotingClient` - Main voting interface component
- `useProposalData` - Hook for fetching proposal data
- `useVoting` - Hook for handling vote transactions
- `useProposalCount` - Hook for getting total proposal count

### Environment Variables Required
```env
NEXT_PUBLIC_ALCHEMY_ID=your_alchemy_api_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### Dependencies
- `wagmi` - Ethereum React hooks
- `viem` - TypeScript Ethereum library  
- `connectkit` - Wallet connection UI
- `@tanstack/react-query` - Data fetching
- `date-fns` - Date formatting

## Security Features

### Client ID Enforcement
The `clientId` parameter is hardcoded to `22` and cannot be changed by users, ensuring consistency with requirements.

### Vote Validation
- Checks if proposal is in active state before allowing votes
- Prevents double voting by checking `hasVoted` status
- Validates wallet connection before showing voting interface

### Transaction Safety
- Uses typed contract interactions via wagmi/viem
- Shows transaction hashes for verification
- Provides error handling and user feedback

## UI/UX Features

### Responsive Design
- Mobile-friendly interface
- Dark/light mode support
- Progress bars for voting results
- Loading states and error handling

### Real-time Updates
- Live proposal data fetching
- Automatic refresh after successful votes
- Real-time transaction status updates

### User Feedback
- Clear voting status indicators
- Transaction confirmation links
- Error messages and loading states
- Vote submission progress tracking

## Development

### File Structure
```
components/
  ├── governance-voting-client.tsx    # Main voting interface
  └── web3-provider.tsx              # Web3 context provider

hooks/
  ├── useProposalData.ts             # Proposal data fetching
  ├── useVoting.ts                   # Vote transaction handling
  └── useProposalCount.ts            # Proposal count fetching

lib/
  ├── contracts.ts                   # Contract ABI and addresses
  └── constants.ts                   # App constants

app/
  └── governance/
      └── page.tsx                   # Governance page
```

### Adding New Features
1. Contract functions can be added to `lib/contracts.ts`
2. New hooks can be created in the `hooks/` directory
3. UI components follow the existing design system
4. All voting logic uses the `clientId: 22` requirement

## Troubleshooting

### Common Issues
1. **Wallet not connecting**: Check MetaMask or other wallet extension is installed
2. **Transaction failing**: Ensure you have enough ETH for gas fees
3. **Proposal not loading**: Verify you're connected to Ethereum mainnet
4. **Already voted error**: Check if you've already voted on this proposal

### Support
- Check Etherscan for transaction details
- Review browser console for error messages  
- Ensure wallet is connected to Ethereum mainnet
- Verify sufficient ETH balance for gas fees

## Links
- Contract on Etherscan: https://etherscan.io/address/0x6f3E6272A167e8AcCb32072d08E0957F9c79223d
- Function Signature: `castRefundableVoteWithReason` (0x8136730f)