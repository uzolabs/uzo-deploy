import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Background } from "@/components/background"
import { Footer } from "@/components/footer"
import { Nav } from "@/components/nav"
import { NetworkBanner } from "@/components/network/network-banner"
import { NetworkProvider } from "@/components/network/network-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { WalletAutoload } from "@/components/wallet/wallet-gate"
import { site } from "@/lib/site"
import "./globals.css"

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.org,
  url: site.links.home,
  logo: new URL("/icon.svg", site.url).toString(),
  sameAs: [site.links.x, site.links.githubOrg, site.links.telegramChannel].filter(Boolean),
}

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: {
    title: site.title,
    description: site.description,
    url: site.url,
    siteName: site.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
}

export const viewport: Viewport = {
  themeColor: "#0b0a09",
  colorScheme: "dark",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geist.variable} ${geistMono.variable} antialiased`}
    >
      {/* Extensions like Grammarly add attributes to body before React loads. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }}
        />
        <Background />
        <NetworkProvider>
          <WalletAutoload />
          <TooltipProvider delayDuration={200}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
            >
              Skip to content
            </a>
            <Nav />
            <NetworkBanner />
            <main id="main">{children}</main>
            <Footer />
          </TooltipProvider>
        </NetworkProvider>
        <Toaster position="bottom-center" theme="dark" />
      </body>
    </html>
  )
}
