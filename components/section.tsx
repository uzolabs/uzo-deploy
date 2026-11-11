import Link from "next/link"
import type { ReactNode } from "react"
import { Arrow } from "@/components/brand"
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

/** Shared section shell: anchor offset for the sticky nav, eyebrow pill, tight headline. */
export function Section({ id, eyebrow, title, lede, action, children, className }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24 py-20 sm:py-28", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="grid max-w-2xl justify-items-start gap-[18px]">
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={`${id}-title`} className="text-[2rem] sm:text-[2.75rem] lg:text-[3.3rem]">
              {title}
            </h2>
            {lede ? <p className="text-lg text-ink-2">{lede}</p> : null}
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
        "group inline-flex items-center gap-2 self-start rounded-full py-1 font-medium text-ochre-hi underline-offset-4 hover:underline",
        className
      )}
    >
      {label}
      <Arrow />
    </Link>
  )
}
