import { type NextRequest, NextResponse } from "next/server"

const LANGUAGE_CODES: Record<string, string> = {
  zh: "zh-CN",
  es: "es",
  hi: "hi",
  ar: "ar",
  pt: "pt",
  bn: "bn",
  ru: "ru",
  ja: "ja",
  fr: "fr",
}

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang } = await request.json()

    if (!text || targetLang === "en") {
      return NextResponse.json({ translatedText: text })
    }

    const langCode = LANGUAGE_CODES[targetLang]
    if (!langCode) {
      return NextResponse.json({ translatedText: text })
    }

    // Supports 5000 requests per day without registration
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${langCode}`,
    )

    if (!response.ok) {
      console.error("MyMemory API error:", response.statusText)
      return NextResponse.json({ translatedText: text })
    }

    const data = await response.json()

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return NextResponse.json({
        translatedText: data.responseData.translatedText,
      })
    }

    return NextResponse.json({ translatedText: text })
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json({ translatedText: "" }, { status: 500 })
  }
}
