// Utility to parse markdown content and extract media (images and videos)
export function parseMarkdownMedia(markdown: string): { images: string[]; videos: string[] } {
  if (!markdown) {
    return { images: [], videos: [] }
  }

  const images: string[] = []
  const videos: string[] = []

  // Extract image URLs from markdown syntax: ![alt](url)
  const imageRegex = /!\[.*?\]$$(https?:\/\/[^\s)]+)$$/g
  let imageMatch
  while ((imageMatch = imageRegex.exec(markdown)) !== null) {
    images.push(imageMatch[1])
  }

  // Extract YouTube video IDs from various formats
  const youtubePatterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/g,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g,
  ]

  for (const pattern of youtubePatterns) {
    let match
    while ((match = pattern.exec(markdown)) !== null) {
      if (!videos.includes(match[1])) {
        videos.push(match[1])
      }
    }
  }

  return { images, videos }
}
