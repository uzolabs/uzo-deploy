import { arc, crescent, spiral, zigzag } from "@/lib/uli"
import { cn } from "@/lib/utils"

// One 240px tile of quiet motifs, repeated across the page.
const tileSpiral = spiral({ cx: 58, cy: 62, r0: 1, gap: 7, turns: 3, start: 0.4 })

const tile = [
  tileSpiral.d,
  crescent(178, 52, 14),
  arc(150, 172, 26, 180, 360),
  arc(150, 172, 36, 190, 350),
  arc(150, 172, 46, 200, 340),
  zigzag(24, 196, 72, 12, 5),
  "M210 118C222 138 202 150 216 172",
]

export function UliPattern({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={cn("absolute inset-0 h-full w-full", className)}>
      <defs>
        <pattern
          id="uli-tile"
          width="240"
          height="240"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-8)"
        >
          {tile.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" />
          ))}
          <circle cx="104" cy="118" r="2" fill="none" stroke="currentColor" strokeWidth={1} />
          <circle cx="114" cy="112" r="2" fill="none" stroke="currentColor" strokeWidth={1} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#uli-tile)" />
    </svg>
  )
}
