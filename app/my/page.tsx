import type { Metadata } from "next"
import { MyDeployments } from "@/components/my/my-deployments"
import { PageHeader } from "@/components/page-header"

export const metadata: Metadata = {
  title: "My contracts",
  description: "Contracts your wallet deployed with Uzo Deploy on BOT Chain.",
  robots: { index: false },
}

export default function MyPage() {
  return (
    <>
      <PageHeader
        eyebrow="My contracts"
        title="What you deployed"
        lede="Every contract your connected wallet created through the Uzo factories on the selected network."
      />
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <MyDeployments />
      </div>
    </>
  )
}
