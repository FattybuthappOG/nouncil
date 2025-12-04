"use client"

import { useState, useEffect } from "react"
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Moon, Sun, Menu, X, Search, Globe } from "lucide-react"
import ProposalVotingCard from "./proposal-voting-card"
import CandidateCard from "./candidate-card"
import TreasuryDropdown from "./treasury-dropdown"
import { useProposalIds, useCandidateIds } from "@/hooks/useContractData"

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
    defeated: "Defeated",
    loadMore: "Load 20 More",
    connectWallet: "Connect Wallet",
    treasury: "Treasury",
    learnAboutNouns: "Learn about Nouns",
    generateTogaPFP: "Generate Toga PFP",
    language: "Language",
    joinDiscord: "Join Discord",
    joinCallsThursday: "Join the calls every Thursday",
    toggleTheme: "Toggle Theme",
    proposer: "Proposer",
    viewOnEtherscan: "View on Etherscan",
    transactionSimulator: "Transaction Simulator",
    votes: "Votes",
    for: "For",
    against: "Against",
    abstain: "Abstain",
    vote: "Vote",
  },
  zh: {
    proposals: "提案",
    candidates: "候选人",
    searchProposals: "按编号或标题搜索提案...",
    searchCandidates: "按编号或标题搜索候选人...",
    showAll: "显示全部",
    active: "活跃",
    executed: "已执行",
    defeated: "已失败",
    loadMore: "加载更多20个",
    connectWallet: "连接钱包",
    treasury: "财政",
    learnAboutNouns: "了解 Nouns",
    generateTogaPFP: "生成 Toga 头像",
    language: "语言",
    joinDiscord: "加入 Discord",
    joinCallsThursday: "每周四参加电话会议",
    toggleTheme: "切换主题",
    proposer: "提议者",
    viewOnEtherscan: "在 Etherscan 上查看",
    transactionSimulator: "交易模拟器",
    votes: "投票",
    for: "赞成",
    against: "反对",
    abstain: "弃权",
    vote: "投票",
  },
  es: {
    proposals: "Propuestas",
    candidates: "Candidatos",
    searchProposals: "Buscar propuestas por número o título...",
    searchCandidates: "Buscar candidatos por número o título...",
    showAll: "Mostrar Todo",
    active: "Activo",
    executed: "Ejecutado",
    defeated: "Derrotado",
    loadMore: "Cargar 20 Más",
    connectWallet: "Conectar Billetera",
    treasury: "Tesorería",
    learnAboutNouns: "Aprender sobre Nouns",
    generateTogaPFP: "Generar PFP Toga",
    language: "Idioma",
    joinDiscord: "Únete a Discord",
    joinCallsThursday: "Únete a las llamadas todos los jueves",
    toggleTheme: "Cambiar Tema",
    proposer: "Proponente",
    viewOnEtherscan: "Ver en Etherscan",
    transactionSimulator: "Simulador de Transacciones",
    votes: "Votos",
    for: "A Favor",
    against: "En Contra",
    abstain: "Abstención",
    vote: "Votar",
  },
  hi: {
    proposals: "प्रस्ताव",
    candidates: "उम्मीदवार",
    searchProposals: "संख्या या शीर्षक से प्रस्ताव खोजें...",
    searchCandidates: "संख्या या शीर्षक से उम्मीदवार खोजें...",
    showAll: "सभी दिखाएं",
    active: "सक्रिय",
    executed: "निष्पादित",
    defeated: "पराजित",
    loadMore: "20 और लोड करें",
    connectWallet: "वॉलेट कनेक्ट करें",
    treasury: "ट्रेजरी",
    learnAboutNouns: "Nouns के बारे में जानें",
    generateTogaPFP: "Toga PFP जेनरेट करें",
    language: "भाषा",
    joinDiscord: "Discord में शामिल हों",
    joinCallsThursday: "हर गुरुवार को कॉल में शामिल हों",
    toggleTheme: "थीम टॉगल करें",
    proposer: "प्रस्तावक",
    viewOnEtherscan: "Etherscan पर देखें",
    transactionSimulator: "लेनदेन सिमुलेटर",
    votes: "मत",
    for: "के लिए",
    against: "के खिलाफ",
    abstain: "परहेज",
    vote: "वोट",
  },
  ar: {
    proposals: "المقترحات",
    candidates: "المرشحون",
    searchProposals: "البحث عن مقترحات بالرقم أو العنوان...",
    searchCandidates: "البحث عن مرشحين بالرقم أو العنوان...",
    showAll: "عرض الكل",
    active: "نشط",
    executed: "منفذ",
    defeated: "مهزوم",
    loadMore: "تحميل 20 أكثر",
    connectWallet: "ربط المحفظة",
    treasury: "الخزانة",
    learnAboutNouns: "تعرف على Nouns",
    generateTogaPFP: "إنشاء صورة Toga",
    language: "اللغة",
    joinDiscord: "انضم إلى Discord",
    joinCallsThursday: "انضم إلى المكالمات كل خميس",
    toggleTheme: "تبديل السمة",
    proposer: "المقترح",
    viewOnEtherscan: "عرض على Etherscan",
    transactionSimulator: "محاكي المعاملات",
    votes: "الأصوات",
    for: "لصالح",
    against: "ضد",
    abstain: "امتناع",
    vote: "تصويت",
  },
  pt: {
    proposals: "Propostas",
    candidates: "Candidatos",
    searchProposals: "Pesquisar propostas por número ou título...",
    searchCandidates: "Pesquisar candidatos por número ou título...",
    showAll: "Mostrar Tudo",
    active: "Ativo",
    executed: "Executado",
    defeated: "Derrotado",
    loadMore: "Carregar Mais 20",
    connectWallet: "Conectar Carteira",
    treasury: "Tesouraria",
    learnAboutNouns: "Saiba sobre Nouns",
    generateTogaPFP: "Gerar PFP Toga",
    language: "Idioma",
    joinDiscord: "Junte-se ao Discord",
    joinCallsThursday: "Participe das chamadas todas as quintas-feiras",
    toggleTheme: "Alternar Tema",
    proposer: "Proponente",
    viewOnEtherscan: "Ver no Etherscan",
    transactionSimulator: "Simulador de Transações",
    votes: "Votos",
    for: "A Favor",
    against: "Contra",
    abstain: "Abstenção",
    vote: "Votar",
  },
  bn: {
    proposals: "প্রস্তাব",
    candidates: "প্রার্থী",
    searchProposals: "সংখ্যা বা শিরোনাম দ্বারা প্রস্তাব অনুসন্ধান করুন...",
    searchCandidates: "সংখ্যা বা শিরোনাম দ্বারা প্রার্থী অনুসন্ধান করুন...",
    showAll: "সব দেখান",
    active: "সক্রিয়",
    executed: "সম্পাদিত",
    defeated: "পরাজিত",
    loadMore: "আরও 20 লোড করুন",
    connectWallet: "ওয়ালেট সংযুক্ত করুন",
    treasury: "ট্রেজারি",
    learnAboutNouns: "Nouns সম্পর্কে জানুন",
    generateTogaPFP: "Toga PFP তৈরি করুন",
    language: "ভাষা",
    joinDiscord: "Discord-এ যোগ দিন",
    joinCallsThursday: "প্রতি বৃহস্পতিবার কলে যোগ দিন",
    toggleTheme: "থিম টগল করুন",
    proposer: "প্রস্তাবক",
    viewOnEtherscan: "Etherscan-এ দেখুন",
    transactionSimulator: "লেনদেন সিমুলেটর",
    votes: "ভোট",
    for: "পক্ষে",
    against: "বিপক্ষে",
    abstain: "বিরত থাকা",
    vote: "ভোট",
  },
  ru: {
    proposals: "Предложения",
    candidates: "Кандидаты",
    searchProposals: "Искать предложения по номеру или заголовку...",
    searchCandidates: "Искать кандидатов по номеру или заголовку...",
    showAll: "Показать Все",
    active: "Активный",
    executed: "Выполнено",
    defeated: "Отклонено",
    loadMore: "Загрузить Еще 20",
    connectWallet: "Подключить Кошелек",
    treasury: "Казна",
    learnAboutNouns: "Узнать о Nouns",
    generateTogaPFP: "Создать PFP Toga",
    language: "Язык",
    joinDiscord: "Присоединиться к Discord",
    joinCallsThursday: "Присоединяйтесь к звонкам каждый четверг",
    toggleTheme: "Переключить Тему",
    proposer: "Предлагатель",
    viewOnEtherscan: "Посмотреть на Etherscan",
    transactionSimulator: "Симулятор Транзакций",
    votes: "Голоса",
    for: "За",
    against: "Против",
    abstain: "Воздержаться",
    vote: "Голосовать",
  },
  ja: {
    proposals: "提案",
    candidates: "候補者",
    searchProposals: "番号またはタイトルで提案を検索...",
    searchCandidates: "番号またはタイトルで候補者を検索...",
    showAll: "すべて表示",
    active: "アクティブ",
    executed: "実行済み",
    defeated: "否決",
    loadMore: "さらに20件読み込む",
    connectWallet: "ウォレットを接続",
    treasury: "財務",
    learnAboutNouns: "Nounsについて学ぶ",
    generateTogaPFP: "Toga PFPを生成",
    language: "言語",
    joinDiscord: "Discordに参加",
    joinCallsThursday: "毎週木曜日に通話に参加",
    toggleTheme: "テーマを切り替え",
    proposer: "提案者",
    viewOnEtherscan: "Etherscanで表示",
    transactionSimulator: "トランザクションシミュレーター",
    votes: "投票",
    for: "賛成",
    against: "反対",
    abstain: "棄権",
    vote: "投票",
  },
  fr: {
    proposals: "Propositions",
    candidates: "Candidats",
    searchProposals: "Rechercher des propositions par numéro ou titre...",
    searchCandidates: "Rechercher des candidats par numéro ou titre...",
    showAll: "Afficher Tout",
    active: "Actif",
    executed: "Exécuté",
    defeated: "Rejeté",
    loadMore: "Charger 20 de Plus",
    connectWallet: "Connecter le Portefeuille",
    treasury: "Trésorerie",
    learnAboutNouns: "En savoir plus sur Nouns",
    generateTogaPFP: "Générer PFP Toga",
    language: "Langue",
    joinDiscord: "Rejoindre Discord",
    joinCallsThursday: "Rejoignez les appels tous les jeudis",
    toggleTheme: "Changer le Thème",
    proposer: "Proposant",
    viewOnEtherscan: "Voir sur Etherscan",
    transactionSimulator: "Simulateur de Transactions",
    votes: "Votes",
    for: "Pour",
    against: "Contre",
    abstain: "Abstention",
    vote: "Voter",
  },
}

