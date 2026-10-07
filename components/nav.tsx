"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu } from "lucide-react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { NetworkSwitch } from "@/components/network/network-switch"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { navLinks, site } from "@/lib/site"
import { cn } from "@/lib/utils"

function Wordmark() {
  return (
    <Link href="/" className="flex items-baseline gap-1.5 rounded-full pr-2 text-foreground" aria-label="Uzo Deploy home">
      <span className="font-display text-[1.75rem] leading-none">Uzo</span>
      <span className="text-sm font-medium text-muted-foreground">Deploy</span>
    </Link>
  )
}

export function Nav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const { isConnected } = useAccount()

  return (
    <header className="sticky top-0 z-40 px-4 pt-3 sm:px-6">
      <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full px-2 pl-4 sm:px-3 sm:pl-5">
        <Wordmark />

        <div className="flex items-center gap-2">
          {isConnected ? (
            <Link
              href="/my"
              aria-current={isActive("/my") ? "page" : undefined}
              className={cn(
                "hidden h-10 items-center rounded-full px-4 text-sm font-medium hover:bg-foreground/10 lg:inline-flex",
                isActive("/my") && "bg-foreground/10 text-primary",
              )}
            >
              My contracts
            </Link>
          ) : null}
          <NetworkSwitch className="hidden lg:inline-flex" />
          <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" label="Connect" />

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-lg" className="rounded-full lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85%] border-glass-border bg-[#12100e]/95 p-6 pt-5">
              <SheetTitle className="flex items-baseline gap-1.5">
                <span className="font-display text-[1.75rem] leading-none">Uzo</span>
                <span className="text-sm font-medium text-muted-foreground">Deploy</span>
              </SheetTitle>
              <div className="mt-6">
                <p className="mb-2 text-sm text-muted-foreground">Network</p>
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
                      "rounded-xl px-3 py-3 hover:bg-muted",
                      isActive(link.href) && "bg-foreground/10 text-primary",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <a href={site.links.docs} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-3 hover:bg-muted">
                  Docs
                </a>
                <a href={site.links.github} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-3 hover:bg-muted">
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
