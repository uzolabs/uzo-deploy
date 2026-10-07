import { NextResponse } from "next/server"
import { explorerUrl, networks } from "@/lib/chains"
import { cacheWorks } from "@/lib/server/cache"
import { publicClient } from "@/lib/server/client"

export const dynamic = "force-dynamic"

const within = <T,>(ms: number, p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))])

async function check(run: () => Promise<unknown>) {
  const started = Date.now()
  try {
    await within(8000, run())
    return { ok: true, ms: Date.now() - started }
  } catch (error) {
    return { ok: false, ms: Date.now() - started, error: error instanceof Error ? error.message : "failed" }
  }
}

/** GET: RPC and BOTScan for each network, and the in-memory cache. 503 if anything is down. */
export async function GET() {
  const entries = await Promise.all(
    Object.entries(networks).map(async ([key, chain]) => {
      const [rpc, botscan] = await Promise.all([
        check(() => publicClient(chain).getBlockNumber()),
        check(async () => {
          const res = await fetch(`${explorerUrl(chain)}/api/v2/stats`, { cache: "no-store" })
          if (!res.ok) throw new Error(`status ${res.status}`)
        }),
      ])
      return [key, { chainId: chain.id, rpc, botscan }] as const
    }),
  )
  const cache = await check(async () => {
    if (!(await cacheWorks())) throw new Error("read back a different value")
  })
  const body = { networks: Object.fromEntries(entries), cache }
  const ok = cache.ok && entries.every(([, n]) => n.rpc.ok && n.botscan.ok)
  return NextResponse.json({ ok, ...body }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } })
}
