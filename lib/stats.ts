// Decodes factory and tip jar events and aggregates them. Pure functions only, so the counts
// on /stats and /stats/launch can be tested against fixed inputs.
import { decodeEventLog, getAddress, toEventSelector, type Address, type Hash, type Hex } from "viem"
import { uzoTipJarAbi, uzoTokenFactoryAbi } from "@/lib/abi/generated"
import { bytes32ToId } from "@/lib/verify"

const deployedEvent = uzoTokenFactoryAbi.filter((x) => x.type === "event" && x.name === "Deployed")
const tippedEvent = uzoTipJarAbi.filter((x) => x.type === "event" && x.name === "Tipped")

export const DEPLOYED_TOPIC = toEventSelector(deployedEvent[0])
export const TIPPED_TOPIC = toEventSelector(tippedEvent[0])

/** The native coin in Tipped, where token is address(0). */
export const NATIVE = "0x0000000000000000000000000000000000000000" as Address

type EventLog = {
  address: Address
  topics: Hex[]
  data: Hex
  blockNumber: bigint
  transactionHash: Hash
  logIndex: number
  timestamp: number
}

// Everything below is JSON safe: amounts and block numbers are decimal strings.

export type Deployment = {
  factory: Address
  deployer: Address
  instance: Address
  templateId: string
  version: number
  txHash: Hash
  blockNumber: string
  timestamp: number
}

export type Tip = {
  jar: Address
  from: Address
  /** address(0) for the native coin. */
  token: Address
  amount: string
  message: string
  txHash: Hash
  blockNumber: string
  timestamp: number
}

export function decodeDeployed(log: EventLog): Deployment | undefined {
  try {
    const { args } = decodeEventLog({ abi: deployedEvent, data: log.data, topics: log.topics as never })
    return {
      factory: getAddress(log.address),
      deployer: getAddress(args.deployer),
      instance: getAddress(args.instance),
      templateId: bytes32ToId(args.templateId),
      version: args.version,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber.toString(),
      timestamp: log.timestamp,
    }
  } catch {
    return undefined
  }
}

export function decodeTipped(log: EventLog): Tip | undefined {
  try {
    const { args } = decodeEventLog({ abi: tippedEvent, data: log.data, topics: log.topics as never })
    return {
      jar: getAddress(log.address),
      from: getAddress(args.from),
      token: getAddress(args.token),
      amount: args.amount.toString(),
      message: args.message,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber.toString(),
      timestamp: log.timestamp,
    }
  } catch {
    return undefined
  }
}

const lower = (a: string) => a.toLowerCase()

export type TipSummary = {
  /** Sum per token address, address(0) for the native coin. */
  totals: { token: Address; amount: string }[]
  count: number
  tippers: number
  /** Newest first. */
  recent: Tip[]
}

export function summariseTips(tips: Tip[], recent = 20): TipSummary {
  const totals = new Map<Address, bigint>()
  for (const t of tips) totals.set(t.token, (totals.get(t.token) ?? 0n) + BigInt(t.amount))
  return {
    totals: [...totals].map(([token, amount]) => ({ token, amount: amount.toString() })),
    count: tips.length,
    tippers: new Set(tips.map((t) => lower(t.from))).size,
    recent: [...tips].reverse().slice(0, recent),
  }
}

export type DayCount = { date: string; deployments: number; tips: number }

export type Stats = {
  deployments: number
  byTemplate: Record<string, number>
  deployers: number
  tipJars: number
  tips: number
  tippers: number
  /** The last `days` UTC days, oldest first, ending today. */
  daily: DayCount[]
  /** Team activity left out of every number above, shown so the exclusion is visible. */
  excluded: { addresses: number; deployments: number; tips: number }
}

const DAY = 86_400

export const utcDate = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10)

/**
 * Counts only. Deployments are attributed to the deployer and tips to the sender; anything
 * done by a team address is excluded and reported separately.
 */
