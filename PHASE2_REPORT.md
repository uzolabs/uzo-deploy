# Phase 2 report: testnet factories and smoke tests

BOT Chain testnet (chain ID 968), 6 October 2026. Explorer: https://scan.bohr.life

All transactions were sent by the team deployer `0xff08064bC2764216dE386CCdC4412f3727A8B246`
from a local Foundry keystore. It is listed in `config/team-addresses.json`, so everything below
is shown as team activity and never counted in public stats.

## Factories

Deployed through the standard CREATE2 deployer (`0x4e59b44847b379578588920cA78FbF26c0B4956C`)
with salt `keccak256("uzo.deploy.factories.v1")`. The addresses depend only on the bytecode, and
match the addresses predicted in the fork test before deploying.

| Factory | Address | Block | Gas | Verified |
| --- | --- | --- | --- | --- |
| UzoTokenFactory | [`0x37370F4504d0703c40c90E31bEB536CD1D772c7e`](https://scan.bohr.life/address/0x37370F4504d0703c40c90E31bEB536CD1D772c7e) | 25930594 | 1,498,635 | Yes |
| UzoNFTFactory | [`0xd41186A5c7414d4AA0E306bfD59d70CAc0ABCD78`](https://scan.bohr.life/address/0xd41186A5c7414d4AA0E306bfD59d70CAc0ABCD78) | 25930595 | 2,015,967 | Yes |
| UzoTipJarFactory | [`0xfd947C6d9e521b51377652040D239781BEE5775a`](https://scan.bohr.life/address/0xfd947C6d9e521b51377652040D239781BEE5775a) | 25930595 | 910,497 | Yes |

Transactions:

- UzoTokenFactory: `0x0421b5eec6d97c9653ad0ceee410d287ecb3757078c1ce7755bccc68e5e50e65`
- UzoNFTFactory: `0x0d59126ad5631a06771e9c97bb7e09b14023d1227e370251e34dc4945672d6b5`
- UzoTipJarFactory: `0x139afb1a24cdd7266a28dc3dc73e4e5046ea977d83415e9e8bd9aef4144ef29d`

`UzoTipJarFactory.usdt()` returns `0x75edC9335175Fc0552D51D48439F229c10420fe3`, the testnet USDT
in `@uzolabs/sdk`. Both `Deploy.s.sol` and `record-deployments.mjs` check this.

Factories were verified with `forge verify-contract --verifier blockscout`, each passing on the
first attempt.

## Smoke-test instances

One instance of each template, deployed through the factories by `script/DeploySmoke.s.sol`
with user salt `keccak256("uzo.deploy.smoke.v1")`. Each address matched the factory's
`predictAddress` before the transaction was sent.

| Template | Instance | Block | Gas | Verified in |
| --- | --- | --- | --- | --- |
| Token (`uzo.token` v1) | [`0xDb4fBBA0a71de6F4E2EFde775F7553BB40b96DB2`](https://scan.bohr.life/address/0xDb4fBBA0a71de6F4E2EFde775F7553BB40b96DB2) | 25931345 | 914,765 | 9.8 s |
| NFT (`uzo.nft` v1) | [`0xCC43dFd6739AaC0163d3B0de60B390cDfB62D206`](https://scan.bohr.life/address/0xCC43dFd6739AaC0163d3B0de60B390cDfB62D206) | 25931346 | 1,421,154 | 8.4 s |
| Tip Jar (`uzo.tipjar` v1) | [`0x9fdFA1eEFfcA3F1ca33dc2B3c520Df57A044A962`](https://scan.bohr.life/address/0x9fdFA1eEFfcA3F1ca33dc2B3c520Df57A044A962) | 25931346 | 468,234 | 5.7 s |

Transactions:

- Token: `0x82fcb6aa16d80c66c7e2dc720582c6a08202c62b94429c3c0b68ad3387e9567d`
- NFT: `0xb557157d2d571bec01ff02bf8653bcb09e14528e37ff94ef11df94f6e5ce250a`
- Tip Jar: `0x6c9d095f66a52e1b722c3a29edd2acf04962095114ff2eb99cedaf3844879632`

Parameters:

- Token: "Uzo Smoke Test Token" (UZOSMOKE), 1,000,000 supply to the deployer.
- NFT: "Uzo Smoke Test NFT" (UZOSNFT), max supply 10, no base URI, owner and 5% royalty to the
  deployer. Nothing minted.
- Tip Jar: "Uzo smoke test tip jar", tips go to the deployer. No tips sent.

## Instance verification by API

Each instance was verified by `node script/verify-instance.mjs testnet --smoke`, which is the
flow the app's verify route will use in Phase 4:

1. Read the creation receipt from the RPC and find the `Deployed` event from a factory listed in
   `config/deployments.json`. Addresses that did not come from our factories are rejected.
2. Check `uzoTemplate()` on the instance matches the event.
3. Rebuild the constructor arguments from the factory call.
4. Submit `contracts/verify/<Template>.json` (the standard JSON input from this repo's build) to
   BOTScan's v2 standard-input endpoint, then poll until `is_verified` is true.

All three were accepted on the first submission and verified in under 10 seconds. The
standard JSON files are checked in CI, so they cannot drift from the contracts.

## Cost

At 20 gwei, the factories cost 0.0885 BOT and the smoke tests 0.0561 BOT. The deployer has
1.777 BOT left on testnet.

## Notes

- The deployer key is the testnet-only key from Phase 0. It is never to be used on mainnet.
  Mainnet will use a fresh key created on Chidile's machine.
- `script/sdk-env.mjs --powershell | Invoke-Expression` loads the SDK values in PowerShell.
- On one Windows machine, Node in PowerShell rejected the testnet RPC's TLS certificate
  (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Setting `NODE_OPTIONS=--use-system-ca` fixes it. The app
  will hit the RPC from the browser and from Vercel, so this does not affect it, but it is noted
  for anyone running the scripts.

Mainnet deployment is not part of this phase.
