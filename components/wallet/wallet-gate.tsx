"use client"

import { lazy, Suspense, useEffect, useSyncExternalStore, type ReactNode } from "react"

/**
 * The wallet code (wagmi, RainbowKit and the wallet SDKs) is large. Pages that never touch a
 * wallet should not pay for it, so it loads only when something asks for it: a wallet page,
 * a tap on Connect, or a visitor who connected before.
 */
const loadProviders = () => import("./providers")
const Providers = lazy(() => loadProviders().then((m) => ({ default: m.Providers })))

let wanted = false
let openConnectAfterLoad = false
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Start loading the wallet code. With `openConnect`, the connect dialog opens once it is ready. */
export function requestWallet(options?: { openConnect?: boolean }) {
  if (options?.openConnect) openConnectAfterLoad = true
  if (wanted) return
  wanted = true
  listeners.forEach((listener) => listener())
}

/** Fetch the wallet code early (on hover or focus) without rendering it yet. */
export function preloadWallet() {
  void loadProviders()
}

/** True once, if a tap on Connect is waiting for the dialog to open. */
export function takeOpenConnect() {
  const value = openConnectAfterLoad
  openConnectAfterLoad = false
  return value
}

function useWalletWanted() {
  return useSyncExternalStore(
    subscribe,
    () => wanted,
    () => false,
  )
}

function connectedBefore() {
  try {
    const raw = window.localStorage.getItem("wagmi.store")
    return Boolean(raw && /"current":"/.test(raw))
  } catch {
    return false
  }
}

/** Loads the wallet code straight away for a visitor whose wallet was connected last time. */
export function WalletAutoload() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_ACCOUNT || connectedBefore()) requestWallet()
  }, [])
  return null
}

/**
 * Renders `children` inside the wallet providers once the wallet code is wanted, and
 * `fallback` until then. Every island shares one wagmi config, so they all see the same wallet.
 * `eager` asks for the wallet code as soon as the island mounts.
 */
export function WalletIsland({
  children,
  fallback = null,
  eager = false,
}: {
  children: ReactNode
  fallback?: ReactNode
  eager?: boolean
}) {
  const isWanted = useWalletWanted()

  useEffect(() => {
    if (eager) requestWallet()
  }, [eager])

  if (!isWanted) return fallback
  return (
    <Suspense fallback={fallback}>
      <Providers>{children}</Providers>
    </Suspense>
  )
}

/**
 * A wallet page's main content. Loads the wallet code at once and shows a short note meanwhile.
 * The note keeps most of a screen's height, so the footer doesn't jump when the content arrives.
 */
export function WalletSection({ children }: { children: ReactNode }) {
  return (
    <WalletIsland
      eager
      fallback={
        <p className="glass min-h-[70vh] rounded-3xl p-6 text-muted-foreground" role="status">
          Loading wallet tools
        </p>
      }
    >
      {children}
    </WalletIsland>
  )
}
