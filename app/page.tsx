import { Web3Provider } from "@/components/web3-provider"
import LiveGovernanceDashboard from "@/components/live-governance-dashboard"

export default function Home() {
  return (
    <Web3Provider>
      <LiveGovernanceDashboard />
    </Web3Provider>
  )
}
