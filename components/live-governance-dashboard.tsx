"use client"

import { useState, useEffect } from "react"
import { useAccount, useDisconnect, useBalance } from "wagmi"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Moon, Sun, X, Search, Globe, Copy, Menu } from "lucide-react"
import ProposalVotingCard from "./proposal-voting-card"
import CandidateCard from "./candidate-card"
import TreasuryDropdown from "./treasury-dropdown"
import { useProposalIds, useCandidateIds } from "@/hooks/useContractData"
import WalletConnectButton from "./wallet-connect-button" // Import WalletConnect button instead of AppKit
import { useConnect } from "wagmi" // Declare the useConnect variable
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AuctionButton from "./auction-button" // Import AuctionButton component

// Language configuration
const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "bn", name: "বাংলা", flag: "🇧🇩" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
]

// Comprehensive translation dictionary for all UI text
const translations = {
  en: {
    proposals: "Proposals",
    candidates: "Candidates",
    searchProposals: "Search proposals by number or title...",
    searchCandidates: "Search candidates by number or title...",
    showAll: "Show All",
    active: "Active",
    executed: "Executed",
    vetoed: "Vetoed",
    canceled: "Canceled",
    loadMore: "Load 20 More",
    connectWallet: "Connect Wallet",
    treasury: "Treasury",
    learnAboutNouns: "Learn about Nouns",
    generateTogaPFP: "Generate Toga PFP",
    language: "Language",
    joinDiscord: "Join Discord",
    joinCallsThursday: "Join the calls every Thursday in Discord",
    toggleTheme: "Toggle Theme",
    proposer: "Proposer",
    viewOnEtherscan: "View on Etherscan",
    transactionSimulator: "Transaction Simulator",
    votes: "Votes",
    for: "For",
    against: "Against",
    abstain: "Abstain",
    vote: "Vote",
    loadingProposals: "Loading proposals...",
    noProposalsFound: "No proposals found",
    loading: "Loading...",
    noCandidatesFound: "No candidates found",
    filterByStatus: "Filter by Status",
  },
  zh: {
    proposals: "提案",
    candidates: "候选人",
    searchProposals: "按编号或标题搜索提案...",
    searchCandidates: "按编号或标题搜索候选人...",
    showAll: "显示全部",
    active: "活跃",
    executed: "已执行",
    vetoed: "已否决",
    canceled: "已取消",
    loadMore: "加载更多20个",
    connectWallet: "连接钱包",
    treasury: "财政",
    learnAboutNouns: "了解 Nouns",
    generateTogaPFP: "生成 Toga 头像",
    language: "语言",
    joinDiscord: "加入 Discord",
    joinCallsThursday: "每周四在 Discord 参加电话会议",
    toggleTheme: "切换主题",
    proposer: "提议者",
    viewOnEtherscan: "在 Etherscan 上查看",
    transactionSimulator: "交易模拟器",
    votes: "投票",
    for: "赞成",
    against: "反对",
    abstain: "弃权",
    vote: "投票",
    loadingProposals: "正在加载提案...",
    noProposalsFound: "未找到提案",
    loading: "正在加载...",
    noCandidatesFound: "未找到候选人",
    filterByStatus: "按状态过滤",
  },
  es: {
    proposals: "Propuestas",
    candidates: "Candidatos",
    searchProposals: "Buscar propuestas por número o título...",
    searchCandidates: "Buscar candidatos por número o título...",
    showAll: "Mostrar Todo",
    active: "Activo",
    executed: "Ejecutado",
    vetoed: "Vetadas",
    canceled: "Canceladas",
    loadMore: "Cargar 20 Más",
    connectWallet: "Conectar Billetera",
    treasury: "Tesorería",
    learnAboutNouns: "Aprender sobre Nouns",
    generateTogaPFP: "Generar PFP Toga",
    language: "Idioma",
    joinDiscord: "Únete a Discord",
    joinCallsThursday: "Rejoignez les appels tous les jeudis sur Discord",
    toggleTheme: "Cambiar Tema",
    proposer: "Proponente",
    viewOnEtherscan: "Voir en Etherscan",
    transactionSimulator: "Simulateur de Transacciones",
    votes: "Votos",
    for: "A Favor",
    against: "Contre",
    abstain: "Abstención",
    vote: "Votar",
    loadingProposals: "Cargando propuestas...",
    noProposalsFound: "No se encontraron propuestas",
    loading: "Cargando...",
    noCandidatesFound: "No se encontraron candidatos",
    filterByStatus: "Filtrar por Estado",
  },
  hi: {
    proposals: "प्रस्ताव",
    candidates: "उम्मीदवार",
    searchProposals: "संख्या या शीर्षक से प्रस्ताव खोजें...",
    searchCandidates: "संख्या या शीर्षक से उम्मीदवार खोजें...",
    showAll: "सभी दिखाएं",
    active: "सक्रिय",
    executed: "निष्पादित",
    vetoed: "वीटो",
    canceled: "रद्द",
    loadMore: "20 और लोड करें",
    connectWallet: "वॉलेट कनेक्ट करें",
    treasury: "ट्रेजरी",
    learnAboutNouns: "Nouns के बारे में जानें",
    generateTogaPFP: "Toga PFP जेनरेट करें",
    language: "भाषा",
    joinDiscord: "Discord में शामिल हों",
    joinCallsThursday: "हर गुरुवार को Discord में कॉल में शामिल हों",
    toggleTheme: "थीम टॉगल करें",
    proposer: "प्रस्तावक",
    viewOnEtherscan: "Etherscan पर देखें",
    transactionSimulator: "लेनदेन सिमुलेटर",
    votes: "मत",
    for: " के लिए",
    against: " के खिलाफ",
    abstain: "परहेज",
    vote: "वोट",
    loadingProposals: "प्रस्ताव लोड हो रहे हैं...",
    noProposalsFound: "कोई प्रस्ताव नहीं मिला",
    loading: "लोड हो रहा है...",
    noCandidatesFound: "कोई उम्मीदवार नहीं मिला",
    filterByStatus: "स्थिति के आधार पर फ़िल्टर करें",
  },
  ar: {
    proposals: "المقترحات",
    candidates: "المرشحون",
    searchProposals: "البحث عن مقترحات بالرقم أو العنوان...",
    searchCandidates: "البحث عن مرشحين بالرقم أو العنوان...",
    showAll: "عرض الكل",
    active: "نشط",
    executed: "منفذ",
    vetoed: "مرفوضة",
    canceled: "ملغى",
    loadMore: "تحميل 20 أكثر",
    connectWallet: "ربط المحفظة",
    treasury: "الخزانة",
    learnAboutNouns: "تعرف على Nouns",
    generateTogaPFP: "إنشاء صورة Toga",
    language: "اللغة",
    joinDiscord: "انضم إلى Discord",
    joinCallsThursday: "انضم إلى المكالمات كل خميس على Discord",
    toggleTheme: "تبديل السمة",
    proposer: "المقترح",
    viewOnEtherscan: "عرض على Etherscan",
    transactionSimulator: "محاكي المعاملات",
    votes: "الأصوات",
    for: "لصالح",
    against: "ضد",
    abstain: "امتناع",
    vote: "تصويت",
    loadingProposals: "جارٍ التحميل...",
    noProposalsFound: "لم يتم العثور على أي مقترحات",
    loading: "جارٍ التحميل...",
    noCandidatesFound: "لم يتم العثور على أي مرشحين",
    filterByStatus: "تصفية حسب الحالة",
  },
  pt: {
    proposals: "Propostas",
    candidates: "Candidatos",
    searchProposals: "Pesquisar propostas por número ou título...",
    searchCandidates: "Pesquisar candidatos por número ou título...",
    showAll: "Mostrar Tudo",
    active: "Ativo",
    executed: "Executado",
    vetoed: "Vetadas",
    canceled: "Canceladas",
    loadMore: "Carregar Mais 20",
    connectWallet: "Conectar Carteira",
    treasury: "Tesouraria",
    learnAboutNouns: "Saiba sobre Nouns",
    generateTogaPFP: "Gerar PFP Toga",
    language: "Idioma",
    joinDiscord: "Junte-se ao Discord",
    joinCallsThursday: "Participe das chamadas todas as quintas-feiras no Discord",
    toggleTheme: "Alternar Tema",
    proposer: "Proponente",
    viewOnEtherscan: "Ver no Etherscan",
    transactionSimulator: "Simulador de Transações",
    votes: "Votos",
    for: "A Favor",
    against: "Contra",
    abstain: "Abstenção",
    vote: "Votar",
    loadingProposals: "Carregando propostas...",
    noProposalsFound: "Nenhuma proposta encontrada",
    loading: "Carregando...",
    noCandidatesFound: "Nenhum candidato encontrado",
    filterByStatus: "Filtrar por Status",
  },
  bn: {
    proposals: "প্রস্তাব",
    candidates: "প্রার্থী",
    searchProposals: "সংখ্যা বা শিরোনাম দ্বারা প্রস্তাব অনুসন্ধান করুন...",
    searchCandidates: "সংখ্যা বা শিরোনাম দ্বারা প্রার্থী অনুসন্ধান করুন...",
    showAll: "সব দেখান",
    active: "সক্রিয়",
    executed: "সম্পাদিত",
    vetoed: "ভেটো",
    canceled: "বাতিল",
    loadMore: "আরও 20 লোড করুন",
    connectWallet: "ওয়ালেট সংযুক্ত করুন",
    treasury: "ট্রেজারি",
    learnAboutNouns: "Nouns সম্পর্কে জানুন",
    generateTogaPFP: "Toga PFP তৈরি করুন",
    language: "ভাষা",
    joinDiscord: "Discord-এ যোগ দিন",
    joinCallsThursday: "প্রতি বৃহস্পতিবার Discord-এ কলে যোগ দিন",
    toggleTheme: "থিম টগল করুন",
    proposer: "প্রস্তাবক",
    viewOnEtherscan: "Etherscan-এ দেখুন",
    transactionSimulator: "লেনদেন সিমুলেটর",
    votes: "ভোট",
    for: "পক্ষে",
    against: "বিপক্ষে",
    abstain: "বিরত থাকা",
    vote: "ভোট",
    loadingProposals: "প্রস্তাব লোড হচ্ছে...",
    noProposalsFound: "কোনো প্রস্তাব পাওয়া যায়নি",
    loading: "লোড হচ্ছে...",
    noCandidatesFound: "কোনো উম্মীদবার পাওয়া যায়নি",
    filterByStatus: "স্থিতি অনুযায়ী ফিল্টার করুন",
  },
  ru: {
    proposals: "Предложения",
    candidates: "Кандидаты",
    searchProposals: "Искать предложения по номеру или заголовку...",
    searchCandidates: "Искать кандидатов по номеру или заголовку...",
    showAll: "Показать Все",
    active: "Активный",
    executed: "Выполнено",
    vetoed: "Ветированные",
    canceled: "Отменённые",
    loadMore: "Загрузить Еще 20",
    connectWallet: "Подключить Кошелек",
    treasury: "Казна",
    learnAboutNouns: "Узнать о Nouns",
    generateTogaPFP: "Создать PFP Toga",
    language: "Язык",
    joinDiscord: "Присоединиться к Discord",
    joinCallsThursday: "Присоединяйтесь к звонкам каждый четверг на Discord",
    toggleTheme: "Переключить Тему",
    proposer: "Предлагатель",
    viewOnEtherscan: "Посмотреть на Etherscan",
    transactionSimulator: "Симулятор Транзакций",
    votes: "Голоса",
    for: "За",
    against: "Против",
    abstain: "Воздержаться",
    vote: "Голосовать",
    loadingProposals: "Загрузка предложений...",
    noProposalsFound: "Предложений не найдено",
    loading: "Загрузка...",
    noCandidatesFound: "Кандидатов не найдено",
    filterByStatus: "Фильтровать по статусу",
  },
  ja: {
    proposals: "提案",
    candidates: "候補者",
    searchProposals: "番号またはタイトルで提案を検索...",
    searchCandidates: "番号またはタイトルで候補者を検索...",
    showAll: "すべて表示",
    active: "アクティブ",
    executed: "実行済み",
    vetoed: "拒否権",
    canceled: "キャンセル",
    loadMore: "さらに20件読み込む",
    connectWallet: "ウォレットを接続",
    treasury: "財務",
    learnAboutNouns: "Nounsについて学ぶ",
    generateTogaPFP: "Toga PFPを生成",
    language: "言語",
    joinDiscord: "Discordに参加",
    joinCallsThursday: "毎週木曜日にDiscordで通話に参加",
    toggleTheme: "テーマを切り替え",
    proposer: "提案者",
    viewOnEtherscan: "Etherscanで表示",
    transactionSimulator: "トランザクションシミュレーター",
    votes: "投票",
    for: "賛成",
    against: "反対",
    abstain: "棄権",
    vote: "投票",
    loadingProposals: "提案を読み込んでいます...",
    noProposalsFound: "提案が見つかりません",
    loading: "読み込み中...",
    noCandidatesFound: "候補者が見つかりません",
    filterByStatus: "ステータスでフィルター",
  },
  fr: {
    proposals: "Propositions",
    candidates: "Candidats",
    searchProposals: "Rechercher des propositions par numéro ou titre...",
    searchCandidates: "Rechercher des candidats par numéro ou titre...",
    showAll: "Afficher Tout",
    active: "Actif",
    executed: "Exécuté",
    vetoed: "Vetées",
    canceled: "Annulées",
    loadMore: "Charger 20 de Plus",
    connectWallet: "Connecter le Portefeuille",
    treasury: "Trésorerie",
    learnAboutNouns: "En savoir plus sur Nouns",
    generateTogaPFP: "Générer PFP Toga",
    language: "Langue",
    joinDiscord: "Rejoindre Discord",
    joinCallsThursday: "Rejoignez les appels tous les jeudis sur Discord",
    toggleTheme: "Changer le Thème",
    proposer: "Proposant",
    viewOnEtherscan: "Voir sur Etherscan",
    transactionSimulator: "Simulateur de Transactions",
    votes: "Votes",
    for: "Pour",
    against: "Contre",
    abstain: "Abstention",
    vote: "Voter",
    loadingProposals: "Chargement des propositions...",
    noProposalsFound: "Aucune proposition trouvée",
    loading: "Chargement...",
    noCandidatesFound: "Aucun candidat trouvé",
    filterByStatus: "Filtrer par Statut",
  },
}

