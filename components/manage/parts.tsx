"use client"

import { ExternalLink } from "lucide-react"
import { useId, type InputHTMLAttributes, type ReactNode } from "react"
import { CopyButton } from "@/components/copy-button"
import { explorerAddress, type BotChain } from "@/lib/chains"
import { shortAddress } from "@/lib/format"
import { cn } from "@/lib/utils"

export const inputClass =
  "min-h-12 w-full rounded-xl border border-glass-border bg-foreground/5 px-4 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 aria-[invalid=true]:border-destructive"

export function Card({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn("glass grid content-start gap-5 rounded-3xl p-6 sm:p-8", className)}>
      <h2 id={id} className="text-sm font-medium tracking-[0.14em] text-primary uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function Rows({ children }: { children: ReactNode }) {
  return <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}

/** A shortened address with copy and a BOTScan link. The full address is in the link's name. */
export function Addr({ chain, value, full = false }: { chain: BotChain; value: string; full?: boolean }) {
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1">
      <a
        href={explorerAddress(chain, value)}
        target="_blank"
        rel="noreferrer"
        aria-label={`${value} on BOTScan`}
        className="inline-flex items-center gap-1 font-mono text-sm break-all underline-offset-4 hover:underline"
      >
        {full ? value : shortAddress(value)}
        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </a>
      <CopyButton value={value} label="address" />
    </span>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  help?: ReactNode
  error?: string
  mono?: boolean
}

export function Field({ label, help, error, mono, className, ...input }: FieldProps) {
  const id = useId()
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <input
        id={id}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={help || error ? `${id}-note` : undefined}
        className={cn(inputClass, mono && "font-mono text-sm", className)}
        {...input}
      />
      {error ? (
        <p id={`${id}-note`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-note`} className="text-sm text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  )
}
