export function parseContentForMedia(content: string): {
  text: string
  images: string[]
  youtubeVideos: string[]
} {
  const images: string[] = []
  const youtubeVideos: string[] = []
  let processedText = content

  // Extract image URLs (jpg, jpeg, png, gif, webp)
  const imageRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s]*)?)/gi
  const imageMatches = content.match(imageRegex)
  if (imageMatches) {
    images.push(...imageMatches)
    // Remove image URLs from the text so they don't appear as both links and images
    for (const imageUrl of imageMatches) {
      processedText = processedText.replace(imageUrl, '')
    }
  }

  // Extract YouTube URLs and convert to embed format
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/gi
  const youtubeMatches = content.matchAll(youtubeRegex)
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
