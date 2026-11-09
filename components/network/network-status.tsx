"use client"

import { useEffect, useState } from "react"
import { useNetwork } from "@/components/network/network-provider"
import { rpcUrl } from "@/lib/chains"
import { factoriesFor } from "@/lib/deployments"

const POLL_MS = 5_000

type BlockState = { status: "loading" } | { status: "error" } | { status: "ok"; block: bigint }

/**
 * The latest block from the selected network's RPC, polled with a plain JSON-RPC call.
 * It avoids wagmi on purpose, so the home page doesn't load the wallet code.
 */
function useLatestBlock(url: string): BlockState {
  // Tagged with its URL, so a network switch reads as loading until the new RPC answers.
  const [state, setState] = useState<{ url: string; value: BlockState } | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function poll() {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
          })
          const json = (await res.json()) as { result?: string }
          if (!cancelled) {
            setState({ url, value: json.result ? { status: "ok", block: BigInt(json.result) } : { status: "error" } })
          }
        } catch {
          if (!cancelled) setState({ url, value: { status: "error" } })
        }
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS)
    }

    void poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [url])

  return state?.url === url ? state.value : { status: "loading" }
}

/** Live block height from the selected network's RPC, and how many templates can deploy there. */
export function NetworkStatus() {
  const { chain } = useNetwork()
  const latest = useLatestBlock(rpcUrl(chain))
  const count = Object.keys(factoriesFor(chain.id)).length

  return (
    <dl className="glass grid gap-4 rounded-3xl p-6 sm:grid-cols-3">
      <div>
        <dt className="text-sm text-muted-foreground">Network</dt>
        <dd className="mt-1 font-medium">
          {chain.name} <span className="font-mono text-sm text-muted-foreground">({chain.id})</span>
        </dd>
      </div>
      <div>
        <dt className="text-sm text-muted-foreground">Latest block</dt>
        <dd className="mt-1 font-mono">
          {latest.status === "error"
            ? "RPC not reachable"
            : latest.status === "loading"
              ? "Loading"
              : latest.block.toLocaleString("en-US")}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-muted-foreground">Templates available</dt>
        <dd className="mt-1 font-medium">{count} of 3</dd>
      </div>
    </dl>
  )
}
