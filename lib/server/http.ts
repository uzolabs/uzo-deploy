import "server-only"
import { NextResponse } from "next/server"
import { getAddress, isAddress, type Address } from "viem"
import { chainById, type BotChain } from "@/lib/chains"

/** A 400 with a message the caller can act on. */
export class BadRequest extends Error {}

export function chainParam(params: URLSearchParams): BotChain {
  const chain = chainById(Number(params.get("chainId")))
  if (!chain) throw new BadRequest("Send chainId 968 (testnet) or 677 (mainnet).")
  return chain
}

export function addressParam(params: URLSearchParams, name: string): Address | undefined {
  const value = params.get(name)
  if (value === null) return undefined
  if (!isAddress(value, { strict: false })) throw new BadRequest(`${name} is not an address.`)
  return getAddress(value)
}

/** JSON with CDN cache headers. These shapes stay stable when the data moves to Uzo Index. */
export function cachedJson(body: unknown, seconds: number) {
  return NextResponse.json(body, {
    headers: {
      "cache-control": seconds > 0 ? `public, s-maxage=${seconds}, stale-while-revalidate=${seconds}` : "no-store",
    },
  })
}

export function errorJson(error: unknown, what: string) {
  if (error instanceof BadRequest) return NextResponse.json({ error: error.message }, { status: 400 })
  console.error(`${what} failed`, error)
  return NextResponse.json({ error: `Could not read ${what} from the chain. Try again shortly.` }, { status: 502 })
}