const t = (key: keyof typeof translations.en) => {
  return translations["en" as keyof typeof translations]?.[key] || translations.en[key]
}

export default function LiveGovernanceDashboard() {
  const router = useRouter()
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showWalletDialog, setShowWalletDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<"proposals" | "candidates">("proposals")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [displayedProposals, setDisplayedProposals] = useState(15)
  const [displayedCandidates, setDisplayedCandidates] = useState(15)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "executed" | "defeated">("all")
  const [selectedLanguage, setSelectedLanguage] = useState("en")
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)

  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()

  const { data: balanceData } = useBalance({
    address: "0x0BC3807Ec262cB779b38D65b38158acC3bfedE10",
  })

  const balance = balanceData
    ? `${Number(balanceData.value / BigInt(10 ** 18)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ETH`
    : "Loading..."

  const proposalIdsData = useProposalIds(displayedProposals)
  const candidateIdsData = useCandidateIds(displayedCandidates)

  const safeProposalIds = proposalIdsData?.proposalIds || []
  const safeCandidates = candidateIdsData?.candidates || []
  const totalProposals = proposalIdsData?.totalCount || 0
  const totalCandidates = candidateIdsData?.totalCount || 0
  const recentProposalIds = safeProposalIds.slice(0, displayedProposals)

  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode)
  }, [isDarkMode])

  // Simple translation function
  const translate = async (text: string, targetLang: string) => {
    if (targetLang === "en" || !text) return text

    try {
      // Using a simple translation approach - in production, you'd use a proper translation API
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`,
      )
      const data = await response.json()
      return data[0]?.[0]?.[0] || text
    } catch {
      return text
    }
  }

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
            query = `query { proposalCandidates(first: 10, where: { slug_contains_nocase: "${debouncedSearch}" }, orderBy: createdTimestamp, orderDirection: desc) { id slug latestVersion { content { title } } } }`
          }

          const response = await fetch(
            "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query }),
            },
          )

          const data = await response.json()
          if (searchType === "proposals") {
            const results = isNumber && data?.data?.proposal ? [data.data.proposal] : data?.data?.proposals || []
            setSearchResults(results)
          } else {
            setSearchResults(data?.data?.proposalCandidates || [])
          }
        } catch (error) {
          console.error("[v0] Search error:", error)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }, 300) // Debounce search by 300ms

    return () => clearTimeout(searchTimeout)
  }, [debouncedSearch, activeTab])

  const handleSelectProposal = (id: string) => {
    router.push(`/proposal/${id}`)
    setSearchQuery("")
    setSearchResults([])
  }

  const handleSelectCandidate = (id: string, index: number) => {
    router.push(`/candidate/${totalCandidates - index}`)
    setSearchQuery("")
    setSearchResults([])
  }

  const loadMoreProposals = () => {
    setDisplayedProposals((prev) => prev + 20)
  }

  const loadMoreCandidates = () => {
    setDisplayedCandidates((prev) => prev + 20)
  }

  const hasMoreProposals = displayedProposals < totalProposals
  const hasMoreCandidates = displayedCandidates < totalCandidates

  const searchPlaceholder = activeTab === "proposals" ? t("searchProposals") : t("searchCandidates")

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Header */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b ${
          isDarkMode ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <span className="text-4xl">⌐◨-◨</span>
            </Link>

            {/* Desktop - Connect Wallet and Menu */}
            <div className="hidden md:flex items-center gap-4">
              {isConnected ? (
                <button
                  onClick={() => disconnect()}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    isDarkMode
                      ? "bg-gray-800 hover:bg-gray-700 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  }`}
                >
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </button>
              ) : (
                <button
                  onClick={() => setShowWalletDialog(true)}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    isDarkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {t("connectWallet")}
                </button>
              )}

              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile - Menu Button */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`md:hidden p-2 rounded-lg ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
            >
              {showMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Desktop Menu */}
        {showMenu && (
          <div className="hidden md:block fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowMenu(false)} />
            <div
              className={`absolute right-0 top-0 bottom-0 w-80 ${isDarkMode ? "bg-gray-900" : "bg-white"} shadow-2xl overflow-y-auto`}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Menu</h3>
                  <button
                    onClick={() => setShowMenu(false)}
                    className={`p-2 rounded-lg ${isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <TreasuryDropdown balance={balance} isDarkMode={isDarkMode} />

                <a
                  href="https://nouns.world/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMenu(false)}
                  className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? "bg-gray-800 hover:bg-gray-700 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  }`}
                >
                  <img src="/images/nounsworld.gif" alt="Nouns World" className="w-6 h-6 rounded" />
                  <span>{t("learnAboutNouns")}</span>
                </a>

                <a
                  href="https://noggles.wtf"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMenu(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                  }`}
                >
                  <span className="text-xl">⌐◨-◨</span>
                  <span>{t("generateTogaPFP")}</span>
                </a>

                <div className={`rounded-lg border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                  <button
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    className={`w-full flex items-center justify-between px-4 py-2 ${
                      isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      <span>{t("language")}</span>
                    </div>
                    <span>{LANGUAGES.find((l) => l.code === selectedLanguage)?.flag}</span>
                  </button>

                  {showLanguageMenu && (
                    <div className={`border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setSelectedLanguage(lang.code)
                            setShowLanguageMenu(false)
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left ${
                            selectedLanguage === lang.code
                              ? isDarkMode
                                ? "bg-gray-700"
                                : "bg-gray-100"
                              : isDarkMode
                                ? "hover:bg-gray-700"
                                : "hover:bg-gray-100"
                          }`}
                        >
                          <span className="text-xl">{lang.flag}</span>
                          <span>{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <a
                  href="https://discord.gg/tnyXJZsGnq"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMenu(false)}
                  className={`flex flex-col gap-1 px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <img src="/images/discord-logo.svg" alt="Discord" className="w-6 h-6" />
                    <span>{t("joinDiscord")}</span>
                  </div>
                  <span className="text-sm opacity-75 ml-8">{t("joinCallsThursday")}</span>
                </a>

                <button
                  onClick={() => {
                    setIsDarkMode(!isDarkMode)
                    setShowMenu(false)
                  }}
                  className={`flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg transition-colors font-medium ${
                    isDarkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{t("toggleTheme")}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {showMenu && (
          <div
            className={`md:hidden border-t ${isDarkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
              {/* Mobile Connect Wallet */}
              <div>
                {isConnected ? (
                  <button
                    onClick={() => {
                      disconnect()
                      setShowMenu(false)
                    }}
                    className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
                      isDarkMode
                        ? "bg-gray-800 hover:bg-gray-700 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    }`}
                  >
                    Disconnect {address?.slice(0, 6)}...{address?.slice(-4)}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowWalletDialog(true)
                      setShowMenu(false)
                    }}
                    className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
                      isDarkMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    {t("connectWallet")}
                  </button>
                )}
              </div>

              <TreasuryDropdown balance={balance} isDarkMode={isDarkMode} />

              <a
                href="https://nouns.world/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMenu(false)}
                className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? "bg-gray-800 hover:bg-gray-700 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                }`}
              >
                <img src="/images/nounsworld.gif" alt="Nouns World" className="w-6 h-6 rounded" />
                <span>{t("learnAboutNouns")}</span>
              </a>

              <a
                href="https://noggles.wtf"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMenu(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                }`}
              >
                <span className="text-xl">⌐◨-◨</span>
                <span>{t("generateTogaPFP")}</span>
              </a>

              <div className={`rounded-lg border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className={`w-full flex items-center justify-between px-4 py-2 ${
                    isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    <span>{t("language")}</span>
                  </div>
                  <span>{LANGUAGES.find((l) => l.code === selectedLanguage)?.flag}</span>
                </button>

                {showLanguageMenu && (
                  <div className={`border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLanguage(lang.code)
                          setShowLanguageMenu(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left ${
                          selectedLanguage === lang.code
                            ? isDarkMode
                              ? "bg-gray-700"
                              : "bg-gray-100"
                            : isDarkMode
                              ? "hover:bg-gray-700"
                              : "hover:bg-gray-100"
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <a
                href="https://discord.gg/tnyXJZsGnq"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMenu(false)}
                className={`flex flex-col gap-1 px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <img src="/images/discord-logo.svg" alt="Discord" className="w-6 h-6" />
                  <span>{t("joinDiscord")}</span>
                </div>
                <span className="text-sm opacity-75 ml-8">{t("joinCallsThursday")}</span>
              </a>

              <button
                onClick={() => {
                  setIsDarkMode(!isDarkMode)
                  setShowMenu(false)
                }}
                className={`flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg transition-colors font-medium ${
                  isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                }`}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span>{t("toggleTheme")}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Wallet Connection Dialog */}
      {showWalletDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`max-w-md w-full rounded-2xl p-6 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">{t("connectWallet")}</h3>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => {
                    connect({ connector })
                    setShowWalletDialog(false)
                  }}
                  className={`w-full p-4 rounded-lg flex items-center gap-3 transition-colors ${
                    isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  }`}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <span className="font-medium">{connector.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWalletDialog(false)}
              className={`w-full mt-4 p-3 rounded-lg ${
                isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
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
                      activeTab === "proposals"
                        ? handleSelectProposal(result.id)
                        : handleSelectCandidate(result.id, index)
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
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("proposals")}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "proposals"
                  ? isDarkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : isDarkMode
                    ? "bg-gray-800 text-gray-400 hover:text-white"
                    : "bg-gray-200 text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("proposals")} ({totalProposals})
            </button>
            <button
              onClick={() => setActiveTab("candidates")}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "candidates"
                  ? isDarkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : isDarkMode
                    ? "bg-gray-800 text-gray-400 hover:text-white"
                    : "bg-gray-200 text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("candidates")} ({totalCandidates})
            </button>
          </div>

          {activeTab === "proposals" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-300"
              } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="all">{t("showAll")}</option>
              <option value="active">{t("active")}</option>
              <option value="executed">{t("executed")}</option>
              <option value="defeated">{t("defeated")}</option>
            </select>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {activeTab === "proposals" && (
            <>
              {proposalIdsData.isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading proposals...</div>
              ) : recentProposalIds.length > 0 ? (
                <>
                  {recentProposalIds.map((proposalId) => (
                    <ProposalVotingCard
                      key={proposalId}
                      proposalId={proposalId}
                      isDarkMode={isDarkMode}
                      statusFilter={statusFilter}
                    />
                  ))}
                  {hasMoreProposals && (
                    <div className="col-span-full flex justify-center mt-6">
                      <button
                        onClick={loadMoreProposals}
                        className={`px-6 py-3 rounded-lg transition-colors font-medium ${
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
              ) : (
                <div className="text-center py-12 text-gray-500">No proposals found</div>
              )}
            </>
          )}

          {activeTab === "candidates" && (
            <>
              {candidateIdsData.isLoading ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Loading candidates from Nouns DAO...</p>
                </div>
              ) : safeCandidates.length > 0 ? (
                <>
                  {safeCandidates.map((candidate, index) => (
                    <CandidateCard
                      key={candidate.id}
                      candidateId={candidate.id}
                      isDarkMode={isDarkMode}
                      candidateNumber={totalCandidates - index}
                    />
                  ))}
                  {hasMoreCandidates && (
                    <div className="col-span-full flex justify-center mt-6">
                      <button
                        onClick={loadMoreCandidates}
                        className={`px-6 py-3 rounded-lg transition-colors font-medium ${
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
              ) : (
                <div className="text-center py-12 text-gray-500">No candidates found</div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
