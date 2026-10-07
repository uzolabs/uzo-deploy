import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"
import { Reveal } from "@/components/reveal"
import { cn } from "@/lib/utils"

type SectionProps = {
  id: string
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  /** Optional link to the full page for this topic. */
  action?: { href: string; label: string }
  children: ReactNode
  className?: string
}

/** Shared section shell: anchor offset for the sticky nav, eyebrow, Reggae One title. */
export function Section({ id, eyebrow, title, lede, action, children, className }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24 py-20 sm:py-28", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-[0.14em] text-primary uppercase">{eyebrow}</p>
            <h2
              id={`${id}-title`}
              className="mt-3 font-display text-[2.25rem] leading-[1.12] text-balance sm:text-[2.75rem] lg:text-[3rem]"
            >
              {title}
            </h2>
            {lede ? <p className="mt-4 text-lg text-muted-foreground">{lede}</p> : null}
          </div>
          {action ? <MoreLink {...action} className="shrink-0" /> : null}
        </Reveal>
        <div className="mt-12 sm:mt-14">{children}</div>
      </div>
    </section>
  )
}

export function MoreLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 self-start rounded-full py-1 font-medium text-primary underline-offset-4 hover:underline",
        className
      )}
    >
      {label}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  )
}
