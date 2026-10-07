// The templates Uzo Deploy offers. IDs and versions must match the constants in
// contracts/src/templates, which every instance reports through uzoTemplate().
// Factory addresses live in deployments.json. Chain data comes from @uzolabs/sdk.
// Form fields and validation for each template live in lib/validation.ts.

export type TemplateKey = "token" | "nft" | "tipJar";

export interface Template {
  key: TemplateKey;
  /** URL segment: /deploy/<slug>. */
  slug: string;
  /** bytes32 short string returned by uzoTemplate() and emitted in Deployed. */
  id: string;
  version: number;
  name: string;
  /** Contract name, used for verification. */
  contract: string;
  /** Factory contract name, keyed in deployments.json by `key`. */
  factory: string;
  summary: string;
  /** Whether the deployed contract can ever hold a balance. */
  holdsFunds: { value: boolean; note: string };
  /** Plain statement of what the person deploying can and cannot do afterwards. */
  risk: { level: "Low" | "Medium"; note: string };
  /** Gas measured on testnet in Phase 2, shown as a rough guide before a live estimate. */
  typicalGas: number;
}

export const templates: readonly Template[] = [
  {
    key: "token",
    slug: "token",
    id: "uzo.token",
    version: 1,
    name: "Token",
    contract: "UzoToken",
    factory: "UzoTokenFactory",
    summary: "A fixed-supply ERC-20 with permit and burn. No owner and no minting after launch.",
    holdsFunds: { value: false, note: "The whole supply goes to one address at launch." },
    risk: {
      level: "Low",
      note: "Nobody, including you, can mint more or change the token after launch.",
    },
    typicalGas: 914_765,
  },
  {
    key: "nft",
    slug: "nft",
    id: "uzo.nft",
    version: 1,
    name: "NFT Collection",
    contract: "UzoNFT",
    factory: "UzoNFTFactory",
    summary: "An ERC-721 with a capped supply, owner minting, optional royalties and freezable metadata.",
    holdsFunds: { value: false, note: "There is no sale or payment function." },
    risk: {
      level: "Medium",
      note: "The owner can mint up to the cap and change the metadata link until it is frozen.",
    },
    typicalGas: 1_421_154,
  },
  {
    key: "tipJar",
    slug: "tip-jar",
    id: "uzo.tipjar",
    version: 1,
    name: "Tip Jar",
    contract: "UzoTipJar",
    factory: "UzoTipJarFactory",
    summary: "Takes tips in BOT or USDT with a short message and forwards them straight to you.",
    holdsFunds: { value: false, note: "Every tip is forwarded in the same transaction." },
    risk: {
      level: "Low",
      note: "The recipient is fixed at launch. The contract has no owner and no withdraw.",
    },
    typicalGas: 468_234,
  },
] as const;

export const templateById = (id: string) => templates.find((t) => t.id === id);
export const templateBySlug = (slug: string) => templates.find((t) => t.slug === slug);
