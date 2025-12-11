"use client"

import { parseContentForMedia, getYoutubeEmbedUrl } from "@/lib/content-parser"

interface MediaContentRendererProps {
  content: string
  className?: string
}

export function MediaContentRenderer({ content, className = "" }: MediaContentRendererProps) {
  const { text, images, youtubeVideos } = parseContentForMedia(content)

  return (
    <div className={className}>
      {/* Text content */}
      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words mb-3">{text}</p>

      {/* Images */}
      {images.length > 0 && (
        <div className="space-y-2 mb-3">
          {images.map((imageUrl, index) => (
            <img
              key={index}
              src={imageUrl || "/placeholder.svg"}
              alt={`Media ${index + 1}`}
              className="rounded-lg max-w-full h-auto border border-border"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* YouTube videos */}
      {youtubeVideos.length > 0 && (
        <div className="space-y-2">
          {youtubeVideos.map((videoId, index) => (
            <div key={index} className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
              <iframe
                src={getYoutubeEmbedUrl(videoId)}
                title={`YouTube video ${index + 1}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
