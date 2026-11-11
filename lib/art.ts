/** Glass art rendered in Blender (art/render.py). Square pieces are 640x640 with a transparent edge. */
const square = (name: string) => ({ src: `/img/3d/${name}.webp`, width: 640, height: 640 })

export const art = {
  hero: { src: "/img/3d/hero.webp", width: 1200, height: 1050 },
  token: square("token"),
  nft: square("nft"),
  tipjar: square("tipjar"),
  manage: square("manage"),
  stats: square("stats"),
  deploy: square("deploy"),
  network: square("network"),
  faucet: square("faucet"),
} as const

export type ArtName = keyof typeof art
