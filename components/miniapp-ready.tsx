"use client"

import { useEffect } from "react"
import { sdk } from "@farcaster/miniapp-sdk"

export default function MiniappReady() {
  useEffect(() => {
    sdk.actions.ready().catch(console.error)
  }, [])

  return null
}
