import type { Metadata } from "next"
import { TemplateCard } from "@/components/deploy/template-card"
import { PageHeader } from "@/components/page-header"
import { templates } from "@/config/templates"

export const metadata: Metadata = {
  title: "Templates",
  description: "Pick a template to deploy to BOT Chain: a token, an NFT collection or a tip jar.",
}

export default function DeployPage() {
  return (
    <>
      <PageHeader
        eyebrow="Templates"
        title="Pick a template"
        lede="Each one is a fixed, tested contract. You fill in a few fields, check the details, and sign one transaction."
      />
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard key={t.key} template={t} />
          ))}
        </div>
      </div>
    </>
  )
}
