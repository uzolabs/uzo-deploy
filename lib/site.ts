export const site = {
  name: "Uzo Deploy",
  org: "Uzo Labs",
  url: "https://deploy.uzolabs.xyz",
  title: "Uzo Deploy: tested contract templates for BOT Chain",
  description:
    "Deploy a token, an NFT collection or a tip jar to BOT Chain from your own wallet. Tested, not audited. No custody, no admin keys.",
  links: {
    home: "https://uzolabs.xyz",
    docs: "https://docs.uzolabs.xyz/deploy/overview",
    github: "https://github.com/uzolabs/uzo-deploy",
    botchain: "https://botchain.ai",
    botscan: "https://scan.botchain.ai",
    /** The Uzo Labs testnet faucet: free tBOT. */
    faucet: "https://faucet.uzolabs.xyz",
    /** Official announcements. */
    telegramChannel: "https://t.me/uzolabs",
    /** Developer community group. */
    telegramCommunity: "https://t.me/uzolabsdev",
    x: "https://x.com/uzolabs",
    githubOrg: "https://github.com/uzolabs",
    npm: "https://www.npmjs.com/package/@uzolabs/sdk",
    email: "mailto:uzolabsxyz@gmail.com",
    issues: "https://github.com/uzolabs/.github/issues",
  },
} as const

const home = (path: string) => `${site.links.home}${path}`
const docsPage = (path: string) => `https://docs.uzolabs.xyz${path}`

type FooterLink = { label: string; href: string }

/** Footer columns, kept in step with the footer on uzolabs.xyz. Relative hrefs stay on this site. */
export const footerColumns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Uzo Deploy",
    links: [
      { label: "Deploy a token", href: "/deploy/token" },
      { label: "Deploy an NFT", href: "/deploy/nft" },
      { label: "Deploy a tip jar", href: "/deploy/tip-jar" },
      { label: "My contracts", href: "/my" },
      { label: "Deploy stats", href: "/stats" },
    ],
  },
  {
    title: "Docs",
    links: [
      { label: "Docs home", href: docsPage("") },
      { label: "Quickstart guide", href: docsPage("/get-started/quickstart") },
      { label: "How Uzo Deploy works", href: docsPage("/deploy/overview") },
      { label: "Security", href: docsPage("/deploy/security") },
      { label: "Networks and costs", href: docsPage("/deploy/networks-and-costs") },
      { label: "BOT Chain limitations", href: docsPage("/get-started/bot-chain/known-limitations") },
      { label: "Changelog", href: docsPage("/changelog") },
    ],
  },
  {
    title: "Uzo Labs",
    links: [
      { label: "Home", href: site.links.home },
      { label: "@uzolabs/sdk", href: home("/products#sdk") },
      { label: "templates", href: home("/products#templates") },
      { label: "Roadmap", href: home("/roadmap") },
      { label: "Papers", href: home("/papers") },
    ],
  },
  {
    title: "Build",
    links: [
      { label: "Quickstart", href: home("/quickstart") },
      { label: "Testnet faucet", href: site.links.faucet },
      { label: "npm", href: site.links.npm },
      { label: "BOTScan", href: site.links.botscan },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Telegram channel", href: site.links.telegramChannel },
      { label: "Telegram community", href: site.links.telegramCommunity },
      { label: "X", href: site.links.x },
      { label: "GitHub", href: site.links.github },
      { label: "Email", href: site.links.email },
      { label: "Report an issue", href: site.links.issues },
    ],
  },
]

/** Shown in the mobile menu and the footer. The desktop bar adds My contracts once a wallet connects. */
export const navLinks = [
  { label: "Deploy", href: "/deploy" },
  { label: "My contracts", href: "/my" },
  { label: "Stats", href: "/stats" },
] as const
