"use client"

import { useEffect } from "react"
import { useNetwork } from "@/components/network/network-provider"
import type { NetworkKey } from "@/lib/chains"

/** A page about a contract on one network moves the app to that network, so the wallet prompts match. */
export function useNetworkFromUrl(network: NetworkKey) {
  const { network: current, setNetwork } = useNetwork()
  useEffect(() => {
    if (current !== network) setNetwork(network)
    // Only when the page's network changes, so the person can still switch away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network])
}
