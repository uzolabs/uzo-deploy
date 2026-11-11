import Link from "next/link"
import { Arrow, Art, Logo } from "@/components/brand"
import { TelegramIcon, XIcon } from "@/components/brand-icons"
import { navLinks, site } from "@/lib/site"

const pages = [{ label: "Home", href: "/" }, ...navLinks]

const external = [
  { label: "Docs", href: site.links.docs },
  { label: "GitHub", href: site.links.github },
  { label: "Uzo Labs", href: site.links.home },
  { label: "Testnet faucet", href: site.links.faucet },
]

const community = [
  { label: "Telegram channel", href: site.links.telegramChannel, Icon: TelegramIcon },
  { label: "Telegram community", href: site.links.telegramCommunity, Icon: TelegramIcon },
  { label: "X", href: site.links.x, Icon: XIcon },
]

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
              Pick a template, fill in a short form and sign once. Try it free on testnet first.
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
                Get free testnet BOT
              </a>
            </div>
          </div>
          <div className="art-glow relative mx-auto hidden w-full max-w-[320px] md:block">
            <Art name="deploy" sizes="320px" className="float" />
          </div>
        </section>

        <div className="mt-20 grid gap-10 sm:grid-cols-2 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div className="grid content-start gap-4 sm:col-span-2 md:col-span-1">
            <Link href="/" className="w-fit rounded-full" aria-label={`${site.name} home`}>
              <Logo />
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground">
              Templates are tested, not audited. Each deploy pays a fixed 0.1 BOT fee. Uzo holds no funds and keeps
              no admin keys over what you deploy.
            </p>
          </div>

          <nav aria-labelledby="footer-site">
            <h2 id="footer-site" className={headClass}>
              Site
            </h2>
            <ul className="mt-4 grid gap-3 text-sm">
              {pages.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-elsewhere">
            <h2 id="footer-elsewhere" className={headClass}>
              Elsewhere
            </h2>
            <ul className="mt-4 grid gap-3 text-sm">
              {external.map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noreferrer" className={linkClass}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-community">
            <h2 id="footer-community" className={headClass}>
              Community
            </h2>
            <ul className="mt-4 grid gap-3 text-sm">
              {community.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex items-center gap-2`}>
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p aria-hidden="true" className="footer-word mt-14 -mb-[0.12em] text-center">
          {site.name}
        </p>

        <div className="grid gap-2 border-t border-line py-8 text-sm text-muted-foreground">
          <p>
            Built on BOT Chain:{" "}
            <a href={site.links.botchain} target="_blank" rel="noreferrer" className={linkClass}>
              botchain.ai
            </a>{" "}
            and{" "}
            <a href={site.links.botscan} target="_blank" rel="noreferrer" className={linkClass}>
              scan.botchain.ai
            </a>
          </p>
          <p>{site.org} is an independent project and is not affiliated with or endorsed by BOT Chain.</p>
          <p>
            &copy; {new Date().getFullYear()} {site.org}. MIT licensed.
          </p>
        </div>
      </div>
    </footer>
  )
}
