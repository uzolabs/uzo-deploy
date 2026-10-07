import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense, type ReactNode } from "react"
import { PageHeader } from "@/components/page-header"
import { DailyChart } from "@/components/stats/daily-chart"
import { templates } from "@/config/templates"
import { networks, type NetworkKey } from "@/lib/chains"
import { stats } from "@/lib/server/data"

export const metadata: Metadata = {
  title: "Stats",
  description: "Counts of contracts deployed and tips sent through Uzo Deploy on BOT Chain. Counts only.",
}

export default function StatsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stats"
        title="Usage in numbers"
        lede="Counts read from the Uzo factories and tip jars on chain. Activity from Uzo team wallets is left out and shown separately."
      />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 sm:px-6">
        {(["mainnet", "testnet"] as const).map((n) => (
          <Suspense key={n} fallback={<Shell network={n}>Counting. This can take up to half a minute.</Shell>}>
            <NetworkStats network={n} />
          </Suspense>
        ))}
      </div>
    </>
  )
}

function Shell({ network, children }: { network: NetworkKey; children: ReactNode }) {
  return (
    <section aria-labelledby={`stats-${network}`} className="glass grid gap-6 rounded-3xl p-6 sm:p-8">
      <h2 id={`stats-${network}`} className="font-display text-2xl">
        {networks[network].name}
      </h2>
      {children}
    </section>
  )
}

async function NetworkStats({ network }: { network: NetworkKey }) {
  await connection()
  const s = await stats(networks[network]).catch(() => undefined)
  if (!s) {
    return (
      <Shell network={network}>
        <p>Could not read {networks[network].name} right now. Try again in a few minutes.</p>
      </Shell>
    )
  }
  const max = Math.max(1, ...s.daily.map((d) => Math.max(d.deployments, d.tips)))
  const tiles: [string, number][] = [
    ["Contracts deployed", s.deployments],
    ...templates.map((t): [string, number] => [`${t.name}s`, s.byTemplate[t.id] ?? 0]),
    ["Unique deployers", s.deployers],
    ["Tips sent", s.tips],
    ["Unique tippers", s.tippers],
  ]
  return (
    <Shell network={network}>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="grid content-start gap-1 rounded-2xl bg-foreground/5 p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{value.toLocaleString("en-US")}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-8 lg:grid-cols-2">
        <DailyChart days={s.daily} field="deployments" max={max} title="Deployments per day" unit={["deployment", "deployments"]} />
        <DailyChart days={s.daily} field="tips" max={max} title="Tips per day" unit={["tip", "tips"]} />
      </div>
      <p className="text-sm text-muted-foreground">
        Left out: {s.excluded.deployments.toLocaleString("en-US")} deployments and {s.excluded.tips.toLocaleString("en-US")}{" "}
        tips from {s.excluded.addresses} Uzo team {s.excluded.addresses === 1 ? "wallet" : "wallets"}. Counts refresh
        every five minutes. Days are in UTC.
      </p>
    </Shell>
  )
}
