"use client"

import { useNetwork } from "@/components/network/network-provider"
import type { NetworkKey } from "@/lib/chains"
import { cn } from "@/lib/utils"

const options: { key: NetworkKey; label: string }[] = [
  { key: "mainnet", label: "Mainnet" },
  { key: "testnet", label: "Testnet" },
]

/** Mainnet / Testnet toggle. Shown on every page. */
export function NetworkSwitch({ className }: { className?: string }) {
  const { network, setNetwork } = useNetwork()
  return (
    <div
      role="radiogroup"
      aria-label="Network"
      className={cn("inline-flex rounded-full border border-line bg-[var(--glass)] p-0.5", className)}
    >
      {options.map((o) => {
        const active = network === o.key
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setNetwork(o.key)}
            className={cn(
              "min-h-9 rounded-full px-3 text-sm font-medium transition-colors",
              active
                ? o.key === "mainnet"
                  ? "bg-ember/15 text-[#ffb7a6] ring-1 ring-ember/60 ring-inset"
                  : "bg-gold/15 text-ochre-hi ring-1 ring-gold/50 ring-inset"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
