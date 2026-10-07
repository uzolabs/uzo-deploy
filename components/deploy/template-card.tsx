"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useNetwork } from "@/components/network/network-provider"
import { Badge } from "@/components/ui/badge"
import type { Template } from "@/config/templates"
import { isAvailable } from "@/lib/deployments"
import { cn } from "@/lib/utils"

/** One template in the gallery: purpose, whether it holds funds, its risk and where it is available. */
export function TemplateCard({ template }: { template: Template }) {
  const { chain, network } = useNetwork()
  const available = isAvailable(chain.id, template.key)

  return (
    <article className="glass flex h-full flex-col rounded-3xl p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-2xl leading-tight">{template.name}</h3>
        <span className="font-mono text-xs text-muted-foreground">v{template.version}</span>
      </div>
      <p className="mt-3 text-muted-foreground">{template.summary}</p>

      <dl className="mt-6 grid gap-3 text-sm">
        <div>
          <dt className="font-medium">Holds funds: {template.holdsFunds.value ? "yes" : "no"}</dt>
          <dd className="text-muted-foreground">{template.holdsFunds.note}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 font-medium">
            Risk
            <Badge
              variant="outline"
              className={cn(
                "h-5 rounded-full px-2 text-xs",
                template.risk.level === "Low" ? "border-primary/50 text-primary" : "border-accent/60 text-accent",
              )}
            >
              {template.risk.level}
            </Badge>
          </dt>
          <dd className="text-muted-foreground">{template.risk.note}</dd>
        </div>
      </dl>

      <div className="mt-auto pt-6">
        {available ? (
          <Link
            href={`/deploy/${template.slug}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Deploy on {network === "testnet" ? "testnet" : "mainnet"}
            <ArrowRight className="size-4" aria-hidden="true" />
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
