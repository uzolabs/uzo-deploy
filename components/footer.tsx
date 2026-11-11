import Link from "next/link"
import { Arrow, Art, Logo } from "@/components/brand"
import { footerColumns, site } from "@/lib/site"

const linkClass = "rounded-sm text-ink-2 underline-offset-4 transition-colors hover:text-ochre-hi"
const headClass = "font-mono text-xs font-normal tracking-[0.08em] text-muted-foreground uppercase"

/** Closing call to action, then the site map, the big faded name and the legal lines. */
export function Footer() {
  return (
    <footer className="mt-24 overflow-x-clip">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section
          aria-labelledby="cta-title"
          className="glass relative grid items-center gap-8 overflow-hidden rounded-3xl p-7 sm:p-10 md:grid-cols-[1.4fr_1fr] md:p-14"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-1/3 -right-1/4 size-[36rem] rounded-full bg-[radial-gradient(circle,rgba(217,164,65,0.2),transparent_65%)]"
          />
          <div className="relative grid justify-items-start gap-5">
            <p className="eyebrow">Ready when you are</p>
            <h2 id="cta-title" className="text-[2rem] sm:text-[2.75rem] lg:text-[3.3rem]">
              Deploy your first contract <span className="text-grad">on BOT Chain</span>
            </h2>
            <p className="max-w-md text-lg text-ink-2">
              Practice on testnet with free tBOT. On mainnet a deploy costs gas plus a 0.1 BOT fee.
            </p>
            <div className="flex flex-wrap items-center gap-3">
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
                Get free tBOT
              </a>
            </div>
          </div>
          <div className="art-glow relative mx-auto hidden w-full max-w-[320px] md:block">
            <Art name="deploy" sizes="320px" className="float" />
          </div>
        </section>

        <div className="mt-20 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1.4fr_repeat(5,1fr)] lg:gap-8">
          <div className="col-span-full grid content-start gap-4 lg:col-span-1">
            <Link href="/" className="w-fit rounded-full" aria-label={`${site.name} home`}>
              <Logo />
            </Link>
            <p className="max-w-[22rem] text-sm text-muted-foreground">
              Tested contract templates for BOT Chain, deployed from your own wallet. No custody, no admin keys.
              Built in Lagos.
            </p>
          </div>

          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className={headClass}>{column.title}</h2>
              <ul className="mt-4 grid gap-2.5 text-sm">
                {column.links
                  .filter((link) => link.href.trim() !== "")
                  .map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("/") ? (
                        <Link href={link.href} className={linkClass}>
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          {...(link.href.startsWith("mailto:") ? {} : { target: "_blank", rel: "noreferrer" })}
                          className={linkClass}
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
              </ul>
            </nav>
          ))}
        </div>

        <p aria-hidden="true" className="footer-word mt-14 -mb-[0.12em] text-center">
          {site.name}
        </p>

        <p className="border-t border-line py-8 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {site.org}. {site.org} is an independent project and is not affiliated with or
          endorsed by BOT Chain. MIT licensed.
        </p>
      </div>
    </footer>
  )
}
