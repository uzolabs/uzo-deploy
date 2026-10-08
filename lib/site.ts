export const site = {
  name: "Uzo Deploy",
  org: "Uzo Labs",
  url: "https://deploy.uzolabs.xyz",
  title: "Uzo Deploy: tested contract templates for BOT Chain",
  description:
    "Deploy a token, an NFT collection or a tip jar to BOT Chain from your own wallet. Tested, not audited. No fees, no custody.",
  links: {
    home: "https://uzolabs.xyz",
    docs: "https://docs.uzolabs.xyz/deploy/overview",
    github: "https://github.com/uzolabs/uzo-deploy",
    botchain: "https://botchain.ai",
    botscan: "https://scan.botchain.ai",
    /** BOT Chain's own faucet: test BOT and test USDT. */
    faucet: "https://faucet.uzolabs.xyz",
    /** Official announcements. */
    telegram: "https://t.me/uzolabs",
    /** Developer community group. */
    telegramDev: "https://t.me/uzolabsdev",
  },
} as const

/** Shown in the mobile menu and the footer. The desktop bar adds My contracts once a wallet connects. */
export const navLinks = [
  { label: "Deploy", href: "/deploy" },
  { label: "My contracts", href: "/my" },
  { label: "Stats", href: "/stats" },
] as const
