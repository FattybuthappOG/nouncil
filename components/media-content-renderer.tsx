"use client"

import { parseContentForMedia, getYoutubeEmbedUrl } from "@/lib/content-parser"
import ReactMarkdown from "react-markdown"
import { useState } from "react"

interface MediaContentRendererProps {
  content: string
  className?: string
}

export function MediaContentRenderer({ content, className = "" }: MediaContentRendererProps) {
  const { text, images, youtubeVideos } = parseContentForMedia(content)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const handleImageError = (url: string) => {
    setFailedImages((prev) => new Set(prev).add(url))
  }

  return (
    <div className={className}>
      {text && (
        <div className="prose prose-invert max-w-none prose-p:text-sm prose-p:text-muted-foreground prose-headings:text-white prose-a:text-blue-400 prose-strong:text-white mb-3">
          <ReactMarkdown
            components={{
              img: ({ src, alt }) => {
                if (!src || failedImages.has(src)) return null
                return (
                  <img
                    src={src || "/placeholder.svg"}
                    alt={alt || "Image"}
                    className="rounded-lg max-w-full h-auto border border-border my-2"
                    loading="lazy"
                    onError={() => handleImageError(src)}
                  />
                )
              },
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  {children}
                </a>
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-3 mb-3">
          {images.map((imageUrl, index) => {
            if (failedImages.has(imageUrl)) return null
            return (
              <img
                key={index}
                src={imageUrl || "/placeholder.svg"}
                alt={`Media ${index + 1}`}
                className="rounded-lg max-w-full h-auto border border-border"
                loading="lazy"
                onError={() => handleImageError(imageUrl)}
              />
            )
          })}
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
