// Turns the Blender PNGs in art/out into the webp files the app serves.
// Run: node art/towebp.mjs
import { createRequire } from "node:module"
import { readdirSync, mkdirSync } from "node:fs"
import path from "node:path"

// sharp comes with Next, so resolve it from there instead of adding a dependency.
const fromNext = createRequire(createRequire(import.meta.url).resolve("next/package.json"))
const sharp = fromNext("sharp")

const src = "art/out"
const dest = "public/img/3d"
mkdirSync(dest, { recursive: true })

for (const file of readdirSync(src).filter((f) => f.endsWith(".png"))) {
  const name = path.basename(file, ".png")
  const out = path.join(dest, `${name}.webp`)
  const webp = { quality: 86, alphaQuality: 90 }
  if (name === "hero") {
    await sharp(path.join(src, file)).trim({ threshold: 8 })
      .resize(1200, 1050, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp(webp).toFile(out)
  } else {
    // Trim the empty edge, then fit every piece to the same visual weight on a 640 canvas.
    const { data, info } = await sharp(path.join(src, file)).trim({ threshold: 8 }).png().toBuffer({ resolveWithObject: true })
    const k = Math.min(480 / Math.sqrt(info.width * info.height), 540 / Math.max(info.width, info.height))
    const w = Math.round(info.width * k)
    const h = Math.round(info.height * k)
    const piece = await sharp(data).resize(w, h).png().toBuffer()
    await sharp({ create: { width: 640, height: 640, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: piece, left: Math.round((640 - w) / 2), top: Math.round((640 - h) / 2) }])
      .webp(webp).toFile(out)
  }
  console.log("wrote", out)
}
