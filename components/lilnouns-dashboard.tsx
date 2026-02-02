"use client"

import { useState, useEffect } from "react"
import { useAccount, useDisconnect, useBalance } from "wagmi"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Moon, Sun, X, Search, Globe, Copy, Menu, ArrowLeft } from "lucide-react"
import LilNounsProposalCard from "./lilnouns-proposal-card"
import LilNounsCandidateCard from "./lilnouns-candidate-card"
import TreasuryDropdown from "./treasury-dropdown"
import { useLilNounsProposalIds, useLilNounsCandidateIds } from "@/hooks/useLilNounsData"
import WalletConnectButton from "./wallet-connect-button"
import { useConnect } from "wagmi"

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
    language: "Language",
    loading: "Loading...",
    noProposalsFound: "No proposals found",
    noCandidatesFound: "No candidates found",
    filterByStatus: "Filter by Status",
    backToNouncil: "Back to Nouncil",
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
    language: "语言",
    loading: "正在加载...",
    noProposalsFound: "未找到提案",
    noCandidatesFound: "未找到候选人",
    filterByStatus: "按状态过滤",
    backToNouncil: "返回 Nouncil",
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
    language: "Idioma",
    loading: "Cargando...",
    noProposalsFound: "No se encontraron propuestas",
    noCandidatesFound: "No se encontraron candidatos",
    filterByStatus: "Filtrar por Estado",
    backToNouncil: "Volver a Nouncil",
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
    language: "भाषा",
    loading: "लोड हो रहा है...",
    noProposalsFound: "कोई प्रस्ताव नहीं मिला",
    noCandidatesFound: "कोई उम्मीदवार नहीं मिला",
    filterByStatus: "स्थिति के आधार पर फ़िल्टर करें",
    backToNouncil: "Nouncil पर वापस जाएं",
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
    language: "اللغة",
    loading: "جارٍ التحميل...",
    noProposalsFound: "لم يتم العثور على أي مقترحات",
    noCandidatesFound: "لم يتم العثور على أي مرشحين",
    filterByStatus: "تصفية حسب الحالة",
    backToNouncil: "العودة إلى Nouncil",
  },
  pt: {
    proposals: "Propostas",
    candidates: "Candidatos",
    searchProposals: "Pesquisar propostas por número ou título...",
    searchCandidates: "Pesquisar candidatos por número ou título...",
    showAll: "Mostrar Tudo",
    active: "Ativo",
    executed: "Executado",
    vetoed: "Vetado",
    canceled: "Cancelado",
    loadMore: "Carregar Mais 20",
    connectWallet: "Conectar Carteira",
    treasury: "Tesouro",
    language: "Idioma",
    loading: "Carregando...",
    noProposalsFound: "Nenhuma proposta encontrada",
    noCandidatesFound: "Nenhum candidato encontrado",
    filterByStatus: "Filtrar por Status",
    backToNouncil: "Voltar para Nouncil",
  },
  bn: {
    proposals: "প্রস্তাবনা",
    candidates: "প্রার্থী",
    searchProposals: "নম্বর বা শিরোনাম দ্বারা প্রস্তাবনা অনুসন্ধান করুন...",
    searchCandidates: "নম্বর বা শিরোনাম দ্বারা প্রার্থী অনুসন্ধান করুন...",
    showAll: "সব দেখান",
    active: "সক্রিয়",
    executed: "কার্যকর",
    vetoed: "ভেটো",
    canceled: "বাতিল",
    loadMore: "আরো ২০ লোড করুন",
    connectWallet: "ওয়ালেট সংযুক্ত করুন",
    treasury: "কোষাগার",
    language: "ভাষা",
    loading: "লোড হচ্ছে...",
    noProposalsFound: "কোন প্রস্তাবনা পাওয়া যায়নি",
    noCandidatesFound: "কোন প্রার্থী পাওয়া যায়নি",
    filterByStatus: "স্ট্যাটাস দ্বারা ফিল্টার করুন",
    backToNouncil: "Nouncil এ ফিরে যান",
  },
  ru: {
    proposals: "Предложения",
    candidates: "Кандидаты",
    searchProposals: "Поиск предложений по номеру или заголовку...",
    searchCandidates: "Поиск кандидатов по номеру или заголовку...",
    showAll: "Показать все",
    active: "Активные",
    executed: "Выполненные",
    vetoed: "Заветированные",
    canceled: "Отмененные",
    loadMore: "Загрузить еще 20",
    connectWallet: "Подключить кошелек",
    treasury: "Казна",
    language: "Язык",
    loading: "Загрузка...",
    noProposalsFound: "Предложения не найдены",
    noCandidatesFound: "Кандидаты не найдены",
    filterByStatus: "Фильтр по статусу",
    backToNouncil: "Вернуться в Nouncil",
  },
  ja: {
    proposals: "提案",
    candidates: "候補者",
    searchProposals: "番号またはタイトルで提案を検索...",
    searchCandidates: "番号またはタイトルで候補者を検索...",
    showAll: "すべて表示",
    active: "アクティブ",
    executed: "実行済み",
    vetoed: "拒否権発動",
    canceled: "キャンセル",
    loadMore: "さらに20件読み込む",
    connectWallet: "ウォレット接続",
    treasury: "トレジャリー",
    language: "言語",
    loading: "読み込み中...",
    noProposalsFound: "提案が見つかりません",
    noCandidatesFound: "候補者が見つかりません",
    filterByStatus: "ステータスでフィルター",
    backToNouncil: "Nouncilに戻る",
  },
  fr: {
    proposals: "Propositions",
    candidates: "Candidats",
    searchProposals: "Rechercher des propositions par numéro ou titre...",
    searchCandidates: "Rechercher des candidats par numéro ou titre...",
    showAll: "Tout afficher",
    active: "Actif",
    executed: "Exécuté",
    vetoed: "Véto",
    canceled: "Annulé",
    loadMore: "Charger 20 de plus",
    connectWallet: "Connecter le portefeuille",
    treasury: "Trésorerie",
    language: "Langue",
    loading: "Chargement...",
    noProposalsFound: "Aucune proposition trouvée",
    noCandidatesFound: "Aucun candidat trouvé",
    filterByStatus: "Filtrer par statut",
    backToNouncil: "Retour à Nouncil",
  },
}

