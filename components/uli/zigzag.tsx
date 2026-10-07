import { zigzag } from "@/lib/uli"
import { cn } from "@/lib/utils"

const line = zigzag(0, 12, 1200, 24, 6)

/** Thin Uli zigzag used as a divider between major sections. */
export function UliZigzag({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>
      <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className="h-4 w-full text-primary/30">
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}
