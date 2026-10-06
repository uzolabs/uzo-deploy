// The templates Uzo Deploy offers. IDs and versions must match the constants in
// contracts/src/templates, which every instance reports through uzoTemplate().
// Factory addresses live in deployments.json. Chain data comes from @uzolabs/sdk.

export type TemplateKey = "token" | "nft" | "tipJar";

export interface Template {
  key: TemplateKey;
  /** bytes32 short string returned by uzoTemplate() and emitted in Deployed. */
  id: string;
  version: number;
  name: string;
  /** Contract name, used for verification. */
  contract: string;
  /** Factory contract name, keyed in deployments.json by `key`. */
  factory: string;
  summary: string;
}

export const templates: readonly Template[] = [
  {
    key: "token",
    id: "uzo.token",
    version: 1,
    name: "Token",
    contract: "UzoToken",
    factory: "UzoTokenFactory",
    summary: "A fixed-supply ERC-20 with permit and burn. No owner and no minting after launch.",
  },
  {
    key: "nft",
    id: "uzo.nft",
    version: 1,
    name: "NFT Collection",
    contract: "UzoNFT",
    factory: "UzoNFTFactory",
    summary: "An ERC-721 with a capped supply, owner minting, optional royalties and freezable metadata.",
  },
  {
    key: "tipJar",
    id: "uzo.tipjar",
    version: 1,
    name: "Tip Jar",
    contract: "UzoTipJar",
    factory: "UzoTipJarFactory",
    summary: "Takes tips in BOT or USDT with a short message and forwards them straight to you.",
  },
] as const;

export const templateById = (id: string) => templates.find((t) => t.id === id);
