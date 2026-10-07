import "server-only"
import { getAddress, isAddressEqual, type Address } from "viem"
import team from "@/config/team-addresses.json"
import type { BotChain } from "@/lib/chains"
import { factoriesFor } from "@/lib/deployments"
import { cached, expire } from "@/lib/server/cache"
import { scanLogs, withTimestamps } from "@/lib/server/logs"
import {
  DEPLOYED_TOPIC,
  TIPPED_TOPIC,
  aggregateStats,
  decodeDeployed,
  decodeTipped,
  launchReport,
  summariseTips,
  type Deployment,
  type Tip,
} from "@/lib/stats"

// Server reads behind the /api data routes. Every result is cached briefly in memory and the
// logs underneath are read incrementally, so a busy page costs a few RPC calls at most.

const SHORT = 30_000

const deployedKey = (chain: BotChain) => `deployed:${chain.id}`

export function teamAddresses(chainId: number) {
  return team.addresses.filter((a) => a.chains.includes(chainId))
}

/** Every Deployed event from our recorded factories, oldest first. */
export function deployedEvents(chain: BotChain): Promise<Deployment[]> {
  return cached(deployedKey(chain), SHORT, async () => {
    const factories = Object.values(factoriesFor(chain.id))
    if (factories.length === 0) return []
    const logs = await scanLogs(chain, "deployed", {
      address: factories.map((f) => getAddress(f.address)),
      topics: [DEPLOYED_TOPIC],
      fromBlock: BigInt(Math.min(...factories.map((f) => f.deployBlock))),
    })
    return (await withTimestamps(chain, logs)).map(decodeDeployed).filter((d) => d !== undefined)
  })
}

export async function deploymentsBy(chain: BotChain, deployer: Address) {
  return (await deployedEvents(chain)).filter((d) => isAddressEqual(d.deployer, deployer)).reverse()
}

// A contract deployed a moment ago is looked up straight away (the tip link, Manage), so a
// miss re-reads the logs once the cached copy is this old. The scan is incremental, so a
// reload costs one getLogs call.
const MISS_RELOAD_AFTER = 3_000

export async function deploymentOf(chain: BotChain, instance: Address) {
  const find = (all: Deployment[]) => all.find((d) => isAddressEqual(d.instance, instance))
  const found = find(await deployedEvents(chain))
  if (found || !expire(deployedKey(chain), MISS_RELOAD_AFTER)) return found
  return find(await deployedEvents(chain))
}

/**
 * Every Tipped event from a jar our factory created, oldest first. The scan filters on the
 * event only, then keeps logs from known jars, so a contract that copies the event is ignored.
 */
export function allTips(chain: BotChain): Promise<Tip[]> {
  return cached(`tips:${chain.id}`, SHORT, async () => {
    const factory = factoriesFor(chain.id).tipJar
    if (!factory) return []
    const jars = new Set(
      (await deployedEvents(chain)).filter((d) => d.templateId === "uzo.tipjar").map((d) => d.instance.toLowerCase()),
    )
    if (jars.size === 0) return []
    const logs = await scanLogs(chain, "tipped", { topics: [TIPPED_TOPIC], fromBlock: BigInt(factory.deployBlock) })
    const ours = logs.filter((l) => jars.has(l.address.toLowerCase()))
    return (await withTimestamps(chain, ours)).map(decodeTipped).filter((t) => t !== undefined)
  })
}

export async function tipsFor(chain: BotChain, jar: Address) {
  return summariseTips((await allTips(chain)).filter((t) => isAddressEqual(t.jar, jar)))
}

export function stats(chain: BotChain) {
  return cached(`stats:${chain.id}`, 5 * 60_000, async () => {
    const [deployments, tips] = await Promise.all([deployedEvents(chain), allTips(chain)])
    return aggregateStats(
      deployments,
      tips,
      teamAddresses(chain.id).map((a) => a.address),
    )
  })
}

export async function launch(chain: BotChain, since: number) {
  const [deployments, tips] = await Promise.all([deployedEvents(chain), allTips(chain)])
  return launchReport(deployments, tips, teamAddresses(chain.id), since)
}
