"use client"

import { useNetwork } from "@/components/network/network-provider"
import type { NetworkKey } from "@/lib/chains"
import { cn } from "@/lib/utils"

const options: { key: NetworkKey; label: string }[] = [
  { key: "testnet", label: "Testnet" },
  { key: "mainnet", label: "Mainnet" },
]

/** Testnet / Mainnet toggle. Shown on every page. */
export function NetworkSwitch({ className }: { className?: string }) {
  const { network, setNetwork } = useNetwork()
  return (
    <div
      role="radiogroup"
      aria-label="Network"
      className={cn("inline-flex rounded-full border border-glass-border bg-foreground/5 p-0.5", className)}
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
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary text-primary-foreground"
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