type LanguageCode = keyof typeof translations

export default function LilNounsDashboard() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<"proposals" | "candidates">("proposals")
  
  const [displayedProposals, setDisplayedProposals] = useState(20)
  const [displayedCandidates, setDisplayedCandidates] = useState(20)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en")
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connectors, connect } = useConnect()
  const { data: balanceData } = useBalance({ address })
  const router = useRouter()

  const { proposalIds, totalCount, isLoading: proposalIdsLoading } = useLilNounsProposalIds(displayedProposals)
  const candidateIdsData = useLilNounsCandidateIds(displayedCandidates)
  const totalCandidates = candidateIdsData?.totalCount || 0
  const safeCandidates = candidateIdsData?.candidates || []

  useEffect(() => {
    setMounted(true)
  }, [])

  const t = (key: keyof (typeof translations)["en"]) => {
    return translations[selectedLanguage]?.[key] || translations.en[key] || key
  }

  const balance = balanceData ? `${Number.parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}` : "0 ETH"

  const hasMoreProposals = proposalIds.length < totalCount
  const hasMoreCandidates = safeCandidates.length < totalCandidates

  const loadMoreProposals = () => setDisplayedProposals((prev) => prev + 20)
  const loadMoreCandidates = () => setDisplayedCandidates((prev) => prev + 20)

  const searchPlaceholder = activeTab === "proposals" ? t("searchProposals") : t("searchCandidates")

  const handleSelectProposal = (id: number) => {
    router.push(`/lilnouns/proposal/${id}`)
    setSearchQuery("")
    setSearchResults([])
  }

  const handleSelectCandidate = (id: string) => {
    router.push(`/lilnouns/candidate/${id}`)
    setSearchQuery("")
    setSearchResults([])
  }

  const copyNounsSymbol = async () => {
    try {
      await navigator.clipboard.writeText("⌐◨-◨")
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
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

  

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen overflow-x-hidden ${isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <header
        className={`${
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        } border-b sticky top-0 z-50 backdrop-blur`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between relative">
          {/* Back Button */}
          <div className="flex items-center flex-1">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline text-sm">{t("backToNouncil")}</span>
            </Link>
          </div>

          {/* Centered Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none">
            <img 
              src="/images/lilnouns-logo.png" 
              alt="Lil Nouns" 
              className="h-9 sm:h-10 w-auto"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-4 flex-1 justify-end pl-4">
            {/* WalletConnectButton - compact on mobile */}
            <span className="hidden sm:inline-block"><WalletConnectButton colorScheme="pink" /></span>
            <span className="sm:hidden"><WalletConnectButton colorScheme="pink" compact /></span>

            <button
              onClick={() => setShowMenu(true)}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {showMenu && (
          <div className="fixed inset-0 z-[100]" onClick={() => setShowMenu(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute right-0 top-0 min-h-full w-full sm:w-96 ${
                isDarkMode ? "bg-gray-900" : "bg-white"
              } shadow-2xl overflow-y-auto`}
            >
              <div className="p-4 md:p-6 min-h-screen overflow-x-hidden">
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

                <div className="space-y-3">
                  <TreasuryDropdown balance={balance} isDarkMode={isDarkMode} />

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
                            onClick={() => handleLanguageChange(lang.code as LanguageCode)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              selectedLanguage === lang.code
                                ? isDarkMode ? "bg-gray-800" : "bg-gray-100"
                                : isDarkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
                            }`}
                          >
                            <span className="text-xl">{lang.flag}</span>
                            <span className="font-medium">{lang.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              } focus:outline-none focus:ring-2 focus:ring-pink-500`}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("proposals")}
              className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
                activeTab === "proposals"
                  ? "bg-pink-600 text-white"
                  : isDarkMode
                    ? "bg-gray-800 text-gray-400 hover:text-white"
                    : "bg-gray-200 text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("proposals")} <span className="text-[10px] sm:text-xs md:text-sm">({totalCount})</span>
            </button>
            <a
              href="https://lilnouns.camp/candidates"
              target="_blank"
              rel="noopener noreferrer"
              className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm md:text-base ${
                isDarkMode
                  ? "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                  : "bg-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-300"
              }`}
            >
              {t("candidates")}
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {activeTab === "proposals" && (
            <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6">
              {proposalIdsLoading ? (
                <div className="col-span-2 text-center py-8">{t("loading")}</div>
              ) : proposalIds.length === 0 ? (
                <div className="col-span-2 text-center py-8">{t("noProposalsFound")}</div>
              ) : (
                proposalIds.map((id) => (
                  <LilNounsProposalCard key={id} proposalId={id} isDarkMode={isDarkMode} />
                ))
              )}
              {hasMoreProposals && (
                <div className="col-span-2 flex justify-center mt-8">
                  <button
                    onClick={loadMoreProposals}
                    className="px-6 py-3 rounded-lg font-medium transition-colors bg-pink-600 hover:bg-pink-700 text-white"
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
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
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
                      <LilNounsCandidateCard
                        key={candidate.id}
                        candidateId={candidate.id}
                        candidateNumber={candidate.candidateNumber}
                        isDarkMode={isDarkMode}
                        candidateData={candidate}
                      />
                    ))}
                  </div>
                  {hasMoreCandidates && (
                    <div className="flex justify-center mt-8">
                      <button
                        onClick={loadMoreCandidates}
                        className="px-6 py-3 rounded-lg font-medium transition-colors bg-pink-600 hover:bg-pink-700 text-white"
                      >
                        {t("loadMore")} (20 more)
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
