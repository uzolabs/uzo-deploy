import type { ReactNode } from "react"
import { Reveal } from "@/components/reveal"
import { UliCrescent } from "@/components/uli/crescent"
import { UliZigzag } from "@/components/uli/zigzag"

type PageHeaderProps = {
  eyebrow: string
  title: ReactNode
  lede: ReactNode
  children?: ReactNode
}

/** Top of an inner page: the page's only h1, in Reggae One, kept to two lines at most. */
export function PageHeader({ eyebrow, title, lede, children }: PageHeaderProps) {
  return (
    <header className="relative overflow-x-clip">
      <UliCrescent className="pointer-events-none absolute top-6 right-[-3rem] size-56 text-primary/15 sm:right-4 lg:size-72" />
      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-14 sm:px-6 sm:pt-24 sm:pb-20">
        <Reveal className="max-w-3xl">
          <p className="text-sm font-medium tracking-[0.14em] text-primary uppercase">{eyebrow}</p>
          <h1 className="mt-4 font-display text-[2.5rem] leading-[1.08] tracking-tight text-balance sm:text-[3.25rem] lg:text-[4rem]">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">{lede}</p>
          {children ? <div className="mt-9">{children}</div> : null}
        </Reveal>
      </div>
      <UliZigzag />
    </header>
  )
}
