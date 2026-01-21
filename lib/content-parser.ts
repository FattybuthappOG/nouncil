export function parseContentForMedia(content: string): {
  text: string
  images: string[]
  youtubeVideos: string[]
} {
  const images: string[] = []
  const youtubeVideos: string[] = []
  let processedText = content

  // First, extract and remove markdown image syntax: ![alt](url) or ![](url)
  const markdownImageRegex = /!\[[^\]]*\]\(([^)]+)\)/gi
  const markdownMatches = content.matchAll(markdownImageRegex)
  for (const match of markdownMatches) {
    const imageUrl = match[1]
    if (imageUrl && /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(imageUrl)) {
      images.push(imageUrl)
    }
    // Remove the entire markdown image syntax from text
    processedText = processedText.replace(match[0], '')
  }

  // Extract standalone image URLs (jpg, jpeg, png, gif, webp)
  const imageRegex = /(https?:\/\/[^\s\)]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s\)]*)?)/gi
  const imageMatches = processedText.match(imageRegex)
  if (imageMatches) {
    for (const imageUrl of imageMatches) {
      if (!images.includes(imageUrl)) {
        images.push(imageUrl)
      }
      // Remove image URLs from the text
      processedText = processedText.replace(imageUrl, '')
    }
  }

  // Extract YouTube URLs and convert to embed format
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/gi
  const youtubeMatches = processedText.matchAll(youtubeRegex)
  for (const match of youtubeMatches) {
    youtubeVideos.push(match[1])
    // Remove YouTube URLs from text
    processedText = processedText.replace(match[0], '')
  }

  // Clean up leftover empty markdown link syntax, parentheses, and extra whitespace
  processedText = processedText
    .replace(/\[\]\(\)/g, '') // Empty markdown links
    .replace(/!\[\]/g, '') // Leftover ![]
    .replace(/\(\)/g, '') // Empty parentheses
    .replace(/\n{3,}/g, '\n\n') // Multiple newlines
    .trim()

  return { text: processedText, images, youtubeVideos }
}

export function getYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}
