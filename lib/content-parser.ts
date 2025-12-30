export function parseContentForMedia(content: string): {
  text: string
  images: string[]
  youtubeVideos: string[]
} {
  const images: string[] = []
  const youtubeVideos: string[] = []
  let cleanedText = content

  const markdownImageRegex = /!\[([^\]]*)\]$$([^)]+)$$/gi
  const markdownMatches = content.matchAll(markdownImageRegex)
  for (const match of markdownMatches) {
    const imageUrl = match[2]
    if (imageUrl && /\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?$/i.test(imageUrl)) {
      images.push(imageUrl)
    }
    cleanedText = cleanedText.replace(match[0], "")
  }

  const imageRegex = /(?<!$$)(?<!\])(https?:\/\/[^\s<>"$$]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s<>"]*)?)/gi
  const imageMatches = content.match(imageRegex)
  if (imageMatches) {
    for (const url of imageMatches) {
      if (!images.includes(url)) {
        images.push(url)
        cleanedText = cleanedText.replace(url, "")
      }
    }
  }

  const ipfsRegex = /(https?:\/\/[^\s]*ipfs[^\s]*)/gi
  const ipfsMatches = content.match(ipfsRegex)
  if (ipfsMatches) {
    for (const url of ipfsMatches) {
      if (!images.includes(url)) {
        images.push(url)
        cleanedText = cleanedText.replace(url, "")
      }
    }
  }

  // Extract YouTube URLs and convert to embed format
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/gi
  const youtubeMatches = content.matchAll(youtubeRegex)
  for (const match of youtubeMatches) {
    youtubeVideos.push(match[1])
    cleanedText = cleanedText.replace(match[0], "")
  }

  cleanedText = cleanedText.replace(/\n{3,}/g, "\n\n").trim()

  return { text: cleanedText, images, youtubeVideos }
}

export function getYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}
