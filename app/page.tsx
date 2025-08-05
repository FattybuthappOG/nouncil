import { LiveGovernanceDashboard } from "@/components/live-governance-dashboard"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div>
      <div className="fixed top-4 right-4 z-50">
        <Link href="/governance">
          <Button variant="outline" className="bg-white/90 backdrop-blur">
            Governance Voting →
          </Button>
        </Link>
      </div>
      <LiveGovernanceDashboard />
    </div>
  )
}
