"use client"

import { useSyncExternalStore } from "react"
import type { Address } from "viem"
import type { NetworkKey } from "@/lib/chains"
import { site } from "@/lib/site"

const noop = () => () => {}

/** The public tip page for a jar. Uses the current origin in the browser, so previews link to themselves. */
export function useTipUrl(jar: Address, network: NetworkKey) {
  const origin = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => site.url,
  )
  return `${origin}/tip/${jar}${network === "mainnet" ? "?network=mainnet" : ""}`
}
