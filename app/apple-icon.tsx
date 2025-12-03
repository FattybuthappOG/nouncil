import { ImageResponse } from "next/og"

export const runtime = "edge"

export const size = {
  width: 180,
  height: 180,
}

export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: "#e20010",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
      }}
    >
      <svg width="120" height="120" viewBox="0 0 72 72" fill="none">
        <path d="M0 0V72H24V24H48V0H0ZM72 72V24H48V72H72Z" fill="white" />
      </svg>
    </div>,
    {
      ...size,
    },
  )
}
