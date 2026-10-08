import Link from "next/link"
import { navLinks, site } from "@/lib/site"

const pages = [{ label: "Home", href: "/" }, ...navLinks]

const external = [
  { label: "Docs", href: site.links.docs },
  { label: "GitHub", href: site.links.github },
  { label: "Uzo Labs", href: site.links.home },
  { label: "Testnet faucet", href: site.links.faucet },
]

const community = [
  { label: "Telegram channel", href: site.links.telegram },
  { label: "Developer group", href: site.links.telegramDev },
]

const linkClass = "rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"

export function Footer() {
  return (
    <footer className="mt-24 border-t border-glass-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto_auto_auto] md:items-start md:gap-16">
        <div className="grid gap-4">
          <Link href="/" className="w-fit rounded-sm" aria-label="Uzo Deploy home">
            <span className="font-display text-[1.75rem] leading-none">Uzo</span>{" "}
            <span className="text-sm font-medium text-muted-foreground">Deploy</span>
          </Link>
          <p className="max-w-sm text-sm text-muted-foreground">
            Templates are tested, not audited. Uzo charges no fees, holds no funds and keeps no admin keys over what
            you deploy.
          </p>
        </div>

        <nav aria-labelledby="footer-site">
          <h2 id="footer-site" className="text-sm font-medium tracking-[0.14em] text-primary uppercase">
            Site
          </h2>
          <ul className="mt-4 grid gap-3">
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
          <h2 id="footer-elsewhere" className="text-sm font-medium tracking-[0.14em] text-primary uppercase">
            Elsewhere
          </h2>
          <ul className="mt-4 grid gap-3">
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
          <h2 id="footer-community" className="text-sm font-medium tracking-[0.14em] text-primary uppercase">
            Community
          </h2>
          <ul className="mt-4 grid gap-3">
            {community.map((link) => (
              <li key={link.label}>
                <a href={link.href} target="_blank" rel="noreferrer" className={linkClass}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid gap-2 border-t border-glass-border pt-6 text-sm text-muted-foreground md:col-span-4">
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
