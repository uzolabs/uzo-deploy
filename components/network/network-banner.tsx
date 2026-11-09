"use client"

import { lazy } from "react"
import { WalletIsland } from "@/components/wallet/wallet-gate"

const WrongChainNotice = lazy(() => import("@/components/network/wrong-chain-notice"))

/** A one-click switch when the wallet is on another chain. The mainnet note sits on the deploy review step. */
export function NetworkBanner() {
  return (
    // Each notice carries its own top margin, and RainbowKit's wrapper div is display: contents,
    // so the empty banner takes no space and nothing jumps when the wallet code arrives.
    <div className="mx-auto grid max-w-6xl px-4 sm:px-6 [&_[data-rk]]:contents">
      {/* Only loads once the wallet code is wanted; before that no wallet is connected. */}
      <WalletIsland>
        <WrongChainNotice />
      </WalletIsland>
    </div>
  )
}
