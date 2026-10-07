import { arc, crescent } from "@/lib/uli"
import { cn } from "@/lib/utils"

/** Small crescent with an echoing arc, tucked into a card corner. */
export function UliCrescent({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn("size-12 text-primary/40", className)}>
      <path d={crescent(26, 22, 12)} stroke="currentColor" strokeWidth={1.25} strokeLinejoin="round" />
      <path d={arc(26, 22, 19, 60, 150)} stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" />
    </svg>
  )
}
