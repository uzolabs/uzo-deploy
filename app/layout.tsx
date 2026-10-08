import type { Metadata, Viewport } from "next"
import { JetBrains_Mono, Reggae_One } from "next/font/google"
import localFont from "next/font/local"
import { Background } from "@/components/background"
import { Footer } from "@/components/footer"
import { Nav } from "@/components/nav"
import { NetworkBanner } from "@/components/network/network-banner"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Providers } from "@/components/wallet/providers"
import { site } from "@/lib/site"
import "./globals.css"

const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "../public/fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Satoshi-Italic.woff2", weight: "400", style: "italic" },
    { path: "../public/fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
})

const reggae = Reggae_One({
  variable: "--font-reggae",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
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
      className={`dark ${satoshi.variable} ${reggae.variable} ${jetbrains.variable} antialiased`}
    >
      {/* Extensions like Grammarly add attributes to body before React loads. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }}
        />
        <Background />
        <Providers>
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
        </Providers>
        <Toaster position="bottom-center" theme="dark" />
      </body>
    </html>
  )
}
