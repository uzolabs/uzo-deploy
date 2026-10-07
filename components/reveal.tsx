"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  as?: "div" | "li"
}

export const easeOut = [0.22, 1, 0.36, 1] as const

/**
 * Fade and rise a short distance the first time it scrolls into view.
 * Markup is identical on server and client; reduced motion only zeroes the duration.
 */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const reduce = useReducedMotion()
  const Comp = as === "li" ? motion.li : motion.div

  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={reduce ? { duration: 0 } : { duration: 0.45, delay, ease: easeOut }}
    >
      {children}
    </Comp>
  )
}
