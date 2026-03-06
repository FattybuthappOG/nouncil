import CreateProposal from "@/components/create-proposal"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create Proposal | Nouncil",
  description: "Create a Nouns DAO proposal candidate",
}

export default function CreatePage() {
  return <CreateProposal />
}
