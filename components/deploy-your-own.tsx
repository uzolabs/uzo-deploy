import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { templateById } from "@/config/templates"

const pitch: Record<string, { line: string; cta: string }> = {
  "uzo.tipjar": { line: "Want a tip jar like this? Deploy your own and let people tip you.", cta: "Deploy your own tip jar" },
  "uzo.token": { line: "Want a token like this? Launch your own on BOT Chain in four steps.", cta: "Deploy your own token" },
  "uzo.nft": { line: "Want a collection like this? Launch your own NFTs on BOT Chain in four steps.", cta: "Deploy your own NFT collection" },
}

/** A quiet line at the foot of a deployed contract's page, pointing visitors to the same template. */
export function DeployYourOwn({ templateId }: { templateId: string }) {
  const template = templateById(templateId)
  const copy = pitch[templateId]
  if (!template || !copy) return null
  return (
    <aside className="mx-auto mt-12 max-w-xl border-t border-glass-border px-4 pt-6 text-center text-sm text-muted-foreground sm:px-6">
      <p>{copy.line}</p>
      <Link
        href={`/deploy/${template.slug}`}
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
      >
        {copy.cta}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </aside>
  )
}
