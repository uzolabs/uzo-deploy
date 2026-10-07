export const site = {
  name: "Uzo Deploy",
  org: "Uzo Labs",
  url: "https://deploy.uzolabs.xyz",
  title: "Uzo Deploy: tested contract templates for BOT Chain",
  description:
    "Deploy a token, an NFT collection or a tip jar to BOT Chain from your own wallet. Tested, not audited. No fees, no custody.",
  links: {
    home: "https://uzolabs.xyz",
    docs: "https://docs.uzolabs.xyz",
    github: "https://github.com/uzolabs/uzo-deploy",
    botchain: "https://botchain.ai",
    botscan: "https://scan.botchain.ai",
    /** BOT Chain's own faucet: test BOT and test USDT. */
    faucet: "https://faucet.botchain.ai",
  },
} as const

/**
 * Routes that land in a later phase. Links to them stay hidden until they exist,
 * so nobody is sent to a page that is not there yet.
 */
export const features = {
  manage: false,
  tip: false,
  my: false,
} as const

export const navLinks = [{ label: "Deploy", href: "/deploy" }] as const
