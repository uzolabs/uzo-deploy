"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight } from "lucide-react"
import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import type { z } from "zod"
import { fields, summary } from "@/components/deploy/fields"
import { Button } from "@/components/ui/button"
import type { Template } from "@/config/templates"
import { schemas } from "@/lib/validation"
import { cn } from "@/lib/utils"

export type FormValues = Record<string, string>

type Props = {
  template: Template
  initial: FormValues
  account?: string
  onSubmit: (values: FormValues) => void
}

export function ConfigureStep({ template, initial, account, onSubmit }: Props) {
  const schema = schemas[template.key] as unknown as z.ZodType<FormValues, FormValues>
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: initial, mode: "onTouched" })
  const { register, handleSubmit, formState, control, getValues, setValue } = form
  const values = useWatch({ control }) as FormValues

  // Fill empty address fields once a wallet connects, without overwriting anything typed.
  useEffect(() => {
    if (!account) return
    for (const f of fields[template.key]) {
      if (f.mono && f.name !== "baseURI" && !getValues(f.name)) setValue(f.name, account)
    }
  }, [account, template.key, getValues, setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="grid gap-6">
        {fields[template.key].map((f) => {
          const error = formState.errors[f.name]?.message
          const id = `field-${f.name}`
          return (
            <div key={f.name} className="grid gap-2">
              <label htmlFor={id} className="font-medium">
                {f.label}
                {f.optional ? <span className="ml-2 text-sm font-normal text-muted-foreground">optional</span> : null}
              </label>
              <input
                id={id}
                {...register(f.name)}
                placeholder={f.placeholder}
                inputMode={f.inputMode}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
                className={cn(
                  "min-h-12 w-full rounded-xl border border-glass-border bg-foreground/5 px-4 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40",
                  f.mono && "font-mono text-sm",
                  error && "border-destructive",
                )}
              />
              <p id={`${id}-help`} className="text-sm text-muted-foreground">
                {f.help}
              </p>
              {error ? (
                <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
                  {String(error)}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="glass rounded-3xl p-6">
          <h2 className="text-sm font-medium tracking-[0.14em] text-primary uppercase">Summary</h2>
          <p className="mt-3 text-lg" aria-live="polite">
            {summary(template.key, values)}
          </p>
          <Button type="submit" className="mt-6 h-12 w-full rounded-full text-base">
            Review
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </aside>
    </form>
  )
}
