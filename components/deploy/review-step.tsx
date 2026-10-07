"use client"

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { ArrowLeft, BadgeCheck, ExternalLink, PenLine } from "lucide-react"
import type { ReactNode } from "react"
import { encodeFunctionData, type Address, type Hex } from "viem"
import { useAccount, useBalance, useEstimateGas, useGasPrice, useReadContract } from "wagmi"
import { CopyButton } from "@/components/copy-button"
import { useNetwork } from "@/components/network/network-provider"
import { Button } from "@/components/ui/button"
import type { Template } from "@/config/templates"
import { explorerAddress } from "@/lib/chains"
import { deployCall, predictCall, type DeployInput } from "@/lib/deploy-call"
import { formatAmount, formatBot, formatGas } from "@/lib/format"
import { site } from "@/lib/site"

type Props = {
  template: Template
  factory: Address
  factoryVerified: boolean | null
  input: DeployInput
  salt: Hex
  onBack: () => void
  onSign: (predicted: Address) => void
}

/** Every parameter, in the units the contract receives, next to the plain reading. */
function parameterRows(input: DeployInput): [string, ReactNode][] {
  switch (input.key) {
    case "token": {
      const p = input.params
      return [
        ["Name", p.name],
        ["Symbol", p.symbol],
        ["Total supply", `${formatAmount(p.initialSupply, 18, 18)} ${p.symbol} (${p.initialSupply.toString()} base units)`],
        ["Recipient", <Addr key="r" value={p.recipient} />],
      ]
    }
    case "nft": {
      const p = input.params
      return [
        ["Name", p.name],
        ["Symbol", p.symbol],
        ["Metadata link", p.baseURI || "Not set yet"],
        ["Maximum supply", p.maxSupply.toLocaleString("en-US")],
        ["Owner", <Addr key="o" value={p.owner} />],
        ["Royalty", p.royaltyBps === 0n ? "None" : `${Number(p.royaltyBps) / 100}% (${p.royaltyBps} bps)`],
        ...(p.royaltyBps === 0n ? [] : ([["Royalty receiver", <Addr key="rr" value={p.royaltyReceiver} />]] as [string, ReactNode][])),
      ]
    }
    case "tipJar": {
      const p = input.params
      return [
        ["Title", p.title || "No title"],
        ["Recipient", <Addr key="r" value={p.recipient} />],
      ]
    }
  }
}

function Addr({ value }: { value: string }) {
  const { chain } = useNetwork()
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <a href={explorerAddress(chain, value)} target="_blank" rel="noreferrer" className="font-mono text-sm break-all underline-offset-4 hover:underline">
        {value}
      </a>
      <CopyButton value={value} label="address" />
    </span>
  )
}

