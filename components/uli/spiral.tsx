"use client"

import { motion, useReducedMotion } from "framer-motion"
import { arc, crescent, spiral, tail, zigzag } from "@/lib/uli"
import { cn } from "@/lib/utils"

// Logo mark: a spiral that unwinds into a road heading out of the frame.
const mark = spiral({ cx: 12.5, cy: 12.5, r0: 0.6, gap: 3.1, turns: 2.25, start: -Math.PI / 2 })
const markTail = tail(mark.end, mark.tangent, 7, { x: 19, y: 28 }, { x: 30, y: 29 })

export function UliMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7 text-primary", className)}
    >
      <path
        d={mark.d + markTail.replace(/^M[^C]+/, "")}
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Hero motif. Composed once at module load; drawn on mount.
const heroSpiral = spiral({ cx: 430, cy: 360, r0: 6, gap: 34, turns: 5, start: Math.PI / 2 })
const heroTail = tail(heroSpiral.end, heroSpiral.tangent, 170, { x: 140, y: 560 }, { x: -60, y: 780 })

type Stroke = { d: string; tone: "primary" | "foreground" | "accent"; opacity: number; delay: number }

const heroStrokes: Stroke[] = [
  { d: heroSpiral.d, tone: "primary", opacity: 0.42, delay: 0 },
  { d: heroTail, tone: "primary", opacity: 0.42, delay: 1.6 },
  { d: arc(430, 360, 232, 196, 318), tone: "foreground", opacity: 0.16, delay: 0.5 },
  { d: arc(430, 360, 266, 214, 292), tone: "foreground", opacity: 0.12, delay: 0.7 },
  { d: arc(430, 360, 232, 12, 74), tone: "foreground", opacity: 0.16, delay: 0.9 },
  { d: arc(430, 360, 300, 330, 392), tone: "foreground", opacity: 0.1, delay: 1.1 },
  { d: crescent(668, 132, 24), tone: "primary", opacity: 0.35, delay: 1.2 },
  { d: zigzag(560, 700, 180, 18, 7), tone: "accent", opacity: 0.5, delay: 1.8 },
]

const heroDots = [0, 1, 2, 3, 4].map((i) => {
  const a = ((300 + i * 9) * Math.PI) / 180
  return { cx: 430 + 330 * Math.cos(a), cy: 360 + 330 * Math.sin(a) }
})

const toneClass = {
  primary: "text-primary",
  foreground: "text-foreground",
  accent: "text-accent",
} as const

export function HeroSpiral({ className }: { className?: string }) {
  const reduce = useReducedMotion()

  return (
    <svg viewBox="0 0 800 800" fill="none" aria-hidden="true" className={cn("overflow-visible", className)}>
      {heroStrokes.map((s, i) => (
        <motion.path
          key={i}
          d={s.d}
          className={toneClass[s.tone]}
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: s.opacity }}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: i === 0 ? 2.4 : 1.6, delay: s.delay, ease: [0.65, 0, 0.35, 1] }
          }
        />
      ))}
      {heroDots.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r={2.5}
          className="text-foreground"
          stroke="currentColor"
          strokeWidth={1.2}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          transition={reduce ? { duration: 0 } : { duration: 0.4, delay: 1.4 + i * 0.08 }}
        />
      ))}
    </svg>
  )
}
