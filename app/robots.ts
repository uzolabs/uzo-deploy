import type { MetadataRoute } from "next"
import { site } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    // Per-wallet and user-made pages are also marked noindex on the pages themselves.
    rules: { userAgent: "*", allow: ["/", "/deploy", "/stats"], disallow: ["/api/", "/my", "/manage/", "/tip/"] },
    sitemap: new URL("/sitemap.xml", site.url).toString(),
  }
}