export function ReviewStep({ template, factory, factoryVerified, input, salt, onBack, onSign }: Props) {
  const { chain, network } = useNetwork()
  const { address: account, chainId } = useAccount()
  const onChain = chainId === chain.id

  const prediction = useReadContract({
    ...predictCall(factory, account ?? "0x0000000000000000000000000000000000000000", input, salt),
    chainId: chain.id,
    query: { enabled: Boolean(account) },
  })

  const call = deployCall(factory, input, salt)
  const gas = useEstimateGas({
    account,
    to: factory,
    data: encodeFunctionData(call),
    chainId: chain.id,
    query: { enabled: Boolean(account) },
  })
  const gasPrice = useGasPrice({ chainId: chain.id })
  const balance = useBalance({ address: account, chainId: chain.id, query: { enabled: Boolean(account) } })

  const symbol = chain.nativeCurrency.symbol
  const cost = gas.data !== undefined && gasPrice.data !== undefined ? gas.data * gasPrice.data : undefined
  const tooLow = cost !== undefined && balance.data !== undefined && balance.data.value < cost
  const predicted = prediction.data as Address | undefined
  const ready = Boolean(factoryVerified !== false && account && onChain && predicted && cost !== undefined && !tooLow && !gas.isError)

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="grid gap-6">
        <section className="glass rounded-3xl p-6" aria-labelledby="review-contract">
          <h2 id="review-contract" className="text-sm font-medium tracking-[0.14em] text-primary uppercase">
            Contract
          </h2>
          <dl className="mt-4 grid gap-4">
            <Row label="Template">
              {template.name} v{template.version} <span className="font-mono text-sm text-muted-foreground">({template.id})</span>
            </Row>
            <Row label="Factory">
              <Addr value={factory} />
              <span className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                {factoryVerified ? (
                  <>
                    <BadgeCheck className="size-4 text-primary" aria-hidden="true" /> Source verified on BOTScan
                  </>
                ) : factoryVerified === false ? (
                  "Not verified on BOTScan. Do not continue."
                ) : (
                  "Could not reach BOTScan to check verification. Open the link to check it yourself."
                )}
              </span>
            </Row>
            <Row label="Your contract address">
              {!account ? (
                "Connect a wallet to see it."
              ) : prediction.isError ? (
                "Could not read the predicted address. Check your connection and try again."
              ) : predicted ? (
                <span className="font-mono text-sm break-all">{predicted}</span>
              ) : (
                "Working it out"
              )}
              <span className="mt-1 block text-sm text-muted-foreground">
                Worked out by the factory before you sign. The deploy creates exactly this address.
              </span>
            </Row>
          </dl>
        </section>

        <section className="glass rounded-3xl p-6" aria-labelledby="review-params">
          <h2 id="review-params" className="text-sm font-medium tracking-[0.14em] text-primary uppercase">
            Settings
          </h2>
          <dl className="mt-4 grid gap-4">
            {parameterRows(input).map(([label, value]) => (
              <Row key={label} label={label}>
                {value}
              </Row>
            ))}
          </dl>
        </section>

        <section className="rounded-3xl border border-glass-border p-6 text-sm text-muted-foreground" aria-labelledby="review-check">
          <h2 id="review-check" className="font-medium text-foreground">
            Check it yourself
          </h2>
          <p className="mt-2">
            Uzo Deploy does not review or endorse what you deploy. Templates are tested, not audited. Read the{" "}
            <a href={explorerAddress(chain, factory)} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
              factory on BOTScan
            </a>{" "}
            and the{" "}
            <a href={`${site.links.github}/tree/main/contracts/src`} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
              template source on GitHub
            </a>{" "}
            before you sign.
          </p>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="glass grid gap-4 rounded-3xl p-6">
          <h2 className="text-sm font-medium tracking-[0.14em] text-primary uppercase">Cost</h2>
          {!account ? (
            <div className="grid gap-3">
              <p>Connect the wallet you want to deploy from.</p>
              <ConnectButton showBalance={false} chainStatus="none" />
            </div>
          ) : (
            <dl className="grid gap-3">
              <Row label="Estimated gas">
                {gas.isError
                  ? "The network rejected the estimate. Check the settings and your balance."
                  : gas.data !== undefined
                    ? formatGas(gas.data)
                    : `About ${template.typicalGas.toLocaleString("en-US")}`}
              </Row>
              <Row label="Estimated cost">
                {cost !== undefined ? formatBot(cost, symbol) : "Estimating"}
              </Row>
              <Row label="Your balance">
                {balance.data ? formatBot(balance.data.value, symbol) : "Loading"}
              </Row>
            </dl>
          )}

          {tooLow ? (
            <div role="alert" className="rounded-2xl border border-destructive/60 bg-destructive/10 p-4 text-sm">
              {network === "testnet" ? (
                <>
                  Your balance is too low for this deploy. Get free test BOT from the{" "}
                  <a href={site.links.faucet} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    BOT Chain faucet
                    <ExternalLink className="ml-1 inline size-3" aria-hidden="true" />
                  </a>
                  , then come back.
                </>
              ) : (
                <>
                  You need BOT for gas. See{" "}
                  <a href={site.links.botchain} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    botchain.ai
                  </a>
                  .
                </>
              )}
            </div>
          ) : null}

          {account && !onChain ? (
            <p className="text-sm text-muted-foreground">Switch your wallet to {chain.name} to continue.</p>
          ) : null}

          <Button
            className="h-12 w-full rounded-full text-base"
            disabled={!ready}
            onClick={() => predicted && onSign(predicted)}
          >
            <PenLine aria-hidden="true" />
            Sign and deploy
          </Button>
          <Button variant="ghost" className="h-11 w-full rounded-full" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            Edit settings
          </Button>
        </div>
      </aside>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}
