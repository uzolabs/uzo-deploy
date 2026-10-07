import "server-only"
import { createPublicClient, http, type PublicClient } from "viem"
import { rpcUrl, type BotChain } from "@/lib/chains"

const clients = new Map<number, PublicClient>()

/** One viem client per chain, reused across requests. */
export function publicClient(chain: BotChain): PublicClient {
  let client = clients.get(chain.id)
  if (!client) {
    client = createPublicClient({ chain, transport: http(rpcUrl(chain), { timeout: 20_000, retryCount: 2 }) }) as PublicClient
    clients.set(chain.id, client)
  }
  return client
}
