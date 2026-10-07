import type { Address, Hash } from "viem"
import { describe, expect, it } from "vitest"
import { NATIVE, aggregateStats, launchReport, type Deployment, type Tip } from "@/lib/stats"

const addr = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Address
const hash = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as Hash

const DAY = 86_400
// 2026-10-07 12:00 UTC
const NOW = Date.UTC(2026, 9, 7, 12) / 1000

const alice = addr(0xa1)
const bob = addr(0xb0)
const team = addr(0xff)
const jar = addr(0x1a)

let n = 0
const deploy = (deployer: Address, templateId: string, timestamp: number): Deployment => ({
  factory: addr(0xf1),
  deployer,
  instance: addr(0x1000 + ++n),
  templateId,
  version: 1,
  txHash: hash(++n),
  blockNumber: String(n),
  timestamp,
})
const tip = (from: Address, timestamp: number): Tip => ({
  jar,
  from,
  token: NATIVE,
  amount: "1",
  message: "",
  txHash: hash(++n),
  blockNumber: String(n),
  timestamp,
})

const deployments = [
  deploy(alice, "uzo.token", NOW - 2 * DAY),
  deploy(alice, "uzo.tipjar", NOW),
  deploy(bob, "uzo.nft", NOW - 40 * DAY),
  // The team address in mixed case still has to match.
  deploy(team, "uzo.token", NOW),
]
const tips = [tip(bob, NOW), tip(bob, NOW - DAY), tip(alice, NOW), tip(team, NOW)]

describe("aggregate stats", () => {
  const s = aggregateStats(deployments, tips, [team.toUpperCase().replace("0X", "0x")], NOW)

  it("counts everything except the team", () => {
    expect(s.deployments).toBe(3)
    expect(s.byTemplate).toEqual({ "uzo.token": 1, "uzo.tipjar": 1, "uzo.nft": 1 })
    expect(s.deployers).toBe(2)
    expect(s.tipJars).toBe(1)
    expect(s.tips).toBe(3)
    expect(s.tippers).toBe(2)
    expect(s.excluded).toEqual({ addresses: 1, deployments: 1, tips: 1 })
  })

  it("buckets the last 30 UTC days, oldest first, ending today", () => {
    expect(s.daily).toHaveLength(30)
    expect(s.daily[29]).toEqual({ date: "2026-10-07", deployments: 1, tips: 2 })
    expect(s.daily[28]).toEqual({ date: "2026-10-06", deployments: 0, tips: 1 })
    expect(s.daily[27].deployments).toBe(1)
    expect(s.daily[0].date).toBe("2026-09-08")
    // The 40-day-old deploy counts in the total but not on the chart.
    expect(s.daily.reduce((t, d) => t + d.deployments, 0)).toBe(2)
  })
})

describe("launch report", () => {
  const r = launchReport(deployments, tips, [{ address: team, label: "Factory deployer" }], NOW - 3 * DAY)

  it("lists independent addresses, busiest first, and only activity since the cutoff", () => {
    expect(r.independent.map((a) => a.address)).toEqual([alice, bob])
    const a = r.independent[0]
    expect([a.deployments, a.tips]).toEqual([2, 1])
    expect(a.interactions.map((i) => i.timestamp)).toEqual([...a.interactions.map((i) => i.timestamp)].sort((x, y) => x - y))
    // Bob's old deploy is before the cutoff.
    expect(r.independent[1]).toMatchObject({ deployments: 0, tips: 2 })
  })

  it("keeps team wallets apart with their label", () => {
    expect(r.team).toHaveLength(1)
    expect(r.team[0]).toMatchObject({ address: team, label: "Factory deployer", deployments: 1, tips: 1 })
    expect(r.totals).toEqual({ independentAddresses: 2, independentInteractions: 5, teamInteractions: 2 })
  })

  it("links every interaction to its transaction and contract", () => {
    const tipped = r.independent[1].interactions[0]
    expect(tipped).toMatchObject({ kind: "tip", contract: jar })
    expect(tipped.txHash).toMatch(/^0x[0-9a-f]{64}$/)
  })
})
