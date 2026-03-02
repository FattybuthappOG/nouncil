"use client"

import { useEffect, useState, useRef } from "react"

export function SnowEffect() {
  const [isDecember, setIsDecember] = useState(false)
  const [mounted, setMounted] = useState(false)
  const styleInjected = useRef(false)

  useEffect(() => {
    setMounted(true)
    const currentMonth = new Date().getMonth()
    setIsDecember(currentMonth === 11)

    // Inject snowfall keyframes via DOM
    if (currentMonth === 11 && !styleInjected.current) {
      styleInjected.current = true
      const style = document.createElement("style")
      style.setAttribute("data-snow-effect", "true")
      style.textContent = `
        @keyframes snowfall {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(calc(100vh + 40px)) rotate(360deg); }
        }
      `
      document.head.appendChild(style)
      return () => {
        style.remove()
      }
    }
  }, [])

  if (!mounted || !isDecember) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/60"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-20px",
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            animationName: "snowfall",
            animationDuration: `${Math.random() * 8 + 6}s`,
            animationDelay: `${Math.random() * 5}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            opacity: Math.random() * 0.5 + 0.3,
          }}
        />
      ))}
    </div>
  )
}
