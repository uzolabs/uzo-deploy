import Link from "next/link"
import { Arrow, Art } from "@/components/brand"
import { TemplateCard } from "@/components/deploy/template-card"
import { NetworkStatus } from "@/components/network/network-status"
import { Section } from "@/components/section"
import { templates } from "@/config/templates"
import { site } from "@/lib/site"

const notes = [
  {
    title: "One small fee",
    body: "Each deploy costs network gas plus a fixed 0.1 BOT fee, shown before you sign. Uzo takes no cut of your supply or any tips.",
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

const steps = ["Pick a template", "Fill in a short form", "Check the review", "Sign once"]

export default function HomePage() {
  return (
    <>
      <header className="mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-6 sm:pt-12 sm:pb-20">
        <div className="grid items-center gap-6 md:grid-cols-[1.15fr_1fr] md:gap-4">
          <div className="animate-rise grid justify-items-start gap-6">
            <p className="eyebrow">Uzo Deploy on BOT Chain</p>
            <h1 className="text-[2.6rem] sm:text-[3.8rem] lg:text-[4.9rem]">
              Deploy tested contracts <span className="text-grad">in four steps</span>
            </h1>
            <p className="max-w-xl text-[1.05rem] leading-relaxed text-ink-2 sm:text-[1.2rem]">
              A token, an NFT collection or a tip jar, from your own wallet. Every contract is verified on BOTScan
              automatically.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/deploy"
                className="btn-grad group inline-flex min-h-12 items-center gap-2.5 rounded-full px-[22px] text-[0.95rem] font-semibold"
              >
                Start deploying
                <Arrow />
              </Link>
              <a
                href={site.links.faucet}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center rounded-full border border-line-2 bg-[var(--glass)] px-[22px] text-[0.95rem] font-semibold backdrop-blur-[14px] transition-colors hover:bg-[var(--glass-strong)]"
              >
                Get free testnet BOT
              </a>
            </div>
            <ol className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {steps.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ochre-hi">0{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="art-glow order-first mx-auto w-[min(88%,380px)] md:order-none md:w-full md:max-w-[560px]">
            <Art name="hero" priority sizes="(min-width: 768px) 560px, 88vw" className="float" />
          </div>
        </div>
      </header>

      <Section
        id="templates"
        eyebrow="Templates"
        title={
          <>
            Three templates, <span className="text-grad">no code</span>
          </>
        }
        lede="Each one is a small, fixed contract with no owner tricks. Read what it can and cannot do before you sign."
        action={{ href: "/deploy", label: "All templates" }}
      >
        <div className="grid gap-6 md:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard key={t.key} template={t} />
          ))}
        </div>
      </Section>

      <Section
        id="status"
        eyebrow="Network"
        title="Live on mainnet"
        lede="Uzo Deploy starts on BOT Chain mainnet. Want to practise first? Switch to testnet from the menu, where gas is free from the faucet."
      >
        <NetworkStatus />
      </Section>

      <Section id="honesty" eyebrow="How it works" title="What Uzo does and does not do">
        <ul className="grid gap-6 sm:grid-cols-2">
          {notes.map((n, i) => (
            <li key={n.title} className="glass rounded-3xl p-6 sm:p-7">
              <span className="font-mono text-xs text-ochre-hi">0{i + 1}</span>
              <h3 className="mt-3 text-xl">{n.title}</h3>
              <p className="mt-2 text-ink-2">{n.body}</p>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
