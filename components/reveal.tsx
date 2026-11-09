"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  as?: "div" | "li"
}

/**
 * True once the element has scrolled into view. Plain IntersectionObserver, so pages
 * don't load an animation library for a fade. The bottom margin waits until it is 10% in.
 */
export function useInViewOnce<T extends Element>(rootMargin = "0px 0px -10% 0px") {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, seen])

  return [ref, seen] as const
}

/**
 * Fade and rise a short distance the first time it scrolls into view.
 * The motion lives in CSS (`.reveal`), which also turns it off for reduced motion.
 */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const [ref, seen] = useInViewOnce<HTMLDivElement & HTMLLIElement>()
  const Comp = as

  return (
    <Comp
      ref={ref}
      className={["reveal", className].filter(Boolean).join(" ")}
      data-shown={seen ? "" : undefined}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Comp>
  )
}
