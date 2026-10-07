import Link from "next/link"
import { ArrowRight, Droplets } from "lucide-react"
import { TemplateCard } from "@/components/deploy/template-card"
import { NetworkStatus } from "@/components/network/network-status"
import { PageHeader } from "@/components/page-header"
import { Section } from "@/components/section"
import { templates } from "@/config/templates"
import { site } from "@/lib/site"

const notes = [
  {
    title: "No fees",
    body: "You pay network gas and nothing else. Uzo takes no cut of the deploy, the supply or any tips.",
  },
  {
    title: "No custody",
    body: "You sign from your own wallet. Uzo never holds your keys, your tokens or your tips.",
  },
  {
    title: "No admin keys",
    body: "The factories have no owner and cannot be upgraded. Uzo has no control over what you deploy.",
  },
  {
    title: "Tested, not audited",
    body: "Every template has unit, fuzz and invariant tests. No outside firm has reviewed them yet.",
  },
]

export default function HomePage() {
  return (
    <>
      <PageHeader
        eyebrow="Uzo Deploy"
        title="Deploy tested contracts to BOT Chain"
        lede="A token, an NFT collection or a tip jar, from your own wallet, in four steps. Every contract is verified on BOTScan automatically."
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href="/deploy"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start deploying
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <a
            href={site.links.faucet}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-glass-border px-6 font-medium hover:bg-foreground/5"
          >
            <Droplets className="size-4" aria-hidden="true" />
            Get free testnet BOT
          </a>
        </div>
      </PageHeader>

      <Section id="status" eyebrow="Network" title="Try it on testnet first">
        <p className="mb-6 max-w-2xl text-muted-foreground">
          New visitors start on testnet, where gas is free from the faucet. Switch to mainnet from the menu when you
          are ready.
        </p>
        <NetworkStatus />
      </Section>

      <Section id="templates" eyebrow="Templates" title="Three templates" action={{ href: "/deploy", label: "All templates" }}>
        <div className="grid gap-6 md:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard key={t.key} template={t} />
          ))}
        </div>
      </Section>

      <Section id="honesty" eyebrow="How it works" title="What Uzo does and does not do">
        <ul className="grid gap-6 sm:grid-cols-2">
          {notes.map((n) => (
            <li key={n.title} className="glass rounded-3xl p-6">
              <h3 className="font-medium">{n.title}</h3>
              <p className="mt-2 text-muted-foreground">{n.body}</p>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
