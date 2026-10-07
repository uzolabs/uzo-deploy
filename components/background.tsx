import { UliPattern } from "@/components/uli/pattern"

/**
 * Fixed page backdrop: near-black base, soft ochre and camwood glows,
 * and a faint tiled Uli pattern. Gradients, not blur filters, so it is cheap.
 */
export function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="animate-glow-drift absolute inset-0">
        <div className="absolute -top-[20%] left-[45%] h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(closest-side,rgba(217,164,65,0.16),transparent)]" />
        <div className="absolute top-[35%] -left-[25%] h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(closest-side,rgba(178,58,42,0.14),transparent)]" />
        <div className="absolute -bottom-[30%] right-[-10%] h-[55vmax] w-[55vmax] rounded-full bg-[radial-gradient(closest-side,rgba(217,164,65,0.08),transparent)]" />
      </div>
      <UliPattern className="text-foreground opacity-[0.05]" />
    </div>
  )
}
