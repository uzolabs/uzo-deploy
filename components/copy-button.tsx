"use client"

import { useEffect, useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type CopyButtonProps = {
  value: string
  /** What is being copied, for the accessible name. */
  label?: string
  className?: string
}

export function CopyButton({ value, label = "text", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast("Copied")
    } catch {
      toast("Could not copy. Select the text and copy it manually.")
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className={cn("rounded-full text-muted-foreground hover:text-foreground max-sm:size-9", className)}
        >
          {copied ? <Check className="text-primary" /> : <Copy />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
    </Tooltip>
  )
}
