export function parseProposalDescription(description: string): {
  title: string
  content: string
  media: { type: "image" | "video" | "gif"; url: string }[]
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
  const media: { type: "image" | "video" | "gif"; url: string }[] = []
  const imageRegex = /!\[.*?\]$$(.*?)$$/g
  const videoRegex = /\[.*?\]$$(https?:\/\/.*?\.(mp4|webm|mov|youtube\.com|youtu\.be).*?)$$/gi

  let match
  while ((match = imageRegex.exec(description)) !== null) {
    const url = match[1]
    const isGif = url.toLowerCase().endsWith(".gif")
    media.push({ type: isGif ? "gif" : "image", url })
  }

  while ((match = videoRegex.exec(description)) !== null) {
    media.push({ type: "video", url: match[1] })
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
  ]

  return states[state] || { label: "Unknown", color: "gray" }
}
