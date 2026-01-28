export function parseContentForMedia(content: string): {
  text: string
  images: string[]
  youtubeVideos: string[]
} {
  const images: string[] = []
  const youtubeVideos: string[] = []
  let processedText = content

  // Extract markdown image syntax ![alt](url) first
  const markdownImageRegex = /!\[[^\]]*\]\((https?:\/\/[^)]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^)]*)?)\)/gi
  const markdownImageMatches = content.matchAll(markdownImageRegex)
  for (const match of markdownImageMatches) {
    images.push(match[1])
    // Remove entire markdown image syntax
    processedText = processedText.replace(match[0], '')
  }

  // Extract standalone image URLs (jpg, jpeg, png, gif, webp)
  const imageRegex = /(https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s)]*)?)/gi
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

  // Remove any leftover markdown link syntax with empty URLs like ![]() or []()
  processedText = processedText.replace(/!?\[[^\]]*\]\(\s*\)/g, '')

  // Extract YouTube URLs and convert to embed format
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/gi
  const youtubeMatches = processedText.matchAll(youtubeRegex)
  for (const match of youtubeMatches) {
    youtubeVideos.push(match[1])
    // Remove YouTube URLs from text
    processedText = processedText.replace(match[0], '')
  }

  // Clean up extra whitespace left after removing URLs
  processedText = processedText.replace(/\n{3,}/g, '\n\n').trim()

  return { text: processedText, images, youtubeVideos }
}

export function getYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}