type LanguageCode = keyof typeof translations
type SearchResult = { id: string; description?: string; slug?: string; latestVersion?: { content: { title: string } } }

export default function LiveGovernanceDashboard() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] p-6">
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-[#252540] rounded w-3/4" />
          <div className="h-4 bg-[#252540] rounded w-1/2" />
          <div className="h-64 bg-[#252540] rounded" />
        </div>
      </div>
    )
  }

  return <LiveGovernanceDashboardContent />
}

function LiveGovernanceDashboardContent() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const router = useRouter()
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<"proposals" | "candidates">("proposals")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [displayedProposals, setDisplayedProposals] = useState(20)
  const [displayedCandidates, setDisplayedCandidates] = useState(20)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "executed" | "vetoed" | "canceled">("all")
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en")
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)

  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connectors, connect } = useConnect()

  const { data: balanceData } = useBalance({
    address: "0x0BC3807Ec262cB779b38D65b38158acC3bfedE10",
    query: { enabled: mounted },
  })

  const balance = balanceData
    ? `${Number(balanceData.value / BigInt(10 ** 18)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ETH`
    : "0 ETH"

  const t = (key: string) => {
    return translations[selectedLanguage]?.[key] || translations.en[key] || key
  }

  const copyNounsSymbol = () => {
    navigator.clipboard.writeText("⌐◨-◨")
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const proposalIdsData = useProposalIds(displayedProposals, statusFilter)
  const { proposalIds, isLoading: proposalIdsLoading, totalCount } = proposalIdsData

  const candidateIdsData = useCandidateIds(displayedCandidates)

  const safeCandidates = candidateIdsData?.candidates || []
  const totalCandidates = candidateIdsData?.totalCount || 0

  const hasMoreCandidates = displayedCandidates < totalCandidates

  const hasMoreProposals = displayedProposals < totalCount

  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("nouncil-dark-mode")
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === "true")
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("nouncil-dark-mode", String(isDarkMode))
    document.documentElement.classList.toggle("dark", isDarkMode)
  }, [isDarkMode])

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (debouncedSearch.length >= 2) {
        setIsSearching(true)
        try {
          const searchType = activeTab === "proposals" ? "proposals" : "candidates"
          const isNumber = /^\d+$/.test(debouncedSearch)

          let query
          if (searchType === "proposals") {
            if (isNumber) {
              query = `query { proposal(id: "${debouncedSearch}") { id description } }`
            } else {
              query = `query { proposals(first: 10, where: { description_contains_nocase: "${debouncedSearch}" }, orderBy: createdTimestamp, orderDirection: desc) { id description } }`
            }
          } else {
            // For candidates, search in both slug and title
            if (isNumber) {
              query = `query { 
                proposalCandidates(first: 1000, orderBy: createdTimestamp, orderDirection: desc) { 
                  id 
                  slug 
                  latestVersion { 
                    content { 
                      title 
                    } 
                  } 
                } 
              }`
            } else {
              query = `query { 
                proposalCandidates(
                  first: 1000, 
                  orderBy: createdTimestamp, 
                  orderDirection: desc
                ) { 
                  id 
                  slug 
                  latestVersion { 
                    content { 
                      title 
                    } 
                  } 
                } 
              }`
            }
          }

          const SUBGRAPH_URLS = [
            "https://gateway.thegraph.com/api/subgraphs/id/QmZGXxKFDhGDYnb3ZrJBQTaKPoS2QHGBSC4k3uFpQvRXm3",
            "https://api.studio.thegraph.com/query/94029/nouns-subgraph/version/latest",
          ]
          let data: any = null
          for (const url of SUBGRAPH_URLS) {
            try {
              const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
              })
              if (!response.ok) continue
              const json = await response.json()
              if (json.errors || !json.data) continue
              data = json.data
              break
            } catch { continue }
          }

          if (searchType === "proposals") {
            const results = isNumber && data?.proposal ? [data.proposal] : data?.proposals || []
            setSearchResults(results)
          } else {
            let candidates = data?.proposalCandidates || []
            if (isNumber) {
              const searchNumber = Number.parseInt(debouncedSearch)
              const index = totalCandidates - searchNumber
              if (index >= 0 && index < candidates.length) {
                candidates = [candidates[index]]
              } else {
                candidates = []
              }
            } else {
              candidates = candidates
                .filter((candidate: any) => {
                  const slug = candidate.slug?.toLowerCase() || ""
                  const title = candidate.latestVersion?.content?.title?.toLowerCase() || ""
                  const searchLower = debouncedSearch.toLowerCase()
                  return slug.includes(searchLower) || title.includes(searchLower)
                })
                .slice(0, 10) // Limit to 10 results
            }
            setSearchResults(candidates)
          }
        } catch (error) {
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [debouncedSearch, activeTab, totalCandidates])

  useEffect(() => {
    setDisplayedProposals(20)
  }, [statusFilter])

  const handleSelectProposal = (id: string) => {
    router.push(`/proposal/${id}`)
    setSearchQuery("")
    setSearchResults([])
  }

  const handleSelectCandidate = (id: string) => {
    const candidateIndex = safeCandidates.findIndex((c) => c.id === id)
    if (candidateIndex !== -1) {
      const candidateNumber = totalCandidates - candidateIndex
      router.push(`/candidate/${candidateNumber}`)
    }
    setSearchQuery("")
    setSearchResults([])
  }

  const loadMoreCandidates = () => {
    setDisplayedCandidates((prev) => prev + 20)
  }

  const loadMoreProposals = () => {
    setDisplayedProposals((prev) => prev + 20)
  }

  const searchPlaceholder = activeTab === "proposals" ? t("searchProposals") : t("searchCandidates")

  // Translation API helper function for dynamic content
  const translateText = async (text: string, targetLang: LanguageCode): Promise<string> => {
    if (targetLang === "en" || !text) return text

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang }),
      })
      const data = await response.json()
      return data.translatedText || text
    } catch (error) {
      return text
    }
  }

  useEffect(() => {
    const savedLanguage = localStorage.getItem("nouns-language") as LanguageCode
    if (savedLanguage && translations[savedLanguage]) {
      setSelectedLanguage(savedLanguage)
    }
  }, [])

  const handleLanguageChange = (lang: LanguageCode) => {
    setSelectedLanguage(lang)
    localStorage.setItem("nouns-language", lang)
  }

  const handleWalletClick = () => {
    if (isConnected) {
      disconnect()
    } else {
      // Connect with first available connector (injected wallet)
      if (connectors[0]) {
        connect({ connector: connectors[0] })
      }
    }
  }

  const filteredProposalIds = proposalIds

  const handleStatusFilterChange = (filter: "all" | "active" | "executed" | "vetoed" | "canceled") => {
    setStatusFilter(filter)
    setDisplayedProposals(20)
  }

  return (
    <div className={`min-h-screen overflow-x-hidden ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <header
        className={`${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } border-b sticky top-0 z-50 backdrop-blur`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between relative">
          {/* Left section - Auction Button */}
          <div className="flex items-center gap-3 flex-1">
            <AuctionButton isDarkMode={isDarkMode} />
          </div>

          {/* Center section - Logo (absolute positioned for true center) */}
          <Link href="/" className="absolute left-1/2 transform -translate-x-1/2 flex items-center hover:opacity-80 transition-opacity">
            <img src="/images/logo-nouncil.webp" alt="Nouncil" className="h-10 sm:h-12 w-auto" />
          </Link>

          {/* Right section - Wallet & Menu */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
            {/* WalletConnectButton - compact on mobile */}
            <span className="hidden sm:inline-block"><WalletConnectButton /></span>
            <span className="sm:hidden"><WalletConnectButton compact /></span>

            <button
              onClick={() => setShowMenu(true)}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {showMenu && (
          <div className="fixed inset-0 z-[100]" onClick={() => setShowMenu(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Menu Panel */}
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute right-0 top-0 min-h-full w-full sm:w-96 ${
                isDarkMode ? "bg-gray-900" : "bg-white"
              } shadow-2xl overflow-y-auto`}
            >
              <div className="p-4 md:p-6 min-h-screen overflow-x-hidden">
                {/* Menu Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold"></h2>
                  <button
                    onClick={() => setShowMenu(false)}
                    className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Menu Items */}
                <div className="space-y-3">
                  {/* Discord - Join Calls (First option) */}
                  <a
                    href="https://discord.gg/tnyXJZsGnq"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMenu(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                    }`}
                  >
                    <img src="/images/discord-logo.svg" alt="Discord" className="w-6 h-6" />
                    <span className="font-medium">{t("joinCallsThursday")}</span>
                  </a>

                  {/* Treasury */}
                  <TreasuryDropdown balance={balance} isDarkMode={isDarkMode} />

                  {/* Learn about Nouns */}
                  <a
                    href="https://nouns.world/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMenu(false)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${
                      isDarkMode
                        ? "bg-gray-800 hover:bg-gray-700 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    }`}
                  >
                    <img src="/images/nounsworld.gif" alt="Nouns World" className="w-6 h-6 rounded" />
                    <span className="font-medium">{t("learnAboutNouns")}</span>
                  </a>

                  {/* Generate Toga PFP */}
                  <a
                    href="https://togatime.cloudnouns.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMenu(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                    }`}
                  >
                    <span className="font-medium">{t("generateTogaPFP")}</span>
                  </a>

                  {/* Copy Nouns Symbol */}
                  <button
                    onClick={copyNounsSymbol}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${
                      isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Copy className="w-5 h-5" />
                      <span className="font-medium">Copy Nouns Symbol</span>
                    </div>
                    {copyFeedback && <span className="text-sm text-green-500 font-medium">Copied!</span>}
                  </button>

                  {/* Language Selector */}
                  <div className={`rounded-lg border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                    <button
                      onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5" />
                        <span className="font-medium">{t("language")}</span>
                      </div>
                      <span className="text-xl">{LANGUAGES.find((l) => l.code === selectedLanguage)?.flag}</span>
                    </button>

                    {showLanguageMenu && (
                      <div className={`border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              handleLanguageChange(lang.code)
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              selectedLanguage === lang.code
                                ? isDarkMode
                                  ? "bg-gray-800"
                                  : "bg-gray-100"
                                : isDarkMode
                                  ? "hover:bg-gray-800"
                                  : "hover:bg-gray-100"
                            }`}
                          >
                            <span className="text-xl">{lang.flag}</span>
                            <span className="font-medium">{lang.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lil Nouns */}
                  <Link
                    href="/lilnouns"
                    onClick={() => setShowMenu(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isDarkMode
                        ? "bg-gray-800 hover:bg-gray-700 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    }`}
                  >
                    <img src="/images/lilnouns-logo.png" alt="Lil Nouns" className="h-6 w-auto" />
                    <span className="font-medium">Governance</span>
                  </Link>

                  {/* Dark Mode Toggle */}
                  <button
                    onClick={() => {
                      setIsDarkMode(!isDarkMode)
                      setShowMenu(false)
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${
                      isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                    }`}
                  >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    <span className="font-medium">Light Theme</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-4 sm:mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={`w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 rounded-lg border text-sm sm:text-base ${
                isDarkMode
                  ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {searchResults.length > 0 && (
              <div
                className={`absolute top-full left-0 right-0 mt-2 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50 ${
                  isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-300"
                }`}
              >
                {searchResults.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() =>
                      activeTab === "proposals" ? handleSelectProposal(result.id) : handleSelectCandidate(result.id)
                    }
                    className={`w-full px-4 py-3 text-left hover:bg-opacity-50 border-b last:border-b-0 ${
                      isDarkMode ? "hover:bg-gray-700 border-gray-700" : "hover:bg-gray-100 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-blue-500">
                        {activeTab === "proposals" ? `#${result.id}` : `#${totalCandidates - index}`}
                      </span>
                      <span className="text-sm truncate">
                        {result.description || result.latestVersion?.content?.title || result.slug || result.id}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs and Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("proposals")}
              className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
                activeTab === "proposals"
                  ? isDarkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : isDarkMode
                    ? "bg-gray-800 text-gray-400 hover:text-white"
                    : "bg-gray-200 text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("proposals")} <span className="text-[10px] sm:text-xs md:text-sm">({totalCount})</span>
            </button>
            <button
              onClick={() => setActiveTab("candidates")}
              className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
                activeTab === "candidates"
                  ? isDarkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : isDarkMode
                    ? "bg-gray-800 text-gray-400 hover:text-white"
                    : "bg-gray-200 text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("candidates")} <span className="text-[10px] sm:text-xs md:text-sm">({totalCandidates})</span>
            </button>
          </div>

          {activeTab === "proposals" && (
            <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6">
              <Select value={statusFilter} onValueChange={(value) => handleStatusFilterChange(value as any)}>
                <SelectTrigger className="w-full md:w-[200px] h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder={t("filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs sm:text-sm">{t("showAll")}</SelectItem>
                  <SelectItem value="active" className="text-xs sm:text-sm">{t("active")}</SelectItem>
                  <SelectItem value="executed" className="text-xs sm:text-sm">{t("executed")}</SelectItem>
                  <SelectItem value="vetoed" className="text-xs sm:text-sm">{t("vetoed")}</SelectItem>
                  <SelectItem value="canceled" className="text-xs sm:text-sm">{t("canceled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {activeTab === "proposals" && (
            <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6">
              {proposalIdsLoading ? (
                <div className="col-span-2 text-center py-8">Loading proposals...</div>
              ) : filteredProposalIds.length === 0 ? (
                <div className="col-span-2 text-center py-8">No proposals found for this filter.</div>
              ) : (
                filteredProposalIds.map((id) => (
                  <ProposalVotingCard key={id} proposalId={id} isDarkMode={isDarkMode} statusFilter={statusFilter} />
                ))
              )}
              {hasMoreProposals && (
                <div className="col-span-1 md:col-span-2 flex justify-center mt-8 w-full">
                  <button
                    onClick={loadMoreProposals}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      isDarkMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    {t("loadMore")}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "candidates" && (
            <>
              {candidateIdsData?.isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="mt-4 text-gray-500">{t("loading")}</p>
                </div>
              ) : safeCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>{t("noCandidatesFound")}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {safeCandidates.map((candidate) => (
                      <CandidateCard
                        key={candidate.id}
                        candidateId={candidate.id}
                        candidateNumber={candidate.candidateNumber}
                        isDarkMode={isDarkMode}
                        candidateData={candidate}
                      />
                    ))}
                  </div>
                  {hasMoreCandidates && (
                    <div className="flex justify-center mt-8 w-full">
                      <button
                        onClick={loadMoreCandidates}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                          isDarkMode
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                      >
                        {t("loadMore")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Transaction Simulator */}
    </div>
  )
}
