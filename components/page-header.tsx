import type { ReactNode } from "react"
import { Art } from "@/components/brand"
import type { ArtName } from "@/lib/art"
import { cn } from "@/lib/utils"

type PageHeaderProps = {
  eyebrow: string
  title: ReactNode
  lede: ReactNode
  /** Glass art shown beside the text on wide screens and above it on phones. */
  art?: ArtName
  children?: ReactNode
}

/**
 * Top of a page: the page's only h1, in the website's tight Geist headline.
 * The entrance is CSS and moves only, never hides, so the headline paints with the first HTML.
 */
export function PageHeader({ eyebrow, title, lede, art, children }: PageHeaderProps) {
  return (
    <header className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 sm:pt-16 sm:pb-20">
      <div className={cn("grid items-center gap-8", art && "md:grid-cols-[1.3fr_1fr]")}>
        <div className="animate-rise grid max-w-3xl justify-items-start gap-6">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="text-[2.6rem] sm:text-[3.6rem] lg:text-[4.6rem]">{title}</h1>
          <p className="max-w-xl text-[1.05rem] leading-relaxed text-ink-2 sm:text-[1.2rem]">{lede}</p>
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
        {art ? (
          <div className="art-glow order-first mx-auto w-[min(70%,300px)] md:order-none md:w-full md:max-w-[420px]">
            <Art name={art} priority className="float" />
          </div>
        ) : null}
      </div>
    </header>
  )
}
