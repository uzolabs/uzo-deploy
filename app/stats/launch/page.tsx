import type { Metadata } from "next"
import { connection } from "next/server"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { explorerAddress, explorerTx, networks, type BotChain } from "@/lib/chains"
import { shortAddress } from "@/lib/format"
import { launch } from "@/lib/server/data"
import { networkParam } from "@/lib/server/lookup"
import type { AddressActivity } from "@/lib/stats"

// Internal: not linked from anywhere and kept out of search.
export const metadata: Metadata = {
  title: "Launch report",
  robots: { index: false, follow: false },
}

const DAY = 86_400
const DEFAULT_DAYS = 7

/** `since` may be unix seconds or a date like 2026-10-01 (read as UTC). */
function parseSince(raw: string | string[] | undefined) {
  const now = Math.floor(Date.now() / 1000)
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value && /^\d+$/.test(value)) return Number(value)
  const parsed = value ? Date.parse(value) : NaN
  return Number.isNaN(parsed) ? now - DEFAULT_DAYS * DAY : Math.floor(parsed / 1000)
}

const isoDay = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10)
const when = (seconds: number) =>
  new Date(seconds * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })

export default async function LaunchPage({ searchParams }: PageProps<"/stats/launch">) {
  await connection()
  const query = await searchParams
  const network = networkParam(query.network) ?? "testnet"
  const chain = networks[network]
  const since = parseSince(query.since)
  const report = await launch(chain, since).catch(() => undefined)

  return (
    <>
      <PageHeader
        eyebrow="Internal"
        title="Launch report"
        lede={`Every address that deployed or tipped on ${chain.name} since ${when(since)} UTC. Team wallets are listed on their own at the end.`}
      >
        <form className="flex flex-wrap items-end gap-3" method="get">
          <label className="grid gap-1 text-sm">
            Since
            <input
              type="date"
              name="since"
              defaultValue={isoDay(since)}
              className="h-11 rounded-xl border border-glass-border bg-foreground/5 px-3 text-base"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Network
            <select
              name="network"
              defaultValue={network}
              className="h-11 rounded-xl border border-glass-border bg-foreground/5 px-3 text-base"
            >
              <option value="testnet">Testnet</option>
              <option value="mainnet">Mainnet</option>
            </select>
          </label>
          <Button type="submit" variant="outline" className="h-11 rounded-full">
            Update
          </Button>
        </form>
      </PageHeader>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 sm:px-6">
        {!report ? (
          <p>Could not read {chain.name} right now. Try again in a few minutes.</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {(
                [
                  ["Independent addresses", report.totals.independentAddresses],
                  ["Their interactions", report.totals.independentInteractions],
                  ["Team interactions", report.totals.teamInteractions],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="glass grid gap-1 rounded-2xl p-4">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{value.toLocaleString("en-US")}</dd>
                </div>
              ))}
            </dl>

            <section aria-labelledby="independent" className="grid gap-4">
              <h2 id="independent" className="font-display text-2xl">
                Independent addresses
              </h2>
              {report.independent.length === 0 ? (
                <p className="text-muted-foreground">None in this period.</p>
              ) : (
                <ul className="grid gap-3">
                  {report.independent.map((a) => (
                    <ActivityRow key={a.address} chain={chain} activity={a} />
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="team" className="grid gap-4">
              <h2 id="team" className="font-display text-2xl">
                Team wallets
              </h2>
              <p className="text-sm text-muted-foreground">
                From config/team-addresses.json. Not counted above or on the public stats page.
              </p>
              {report.team.length === 0 ? (
                <p className="text-muted-foreground">No team activity in this period.</p>
              ) : (
                <ul className="grid gap-3">
                  {report.team.map((a) => (
                    <ActivityRow key={a.address} chain={chain} activity={a} label={a.label} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </>
  )
}

function ActivityRow({ chain, activity, label }: { chain: BotChain; activity: AddressActivity; label?: string }) {
  const { address, deployments, tips, interactions } = activity
  return (
    <li className="glass rounded-2xl p-4">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2">
          <span className="font-mono text-sm break-all">
            {label ? <span className="mr-2 font-sans font-medium">{label}</span> : null}
            {address}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {deployments} {deployments === 1 ? "deploy" : "deploys"}, {tips} {tips === 1 ? "tip" : "tips"}
          </span>
        </summary>
        <ol className="mt-3 grid gap-1 text-sm">
          <li>
            <a href={explorerAddress(chain, address)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              Address on BOTScan
            </a>
          </li>
          {interactions.map((i) => (
            <li key={`${i.txHash}-${i.kind}-${i.contract}`} className="flex flex-wrap gap-x-3">
              <span className="text-muted-foreground">{when(i.timestamp)}</span>
              <span>{i.kind === "deploy" ? "Deployed" : "Tipped"}</span>
              <a href={explorerTx(chain, i.txHash)} target="_blank" rel="noreferrer" className="font-mono underline underline-offset-4">
                {shortAddress(i.txHash)}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </li>
  )
}
