// Geometry helpers for the original Uli-inspired line motifs.
// Everything returns SVG path data for single-weight strokes, never fills.

type Point = { x: number; y: number }

const round = (n: number) => Math.round(n * 100) / 100

type SpiralOptions = {
  cx: number
  cy: number
  /** Radius at the centre of the spiral. */
  r0?: number
  /** Distance between successive rings. */
  gap: number
  turns: number
  /** Angle (radians) the spiral starts at. */
  start?: number
  /** Degrees per sample. Smaller is smoother. */
  step?: number
}

/**
 * Archimedean spiral from the centre outward. Returns the path plus the
 * outer end point and its tangent so a "road" tail can continue from it.
 */
export function spiral({
  cx,
  cy,
  r0 = 0,
  gap,
  turns,
  start = 0,
  step = 5,
}: SpiralOptions) {
  const b = gap / (2 * Math.PI)
  const total = turns * 2 * Math.PI
  const inc = (step * Math.PI) / 180
  const pts: Point[] = []
  for (let t = 0; t <= total + 1e-9; t += inc) {
    const r = r0 + b * t
    const a = start + t
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
  }
  const end = pts[pts.length - 1]
  const rEnd = r0 + b * total
  const aEnd = start + total
  const tx = b * Math.cos(aEnd) - rEnd * Math.sin(aEnd)
  const ty = b * Math.sin(aEnd) + rEnd * Math.cos(aEnd)
  const len = Math.hypot(tx, ty) || 1
  const d =
    `M${round(pts[0].x)} ${round(pts[0].y)}` +
    pts
      .slice(1)
      .map((p) => `L${round(p.x)} ${round(p.y)}`)
      .join("")
  return { d, end, tangent: { x: tx / len, y: ty / len } }
}

/** Open arc on a circle, angles in degrees. */
export function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const x1 = cx + r * Math.cos(rad(from))
  const y1 = cy + r * Math.sin(rad(from))
  const x2 = cx + r * Math.cos(rad(to))
  const y2 = cy + r * Math.sin(rad(to))
  const large = Math.abs(to - from) > 180 ? 1 : 0
  const sweep = to > from ? 1 : 0
  return `M${round(x1)} ${round(y1)}A${r} ${r} 0 ${large} ${sweep} ${round(x2)} ${round(y2)}`
}

/** Zigzag running left to right. */
export function zigzag(x: number, y: number, width: number, peak: number, amp: number) {
  let d = `M${x} ${y}`
  const n = Math.floor(width / peak)
  for (let i = 1; i <= n; i++) {
    d += `L${round(x + i * peak - peak / 2)} ${round(y + (i % 2 ? -amp : amp))}L${round(x + i * peak)} ${y}`
  }
  return d
}

/** Crescent outline: an outer arc closed by a shallower inner arc. */
export function crescent(cx: number, cy: number, r: number) {
  const top = `${round(cx + r * 0.35)} ${round(cy - r)}`
  const bottom = `${round(cx + r * 0.35)} ${round(cy + r)}`
  return `M${top}A${r} ${r} 0 1 0 ${bottom}A${round(r * 0.78)} ${round(r * 0.78)} 0 1 1 ${top}`
}

/** Tail that leaves a spiral along its tangent and settles at a target. */
export function tail(from: Point, tangent: Point, reach: number, c2: Point, to: Point) {
  const c1 = { x: from.x + tangent.x * reach, y: from.y + tangent.y * reach }
  return `M${round(from.x)} ${round(from.y)}C${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(to.x)} ${round(to.y)}`
}
