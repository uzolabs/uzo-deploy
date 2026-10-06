# Uzo Deploy

Deploy tested smart contract templates to BOT Chain from your wallet, get them verified on
BOTScan, and manage them in one place. https://deploy.uzolabs.xyz

The contracts are **tested, not audited**.

## Templates

| Template | What it does |
| --- | --- |
| Token | A fixed-supply ERC-20 with permit and burn. No owner, no minting after launch. |
| NFT Collection | An ERC-721 with a capped supply, owner minting, optional royalties and freezable metadata. |
| Tip Jar | Takes tips in BOT or USDT with a short message and forwards them straight to the recipient. |

Every contract is deployed by an immutable Uzo factory with no owner and no fees. Uzo Labs holds
no keys over anything you deploy.

## Testnet USDT

To try the Tip Jar on testnet, get test USDT from the BOT Chain faucet at
https://faucet.botchain.ai (choose "Test USDT"; 1,000 per claim, once every 24 hours).

## Repository

```
contracts/   Solidity sources, Foundry tests, deploy script, REVIEWS.md
config/      deployments.json, templates.ts, team-addresses.json
```

Chain data (chain IDs, RPC URLs, explorer URLs, USDT) comes from
[`@uzolabs/sdk`](https://www.npmjs.com/package/@uzolabs/sdk). Do not copy it into this repo.

## Working on the contracts

Requirements: [Foundry](https://getfoundry.sh), Node 20+, pnpm.

```bash
git clone --recurse-submodules https://github.com/uzolabs/uzo-deploy
cd uzo-deploy/contracts
pnpm install
forge build
forge test --no-match-path "test/fork/*"
```

Fork tests run the tip jar against real testnet USDT. Load the testnet values from the SDK first:

```bash
eval "$(node script/sdk-env.mjs)"
forge test --match-path "test/fork/*"
```

Other checks that CI runs:

```bash
forge fmt --check
forge lint src script
forge snapshot --check --no-match-path "test/fork/*"
forge coverage --no-match-path "test/fork/*" --no-match-coverage "(test|script)/"
slither . --filter-paths "lib/|test/|script/"
```

## Deploying the factories

Factories are deployed by hand from the deployer's machine. The key lives in a Foundry keystore
there (`cast wallet import uzo-deployer --interactive`) and never goes into CI, an env file or this
repo. Mainnet is never deployed from CI.

```bash
cd contracts
eval "$(node script/sdk-env.mjs)"
UZO_NETWORK=testnet forge script script/Deploy.s.sol --rpc-url bot_testnet --account uzo-deployer --broadcast
node script/record-deployments.mjs testnet
forge verify-contract <address> <Contract> --verifier blockscout --verifier-url "$BOT_TESTNET_EXPLORER_URL/api/" --watch
```

In PowerShell, load the SDK values with `node script/sdk-env.mjs --powershell | Invoke-Expression`
and set `$env:UZO_NETWORK = "testnet"` instead of the prefix.

The script uses the standard CREATE2 deployer, so factory addresses are fixed by the bytecode.
Running it again reuses factories that already exist. It reverts if the chain ID is wrong or the
tip jar factory's USDT does not match the SDK.

Then deploy one instance of each template through the factories as a smoke test, and verify them
through BOTScan's API the same way the app will:

```bash
UZO_NETWORK=testnet forge script script/DeploySmoke.s.sol --rpc-url bot_testnet --account uzo-deployer --broadcast
node script/record-deployments.mjs testnet
node script/verify-instance.mjs testnet --smoke
```

`record-deployments.mjs` adds every wallet that sent these transactions to
`config/team-addresses.json`, so team deployments are always shown apart from real users.

### Verify any instance yourself

`node script/verify-instance.mjs testnet <address>` checks that the address was created by one of
the factories in `config/deployments.json`, rebuilds the constructor arguments from the creation
transaction, and submits `contracts/verify/<Template>.json` (the standard JSON input from this
repo's build) to BOTScan. Regenerate those files with `node script/standard-json.mjs` after any
contract change; CI fails if they are stale.

## Security

See [SECURITY.md](SECURITY.md). We reply to reports within 72 hours.

## Licence

MIT. Copyright (c) 2026 Uzo Labs.

---

Built on BOT Chain ([botchain.ai](https://botchain.ai), [BOTScan](https://scan.botchain.ai)).
Uzo Labs is an independent project and is not affiliated with or endorsed by BOT Chain.
