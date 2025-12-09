export function parseProposalDescription(description: string): {
  title: string
  content: string
  media: { type: "image" | "video" | "gif" | "youtube"; url: string; embedUrl?: string }[]
} {
  // Extract title (first line or first # heading)
  const lines = description.split("\n")
  let title = "Untitled Proposal"
  let contentStart = 0

  if (lines[0]?.startsWith("#")) {
    title = lines[0].replace(/^#+\s*/, "").trim()
    contentStart = 1
  } else if (lines[0]?.trim()) {
    title = lines[0].trim()
    contentStart = 1
  }

  // Extract media URLs from markdown
  const media: { type: "image" | "video" | "gif" | "youtube"; url: string; embedUrl?: string }[] = []

  const imageRegex = /!\[.*?\]$$(.*?)$$/g
  const videoRegex = /\[(.*?)\]$$(https?:\/\/.*?\.(mp4|webm|mov))$$/gi
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g

  let match
  while ((match = imageRegex.exec(description)) !== null) {
    const url = match[1]
    const isGif = url.toLowerCase().endsWith(".gif")
    media.push({ type: isGif ? "gif" : "image", url })
  }

  while ((match = videoRegex.exec(description)) !== null) {
    media.push({ type: "video", url: match[2] })
  }

  while ((match = youtubeRegex.exec(description)) !== null) {
    const videoId = match[1]
    media.push({
      type: "youtube",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    })
  }

  // Get content without title
  const content = lines.slice(contentStart).join("\n").trim()

  return { title, content, media }
}

export function getProposalStateLabel(state: number): {
  label: string
  color: string
} {
  const states = [
    { label: "Pending", color: "yellow" },
    { label: "Active", color: "green" },
    { label: "Canceled", color: "gray" },
    { label: "Defeated", color: "red" },
    { label: "Succeeded", color: "blue" },
    { label: "Queued", color: "purple" },
    { label: "Expired", color: "gray" },
    { label: "Executed", color: "green" },
    { label: "Vetoed", color: "red" },
  ]

  return states[state] || { label: "Pending", color: "yellow" }
}

export function parseMarkdownMedia(description: string): {
  images: string[]
  videos: string[]
} {
  const images: string[] = []
  const videos: string[] = []

  // Extract image URLs from markdown
  const imageRegex = /!\[.*?\]$$(.*?)$$/g
  let match
  while ((match = imageRegex.exec(description)) !== null) {
    images.push(match[1])
  }

  // Extract YouTube video IDs
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g
  while ((match = youtubeRegex.exec(description)) !== null) {
    videos.push(match[1])
  }

  return { images, videos }
}
