"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { chainFor, defaultNetwork, type BotChain, type NetworkKey } from "@/lib/chains"

const STORAGE_KEY = "uzo.network"

type NetworkContextValue = {
  network: NetworkKey
  chain: BotChain
  setNetwork: (network: NetworkKey) => void
}

const NetworkContext = createContext<NetworkContextValue | null>(null)

function readStored(): NetworkKey | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === "testnet" || v === "mainnet" ? v : null
  } catch {
    return null
  }
}

/** The selected network. New visitors get testnet; the choice is remembered in this browser only. */
export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setState] = useState<NetworkKey>(defaultNetwork)

  useEffect(() => {
    const stored = readStored()
    // Reading localStorage has to wait until after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setState(stored)
  }, [])

  const setNetwork = useCallback((next: NetworkKey) => {
    setState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private mode or storage blocked: the choice lasts for this visit only.
    }
  }, [])

  return (
    <NetworkContext.Provider value={{ network, chain: chainFor(network), setNetwork }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  const ctx = useContext(NetworkContext)
  if (!ctx) throw new Error("useNetwork must be used inside NetworkProvider")
  return ctx
}
