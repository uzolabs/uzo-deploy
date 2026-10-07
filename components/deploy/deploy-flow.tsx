"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import type { Address, Hash, Hex } from "viem"
import { useAccount } from "wagmi"
import { ConfigureStep, type FormValues } from "@/components/deploy/configure-step"
import { ReviewStep } from "@/components/deploy/review-step"
import { SignStep } from "@/components/deploy/sign-step"
import { VerifyStep } from "@/components/deploy/verify-step"
import { useNetwork } from "@/components/network/network-provider"
import type { Template } from "@/config/templates"
import { randomSalt, type DeployInput } from "@/lib/deploy-call"
import { factoryFor } from "@/lib/deployments"
import { cn } from "@/lib/utils"
import { defaultValues, nftParams, tipJarParams, tokenParams, type NftValues, type TipJarValues, type TokenValues } from "@/lib/validation"

const steps = ["Configure", "Review", "Sign", "Verify"] as const

type State =
  | { step: 0 }
  | { step: 1; input: DeployInput; salt: Hex }
  | { step: 2; input: DeployInput; salt: Hex; predicted: Address }
  | { step: 3; input: DeployInput; instance: Address; txHash: Hash }

function toInput(template: Template, values: FormValues): DeployInput {
  switch (template.key) {
    case "token":
      return { key: "token", params: tokenParams(values as TokenValues) }
    case "nft":
      return { key: "nft", params: nftParams(values as NftValues) }
    case "tipJar":
      return { key: "tipJar", params: tipJarParams(values as TipJarValues) }
  }
}

type Props = {
  template: Template
  /** Factory verification on BOTScan per chain ID, checked on the server. null when BOTScan did not answer. */
  verified: Record<number, boolean | null>
}

/** Switching network mid-flow starts over, so nothing signed on one chain points at the other. */
export function DeployFlow(props: Props) {
  const { chain } = useNetwork()
  return <Flow key={chain.id} {...props} />
}

function Flow({ template, verified }: Props) {
  const { chain } = useNetwork()
  const { address: account } = useAccount()
  const factory = factoryFor(chain.id, template.key)
  const [values, setValues] = useState<FormValues>(() => defaultValues(template.key, account))
  const [state, setState] = useState<State>({ step: 0 })

  const onDeployed = useCallback(
    ({ instance, txHash }: { instance: Address; txHash: Hash }) =>
      setState((s) => (s.step === 2 ? { step: 3, input: s.input, instance, txHash } : s)),
    [],
  )

  if (!factory) {
    return (
      <p className="glass rounded-3xl p-6">
        {template.name} is not available on {chain.name} yet. Switch to testnet to try it for free, or{" "}
        <Link href="/deploy" className="underline underline-offset-4">
          pick another template
        </Link>
        .
      </p>
    )
  }

  return (
    <div className="grid gap-10">
      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={state.step === i ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
              state.step === i
                ? "border-primary bg-primary/15 text-foreground"
                : state.step > i
                  ? "border-glass-border text-foreground"
                  : "border-glass-border text-muted-foreground",
            )}
          >
            <span className="font-mono text-xs">{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {state.step === 0 ? (
        <ConfigureStep
          template={template}
          initial={values}
          account={account}
          onSubmit={(v) => {
            setValues(v)
            setState({ step: 1, input: toInput(template, v), salt: randomSalt() })
          }}
        />
      ) : null}

      {state.step === 1 ? (
        <ReviewStep
          template={template}
          factory={factory.address}
          factoryVerified={verified[chain.id] ?? null}
          input={state.input}
          salt={state.salt}
          onBack={() => setState({ step: 0 })}
          onSign={(predicted) => setState({ ...state, step: 2, predicted })}
        />
      ) : null}

      {state.step === 2 ? (
        <SignStep
          factory={factory.address}
          input={state.input}
          salt={state.salt}
          predicted={state.predicted}
          onBack={() => setState({ step: 1, input: state.input, salt: state.salt })}
          onDeployed={onDeployed}
        />
      ) : null}

      {state.step === 3 ? (
        <VerifyStep template={template} input={state.input} instance={state.instance} txHash={state.txHash} />
      ) : null}
    </div>
  )
}
