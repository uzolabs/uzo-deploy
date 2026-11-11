"use client"

import Link from "next/link"
import { Arrow, Art } from "@/components/brand"
import { useNetwork } from "@/components/network/network-provider"
import type { Template, TemplateKey } from "@/config/templates"
import type { ArtName } from "@/lib/art"
import { isAvailable } from "@/lib/deployments"
import { cn } from "@/lib/utils"

const artFor: Record<TemplateKey, ArtName> = { token: "token", nft: "nft", tipJar: "tipjar" }

/** One template in the gallery: purpose, whether it holds funds, its risk and where it is available. */
export function TemplateCard({ template, headingLevel = 3 }: { template: Template; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3"
  const { chain, network } = useNetwork()
  const available = isAvailable(chain.id, template.key)

  return (
    <article className="glass group/card relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-line-2">
      <div className="art-glow mx-auto -mt-2 mb-2 w-[min(60%,200px)]">
        <Art name={artFor[template.key]} sizes="200px" className="transition-transform duration-500 group-hover/card:-translate-y-1.5" />
      </div>

      <div className="flex items-start justify-between gap-3">
        <Heading className="text-2xl">{template.name}</Heading>
        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-xs text-muted-foreground">
          v{template.version}
        </span>
      </div>
      <p className="mt-3 text-ink-2">{template.summary}</p>

      <dl className="mt-6 grid gap-4 border-t border-line pt-5 text-sm">
        <div>
          <dt className="font-medium">Holds funds: {template.holdsFunds.value ? "yes" : "no"}</dt>
          <dd className="mt-1 text-muted-foreground">{template.holdsFunds.note}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 font-medium">
            Risk
            <span
              className={cn(
                "inline-flex h-5 items-center rounded-full border px-2 text-xs",
                template.risk.level === "Low" ? "border-gold/50 text-ochre-hi" : "border-ember/60 text-ember",
              )}
            >
              {template.risk.level}
            </span>
          </dt>
          <dd className="mt-1 text-muted-foreground">{template.risk.note}</dd>
        </div>
      </dl>

      <div className="mt-auto pt-6">
        {available ? (
          <Link
            href={`/deploy/${template.slug}`}
            className="btn-grad group inline-flex min-h-11 items-center gap-2.5 rounded-full px-5 text-[0.95rem] font-semibold"
          >
            Deploy on {network === "testnet" ? "testnet" : "mainnet"}
            <Arrow />
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">
            Not available on {chain.name} yet. Switch to testnet to try it for free.
          </p>
        )}
      </div>
    </article>
  )
}
