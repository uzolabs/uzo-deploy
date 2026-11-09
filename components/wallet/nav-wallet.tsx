"use client"

import Link from "next/link"
import { useEffect } from "react"
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { takeOpenConnect } from "@/components/wallet/wallet-gate"
import { cn } from "@/lib/utils"

/** The nav's wallet area: "My contracts" once connected, and the connect / account button. */
export default function NavWallet({ myActive }: { myActive: boolean }) {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  // A tap on the light Connect button loaded this; finish the job by opening the dialog.
  useEffect(() => {
    if (openConnectModal && takeOpenConnect()) openConnectModal()
  }, [openConnectModal])

  return (
    <>
      {isConnected ? (
        <Link
          href="/my"
          aria-current={myActive ? "page" : undefined}
          className={cn(
            "hidden h-10 items-center rounded-full px-4 text-sm font-medium hover:bg-foreground/10 lg:inline-flex",
            myActive && "bg-foreground/10 text-primary",
          )}
        >
          My contracts
        </Link>
      ) : null}
      <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" label="Connect" />
    </>
  )
}
