"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const CreateProposal = dynamic(() => import("@/components/create-proposal"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  ),
})

// Subgraph URLs for fetching candidate data
const SUBGRAPH_URLS = [
  "https://gateway.thegraph.com/api/subgraphs/id/QmZGXxKFDhGDYnb3ZrJBQTaKPoS2QHGBSC4k3uFpQvRXm3",
  "https://api.studio.thegraph.com/query/94029/nouns-subgraph/version/latest",
]

interface CandidateData {
  id: string
  slug: string
  proposer: string
  description: string
  targets: string[]
  values: string[]
  signatures: string[]
  calldatas: string[]
  canceled: boolean
}

async function fetchCandidateBySlug(slug: string): Promise<CandidateData | null> {
  // First try to fetch from API which handles multiple ID formats
  try {
    const apiRes = await fetch(`/api/nouns/candidates?limit=200`)
    if (apiRes.ok) {
      const data = await apiRes.json()
      const candidateNum = parseInt(slug)
      const candidate = data.candidates?.find((c: any) => {
        if (!isNaN(candidateNum)) {
          return c.candidateNumber === candidateNum
        }
        return c.id === slug || c.slug === slug
      })
      
      if (candidate) {
        return {
          id: candidate.id,
          slug: candidate.slug || slug,
          proposer: candidate.proposer,
          description: candidate.description || "",
          targets: candidate.targets || [],
          values: candidate.values?.map((v: any) => v.toString()) || [],
          signatures: candidate.signatures || [],
          calldatas: candidate.calldatas || [],
          canceled: candidate.canceled || false,
        }
      }
    }
  } catch { /* fall through to subgraph */ }

  // Fallback to subgraph
  const query = `
    query GetCandidate($slug: String!) {
      proposalCandidates(where: { slug: $slug }, first: 1) {
        id
        slug
        proposer
        canceled
        latestVersion {
          content {
            title
            description
            targets
            values
            signatures
            calldatas
          }
        }
      }
    }
  `

  for (const url of SUBGRAPH_URLS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { slug } }),
      })
      const data = await response.json()
      const candidate = data?.data?.proposalCandidates?.[0]
      if (candidate) {
        const content = candidate.latestVersion?.content
        return {
          id: candidate.id,
          slug: candidate.slug,
          proposer: candidate.proposer,
          description: content?.description || "",
          targets: content?.targets || [],
          values: content?.values?.map((v: any) => v.toString()) || [],
          signatures: content?.signatures || [],
          calldatas: content?.calldatas || [],
          canceled: candidate.canceled,
        }
      }
    } catch {
      continue
    }
  }
  return null
}

export default function EditCandidatePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [mounted, setMounted] = useState(false)
  const [candidate, setCandidate] = useState<CandidateData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !slug) return

    const loadCandidate = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const data = await fetchCandidateBySlug(slug)
        if (!data) {
          setError("Candidate not found")
          return
        }
        if (data.canceled) {
          setError("This candidate has been canceled and cannot be edited")
          return
        }
        setCandidate(data)
      } catch (err: any) {
        setError(err?.message || "Failed to load candidate")
      } finally {
        setIsLoading(false)
      }
    }

    loadCandidate()
  }, [mounted, slug])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            className="mb-6 gap-2 text-gray-300 hover:text-white"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="bg-[#252540] border border-[#3a3a5a] rounded-lg p-6">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!candidate) {
    return null
  }

  // Extract title from description (first line before newline)
  const titleMatch = candidate.description.match(/^#\s*(.+?)(?:\n|$)/)
  const title = titleMatch ? titleMatch[1].trim() : candidate.description.split("\n")[0]
  const description = titleMatch 
    ? candidate.description.replace(/^#\s*.+?\n/, "").trim()
    : candidate.description

  return (
    <CreateProposal
      editMode="candidate"
      candidateSlug={candidate.slug}
      initialData={{
        title,
        description,
        targets: candidate.targets,
        values: candidate.values,
        signatures: candidate.signatures,
        calldatas: candidate.calldatas,
      }}
    />
  )
}
