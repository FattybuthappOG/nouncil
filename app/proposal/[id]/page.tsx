"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import dynamic from "next/dynamic"

const translations = {
  en: {
    back: "Back",
    proposer: "Proposer",
    sponsors: "Sponsors",
    viewOnEtherscan: "View on Etherscan",
    votingResults: "Voting Results",
    for: "For",
    against: "Against",
    abstain: "Abstain",
    quorumProgress: "Quorum Progress",
    castYourVote: "Cast your vote:",
    voting: "Voting",
    change: "Change",
    reasonForVote: "Reason for vote (optional but encouraged):",
    explainYourVote: "Explain your vote reasoning...",
    submitVote: "Submit Vote",
    submittingVote: "Submitting Vote...",
    votingClosed: "Voting is closed",
    votingStarts: "Voting starts in",
    votingEnds: "Voting ends in",
    days: "days",
    hours: "hours",
    minutes: "minutes",
    description: "Description",
    transactionSimulator: "Transaction Simulator",
    connectToVote: "Connect wallet to vote",
    activity: "Activity",
    loadingVotes: "Loading votes...",
    noVotesYet: "No votes yet",
  },
  zh: {
    back: "返回",
    proposer: "提议者",
    sponsors: "赞助者",
    viewOnEtherscan: "在 Etherscan 上查看",
    votingResults: "投票结果",
    for: "赞成",
    against: "反对",
    abstain: "弃权",
    quorumProgress: "法定人数进度",
    castYourVote: "投出您的票：",
    voting: "投票中",
    change: "更改",
    reasonForVote: "投票理由（可选但建议填写）：",
    explainYourVote: "解释您的投票理由...",
    submitVote: "提交投票",
    submittingVote: "正在提交投票...",
    votingClosed: "投票已关闭",
    votingStarts: "投票开始于",
    votingEnds: "投票结束于",
    days: "天",
    hours: "小时",
    minutes: "分钟",
    description: "描述",
    transactionSimulator: "交易模拟器",
    connectToVote: "连接钱包以投票",
    activity: "活动",
    loadingVotes: "加载投票...",
    noVotesYet: "暂无投票",
  },
  es: {
    back: "Volver",
    proposer: "Proponente",
    sponsors: "Patrocinadores",
    viewOnEtherscan: "Ver en Etherscan",
    votingResults: "Resultados de Votación",
    for: "A favor",
    against: "En contra",
    abstain: "Abstención",
    quorumProgress: "Progreso del Quórum",
    castYourVote: "Emite tu voto:",
    voting: "Votando",
    change: "Cambiar",
    reasonForVote: "Razón del voto (opcional pero recomendado):",
    explainYourVote: "Explica tu razonamiento de voto...",
    submitVote: "Enviar Voto",
    submittingVote: "Enviando Voto...",
    votingClosed: "La votación está cerrada",
    votingStarts: "La votación comienza en",
    votingEnds: "La votación termina en",
    days: "días",
    hours: "horas",
    minutes: "minutos",
    description: "Descripción",
    transactionSimulator: "Simulador de Transacciones",
    connectToVote: "Conecta tu billetera para votar",
    activity: "Actividad",
    loadingVotes: "Cargando votos...",
    noVotesYet: "No hay votos aún",
  },
}

type LanguageCode = keyof typeof translations

const ProposalContent = dynamic(() => import("@/components/proposal-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#1a1a2e] p-6">
      <div className="max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-[#252540] rounded w-3/4" />
        <div className="h-64 bg-[#252540] rounded" />
      </div>
    </div>
  ),
})

export default function ProposalDetailPage() {
  const params = useParams()
  const [mounted, setMounted] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    setMounted(true)
    const savedDarkMode = localStorage.getItem("nouncil-dark-mode")
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === "true")
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      if (isDarkMode) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }, [isDarkMode, mounted])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] p-6">
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-[#252540] rounded w-3/4" />
          <div className="h-64 bg-[#252540] rounded" />
        </div>
      </div>
    )
  }

  return <ProposalContent params={params as { id: string }} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
}
