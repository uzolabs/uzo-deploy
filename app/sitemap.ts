import type { MetadataRoute } from "next"
import { templates } from "@/config/templates"
import { site } from "@/lib/site"

// Public pages only. My contracts, Manage and tip pages depend on a wallet or an address.
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: new URL(path, site.url).toString(),
    changeFrequency: "weekly",
    priority,
  })
  return [
    page("/", 1),
    page("/deploy", 0.9),
    ...templates.map((t) => page(`/deploy/${t.slug}`, 0.8)),
    page("/stats", 0.5),
  ]
}
