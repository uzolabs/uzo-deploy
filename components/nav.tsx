"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { lazy, useState } from "react"
import { Menu } from "lucide-react"
import { Logo } from "@/components/brand"
import { NetworkSwitch } from "@/components/network/network-switch"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { preloadWallet, requestWallet, WalletIsland } from "@/components/wallet/wallet-gate"
import { navLinks, site } from "@/lib/site"
import { cn } from "@/lib/utils"

const NavWallet = lazy(() => import("@/components/wallet/nav-wallet"))

/** Stands in for the wallet button until the wallet code loads. A tap loads it and opens the dialog. */
function ConnectPlaceholder() {
  return (
    <button
      type="button"
      onClick={() => requestWallet({ openConnect: true })}
      onPointerEnter={preloadWallet}
      onFocus={preloadWallet}
      className="btn-grad inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold"
    >
      Connect
    </button>
  )
}

const linkClass =
  "inline-flex items-center rounded-full px-3.5 py-2.5 text-[0.925rem] text-ink-2 transition-colors hover:bg-[var(--glass-strong)] hover:text-foreground aria-[current=page]:bg-[var(--glass-strong)] aria-[current=page]:text-foreground"

export function Nav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-40 px-4 py-3.5 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center gap-2 rounded-full border border-line bg-[rgba(16,13,11,0.55)] py-2 pr-2 pl-[18px] shadow-[inset_0_1px_0_rgba(245,241,234,0.06)] backdrop-blur-[24px] backdrop-saturate-[1.6]">
        <Link href="/" className="mr-auto rounded-full" aria-label={`${site.name} home`}>
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={linkClass}
            >
              {link.label}
            </Link>
          ))}
          <a href={site.links.docs} target="_blank" rel="noreferrer" className={linkClass}>
            Docs
          </a>
        </nav>

        <div className="flex items-center gap-1.5 lg:ml-2">
          <NetworkSwitch className="hidden lg:inline-flex" />
          <WalletIsland fallback={<ConnectPlaceholder />}>
            <NavWallet myActive={isActive("/my")} />
          </WalletIsland>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="grid size-11 place-items-center rounded-full border border-line bg-[var(--glass)] text-foreground lg:hidden"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85%] border-line bg-[#12100e]/95 p-6 pt-5">
              <SheetTitle>
                <Logo />
              </SheetTitle>
              <div className="mt-6">
                <p className="mb-2 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">Network</p>
                <NetworkSwitch />
              </div>
              <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1 text-lg">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    className={cn(
                      "rounded-2xl px-3 py-3 hover:bg-[var(--glass-strong)]",
                      isActive(link.href) && "bg-[var(--glass-strong)] text-ochre-hi",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <a href={site.links.docs} target="_blank" rel="noreferrer" className="rounded-2xl px-3 py-3 hover:bg-[var(--glass-strong)]">
                  Docs
                </a>
                <a href={site.links.github} target="_blank" rel="noreferrer" className="rounded-2xl px-3 py-3 hover:bg-[var(--glass-strong)]">
                  GitHub
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
