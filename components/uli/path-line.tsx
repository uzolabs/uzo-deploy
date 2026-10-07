"use client"

import { motion, useReducedMotion } from "framer-motion"
import { easeOut } from "@/components/reveal"
import { cn } from "@/lib/utils"

// Nodes sit at the centre of four equal columns in a 1200 wide box: 12.5%, 37.5%, 62.5%, 87.5%.
const nodes = [150, 450, 750, 1050]
const mid = 60

/** A road that arches over and under each phase node, alternating like a Uli line. */
function wave(offset: number, amp: number) {
  let d = `M0 ${mid + offset}C60 ${mid + offset} 100 ${mid + offset} ${nodes[0]} ${mid + offset}`
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1]
    const b = nodes[i]
    const lift = (i % 2 ? -amp : amp) + offset
    d += `C${a + 100} ${mid + lift} ${b - 100} ${mid + lift} ${b} ${mid + offset}`
  }
  d += `C1100 ${mid + offset} 1140 ${mid + offset} 1200 ${mid + offset}`
  return d
}

const main = wave(0, 52)
const echo = wave(0, 34)

/** Horizontal Uli line for the desktop roadmap. Draws left to right once. */
export function PathLineHorizontal({ className }: { className?: string }) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
      initial={{ clipPath: "inset(0 100% 0 0)" }}
      whileInView={{ clipPath: "inset(0 0% 0 0)" }}
      viewport={{ once: true, margin: "0px 0px -15% 0px" }}
      transition={reduce ? { duration: 0 } : { duration: 1.4, ease: easeOut }}
    >
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" fill="none" className="h-full w-full">
        <path
          d={main}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="text-primary/60"
        />
        <path
          d={echo}
          stroke="currentColor"
          strokeWidth={1}
          strokeLinecap="round"
          strokeDasharray="2 7"
          vectorEffect="non-scaling-stroke"
          className="text-foreground/25"
        />
      </svg>
    </motion.div>
  )
}

/** Vertical segment for the phone roadmap: a gentle S-curve down to the next phase. */
export function PathSegmentVertical({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 100"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      className={cn("w-10 text-primary/50", className)}
    >
      <path
        d="M20 0C4 25 36 75 20 100"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** Ring marker for a phase node. Stroke only, echoing the spiral dots in the hero. */
export function PathNode({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        "relative flex size-10 items-center justify-center rounded-full border border-primary/60 bg-background font-mono text-sm text-primary",
        className
      )}
    >
      <span aria-hidden="true" className="absolute inset-1 rounded-full border border-primary/20" />
      {n}
    </span>
  )
}
