import { ImageResponse } from "next/og"

// Image metadata for Apple touch icon
export const size = {
  width: 180,
  height: 180,
}
export const contentType = "image/png"

// Apple touch icon generation
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        fontSize: 48,
        background: "#000",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "bold",
        borderRadius: "20px",
      }}
    >
      N
    </div>,
    {
      ...size,
    },
  )
}
