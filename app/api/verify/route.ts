import { NextResponse } from "next/server"
import { isAddress, isHash } from "viem"
import { z } from "zod"
import { VerifyError, verifyInstance } from "@/lib/botscan"
import { botChain, botChainTestnet } from "@/lib/chains"
import { clientIp, createRateLimiter } from "@/lib/rate-limit"

// Submitting and waiting on BOTScan takes up to about 50 seconds.
export const maxDuration = 60

// Each call can submit to BOTScan, so one caller gets 10 every 10 minutes. The deploy page
// retries a pending result up to 4 times, well inside this.
const limit = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 })

const body = z.object({
  chainId: z.union([z.literal(botChainTestnet.id), z.literal(botChain.id)]),
  address: z.string().refine((v) => isAddress(v, { strict: false }), "Invalid address"),
  txHash: z.string().refine((v) => isHash(v), "Invalid transaction hash").optional(),
})

/**
 * POST { chainId, address, txHash? }. Verifies an instance created by a Uzo factory, using
 * our own build's standard JSON input. Never accepts source code from the client.
 * Idempotent: an already verified contract returns "already verified".
 * Rate limited per IP.
 */
export async function POST(request: Request) {
  const { ok, retryAfter } = limit(clientIp(request.headers))
  if (!ok) {
    return NextResponse.json(
      { error: `Too many verification requests. Try again in ${retryAfter} seconds.` },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    )
  }
  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Send chainId (968 or 677), address and optionally txHash." }, { status: 400 })
  }
  const { chainId, address, txHash } = parsed.data
  const chain = chainId === botChain.id ? botChain : botChainTestnet
  try {
    const result = await verifyInstance(chain, address, txHash as `0x${string}` | undefined)
    return NextResponse.json(result, { status: result.status === "pending" ? 202 : 200 })
  } catch (error) {
    if (error instanceof VerifyError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("verify failed", error)
    return NextResponse.json({ error: "Verification failed. Try again shortly." }, { status: 500 })
  }
}
