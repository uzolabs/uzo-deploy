import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DeployFlow } from "@/components/deploy/deploy-flow"
import { PageHeader } from "@/components/page-header"
import { templateBySlug, templates } from "@/config/templates"
import { isVerified } from "@/lib/botscan"
import { botChain, botChainTestnet } from "@/lib/chains"
import { factoryFor } from "@/lib/deployments"


export function generateStaticParams() {
  return templates.map((t) => ({ template: t.slug }))
}

export async function generateMetadata(props: PageProps<"/deploy/[template]">): Promise<Metadata> {
  const template = templateBySlug((await props.params).template)
  return template ? { title: `Deploy ${template.name}`, description: template.summary } : {}
}

/** Asks BOTScan whether each network's factory is verified. null when BOTScan does not answer. */
async function factoryVerification(key: (typeof templates)[number]["key"]) {
  const entries = await Promise.all(
    [botChainTestnet, botChain].map(async (chain) => {
      const factory = factoryFor(chain.id, key)
      if (!factory) return [chain.id, null] as const
      try {
        return [chain.id, await isVerified(chain, factory.address)] as const
      } catch {
        return [chain.id, null] as const
      }
    }),
  )
  return Object.fromEntries(entries) as Record<number, boolean | null>
}

export default async function DeployTemplatePage(props: PageProps<"/deploy/[template]">) {
  const template = templateBySlug((await props.params).template)
  if (!template) notFound()
  const verified = await factoryVerification(template.key)

  return (
    <>
      <PageHeader eyebrow="Deploy" title={template.name} lede={template.summary} />
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <DeployFlow template={template} verified={verified} />
      </div>
    </>
  )
}
