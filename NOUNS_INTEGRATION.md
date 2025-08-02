# Nouns DAO Integration

This project now integrates with the [Nouns DAO](https://nouns.wtf) to display real proposals and enable voting functionality.

## Features

### 1. Real-Time Proposal Data
- Fetches live proposals from the Nouns DAO subgraph
- Displays proposal titles, descriptions, and voting statistics
- Shows real-time vote counts and percentages
- Displays recent votes with voter addresses and reasons

### 2. Voting Functionality
- Connect your wallet to vote on active proposals
- Vote "For" or "Against" proposals
- Real-time voting power display
- Integration with Nouns SDK for contract interactions

### 3. Proposal Status Tracking
- Active proposals with voting buttons
- Defeated, executed, and expired proposals
- Visual status indicators with color coding

## Components

### `useNounsProposals` Hook
```typescript
import { useNounsProposals } from "@/hooks/useNounsProposals"

const { proposals, loading, error } = useNounsProposals(10, 0)
```

**Features:**
- Fetches proposals from Nouns DAO subgraph
- Pagination support with `first` and `skip` parameters
- Error handling and loading states
- TypeScript interfaces for type safety

### `useNounsSDK` Hook
```typescript
import { useNounsSDK } from "@/hooks/useNounsSDK"

const { vote, getVotingPower, isLoading } = useNounsSDK()
```

**Features:**
- Integration with Nouns SDK for contract interactions
- Voting functionality with proposal state validation
- Voting power calculation
- Error handling for contract calls

### `NounsProposalCard` Component
Displays individual proposals with:
- Proposal metadata (title, description, status)
- Voting statistics and progress bars
- Recent votes with voter information
- Voting buttons for active proposals

### `VotingPowerDisplay` Component
Shows user's voting power and connection status:
- Real-time voting power calculation
- Connection status indicators
- Helpful messages for users without voting power

## Usage

### Basic Integration
```typescript
import { useNounsProposals } from "@/hooks/useNounsProposals"
import { NounsProposalCard } from "@/components/nouns-proposal-card"

function MyComponent() {
  const { proposals, loading, error } = useNounsProposals(10, 0)
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      {proposals.map(proposal => (
        <NounsProposalCard
          key={proposal.id}
          proposal={proposal}
          isDarkMode={isDarkMode}
        />
      ))}
    </div>
  )
}
```

### Voting Integration
```typescript
import { useNounsSDK } from "@/hooks/useNounsSDK"

function VotingComponent() {
  const { vote, isLoading } = useNounsSDK()
  
  const handleVote = async (proposalId: string, support: number) => {
    try {
      await vote(proposalId, support, "I support this proposal")
      console.log("Vote submitted successfully")
    } catch (error) {
      console.error("Voting error:", error)
    }
  }
  
  return (
    <button 
      onClick={() => handleVote("123", 1)}
      disabled={isLoading}
    >
      Vote For
    </button>
  )
}
```

## Data Sources

### Nouns DAO Subgraph
- **Endpoint**: `https://api.thegraph.com/subgraphs/name/nounsdao/nouns-subgraph`
- **Data**: Proposals, votes, voting power, proposal states
- **Real-time**: Updates automatically as new proposals and votes are created

### Nouns SDK
- **Package**: `@nouns/sdk`
- **Functions**: Voting, proposal state checking, voting power calculation
- **Contracts**: Nouns DAO Proxy and Nouns Token contracts

## Configuration

### Contract Addresses
The integration uses the official Nouns DAO contracts on Ethereum mainnet:
- **Nouns DAO Proxy**: `0x6f3E6272A167e8AcCb32072d08E0957F9c79223d`
- **Nouns Token**: `0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03`

### Environment Variables
No additional environment variables are required. The integration uses public endpoints and contracts.

## Error Handling

The integration includes comprehensive error handling:
- Network errors when fetching from subgraph
- Contract interaction errors
- Wallet connection errors
- Proposal state validation errors

All errors are logged to console and displayed to users with helpful messages.

## Future Enhancements

Potential improvements for the integration:
1. **Proposal Creation**: Allow users to create new proposals
2. **Delegation**: Support for vote delegation
3. **Notifications**: Real-time notifications for proposal updates
4. **Advanced Filtering**: Filter proposals by status, date, or voter
5. **Proposal Details**: Detailed proposal pages with full history
6. **Multi-chain Support**: Support for Nouns DAO on other networks

## Troubleshooting

### Common Issues

1. **"Failed to fetch proposals"**
   - Check internet connection
   - Verify subgraph endpoint is accessible
   - Check browser console for detailed errors

2. **"SDK not initialized"**
   - Ensure wallet is connected
   - Check if Nouns SDK is properly installed
   - Verify contract addresses are correct

3. **"Proposal is not active for voting"**
   - Only active proposals can be voted on
   - Check proposal status before attempting to vote
   - Ensure voting period hasn't ended

4. **"Insufficient voting power"**
   - Users need Nouns tokens to vote
   - Check token balance and delegation status
   - Ensure tokens are not delegated to another address

### Debug Mode
Enable debug logging by adding to your component:
```typescript
const { proposals, loading, error } = useNounsProposals(10, 0)
console.log('Proposals:', proposals)
console.log('Loading:', loading)
console.log('Error:', error)
```

## Contributing

To contribute to the Nouns DAO integration:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Resources

- [Nouns DAO Website](https://nouns.wtf)
- [Nouns DAO Documentation](https://docs.nouns.wtf)
- [Nouns SDK Documentation](https://github.com/nounsDAO/nouns-monorepo/tree/master/packages/nouns-sdk)
- [Nouns Subgraph](https://thegraph.com/hosted-service/subgraph/nounsdao/nouns-subgraph) 