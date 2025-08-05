import { GovernanceVotingClient } from "@/components/governance-voting-client"

export default function GovernancePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Governance Voting</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and vote on Ethereum mainnet proposals from contract 0x6f3E6272A167e8AcCb32072d08E0957F9c79223d
          </p>
        </div>
        
        <GovernanceVotingClient />
      </div>
    </div>
  )
}