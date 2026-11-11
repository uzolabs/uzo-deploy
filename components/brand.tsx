import Image from "next/image"
import { art, type ArtName } from "@/lib/art"
import { cn } from "@/lib/utils"

/** The Uzo mark and the product name, as on uzolabs.xyz. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-[-0.02em]", className)}>
      <span className="mark" aria-hidden="true" />
      <span>
        Uzo <span className="text-ink-2">Deploy</span>
      </span>
    </span>
  )
}

/** A piece of glass art. Decoration only, so screen readers skip it. */
export function Art({
  name,
  className,
  priority,
  sizes = "(max-width: 860px) 70vw, 420px",
}: {
  name: ArtName
  className?: string
  priority?: boolean
  sizes?: string
}) {
  const { src, width, height } = art[name]
  return (
    <Image
      src={src}
      width={width}
      height={height}
      alt=""
      aria-hidden="true"
      priority={priority}
      sizes={sizes}
      className={cn("h-auto w-full", className)}
    />
  )
}

/** The small arrow the website uses on links and buttons. */
export function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      aria-hidden="true"
      className={cn(
        "size-3.5 fill-none stroke-current stroke-[1.8] transition-transform duration-300 group-hover:translate-x-[3px]",
        className,
      )}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 7h9M7.5 3.5 11 7l-3.5 3.5" />
    </svg>
  )
}