export function aggregateStats(
  deployments: Deployment[],
  tips: Tip[],
  team: readonly string[],
  now = Math.floor(Date.now() / 1000),
  days = 30,
): Stats {
  const isTeam = new Set(team.map(lower))
  const ours = deployments.filter((d) => !isTeam.has(lower(d.deployer)))
  const sent = tips.filter((t) => !isTeam.has(lower(t.from)))

  const byTemplate: Record<string, number> = {}
  for (const d of ours) byTemplate[d.templateId] = (byTemplate[d.templateId] ?? 0) + 1

  const today = Math.floor(now / DAY) * DAY
  const daily: DayCount[] = Array.from({ length: days }, (_, i) => ({
    date: utcDate(today - (days - 1 - i) * DAY),
    deployments: 0,
    tips: 0,
  }))
  const index = new Map(daily.map((d, i) => [d.date, i]))
  for (const d of ours) {
    const i = index.get(utcDate(d.timestamp))
    if (i !== undefined) daily[i].deployments++
  }
  for (const t of sent) {
    const i = index.get(utcDate(t.timestamp))
    if (i !== undefined) daily[i].tips++
  }

  return {
    deployments: ours.length,
    byTemplate,
    deployers: new Set(ours.map((d) => lower(d.deployer))).size,
    tipJars: ours.filter((d) => d.templateId === "uzo.tipjar").length,
    tips: sent.length,
    tippers: new Set(sent.map((t) => lower(t.from))).size,
    daily,
    excluded: {
      addresses: new Set([...deployments.map((d) => d.deployer), ...tips.map((t) => t.from)].filter((a) => isTeam.has(lower(a))).map(lower)).size,
      deployments: deployments.length - ours.length,
      tips: tips.length - sent.length,
    },
  }
}

export type Interaction = { kind: "deploy" | "tip"; txHash: Hash; timestamp: number; contract: Address }

export type AddressActivity = {
  address: Address
  deployments: number
  tips: number
  /** Oldest first. */
  interactions: Interaction[]
}

export type LaunchReport = {
  since: number
  independent: AddressActivity[]
  team: (AddressActivity & { label: string })[]
  totals: { independentAddresses: number; independentInteractions: number; teamInteractions: number }
}

/** Every address that deployed or tipped at or after `since`, split into independent and team. */
export function launchReport(
  deployments: Deployment[],
  tips: Tip[],
  team: readonly { address: string; label: string }[],
  since: number,
): LaunchReport {
  const byAddress = new Map<string, AddressActivity>()
  const touch = (address: Address) => {
    let a = byAddress.get(lower(address))
    if (!a) byAddress.set(lower(address), (a = { address, deployments: 0, tips: 0, interactions: [] }))
    return a
  }
  for (const d of deployments) {
    if (d.timestamp < since) continue
    const a = touch(d.deployer)
    a.deployments++
    a.interactions.push({ kind: "deploy", txHash: d.txHash, timestamp: d.timestamp, contract: d.instance })
  }
  for (const t of tips) {
    if (t.timestamp < since) continue
    const a = touch(t.from)
    a.tips++
    a.interactions.push({ kind: "tip", txHash: t.txHash, timestamp: t.timestamp, contract: t.jar })
  }
  const labels = new Map(team.map((t) => [lower(t.address), t.label]))
  const all = [...byAddress.values()]
  for (const a of all) a.interactions.sort((x, y) => x.timestamp - y.timestamp)
  const busiest = (x: AddressActivity, y: AddressActivity) => y.interactions.length - x.interactions.length
  const independent = all.filter((a) => !labels.has(lower(a.address))).sort(busiest)
  const teamRows = all
    .filter((a) => labels.has(lower(a.address)))
    .map((a) => ({ ...a, label: labels.get(lower(a.address))! }))
    .sort(busiest)
  const count = (rows: AddressActivity[]) => rows.reduce((n, a) => n + a.interactions.length, 0)
  return {
    since,
    independent,
    team: teamRows,
    totals: {
      independentAddresses: independent.length,
      independentInteractions: count(independent),
      teamInteractions: count(teamRows),
    },
  }
}
