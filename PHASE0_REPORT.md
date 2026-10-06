# Phase 0 Report: Reality Check

Status: **complete except the wallet matrix** (section 9, manual, Chidile). Measurements taken 2026-10-06. Every number here was measured, unless a line says "estimate".

## 1. Findings that change the brief

| # | Brief says | What we measured | Decision |
| --- | --- | --- | --- |
| 1 | `eth_getLogs` is disabled on the public mainnet RPC | **It works.** Address-filtered queries over 100k-block ranges return in seconds. A genesis-to-latest query for a busy contract (mainnet USDT) **times out at 30 s** (`-32002`). The same query for a quiet address (no logs) over the full history returns in about 8 s on mainnet and 2 s on testnet. | **RPC is the primary source** (Chidile, 2026-10-06). Scan in chunks from each factory's deploy block (stored in `config/deployments.json`). BOTScan's `module=logs` is the fallback. Both go behind one `LogSource` interface. |
| 2 | USDT permit unknown | **No permit on either network.** Both are plain OpenZeppelin `ERC20 + ERC20Burnable + AccessControl` contracts, with no `DOMAIN_SEPARATOR` or `nonces` (verified source on BOTScan). | Drop `tipTokenWithPermit`. Tipping in USDT takes two steps, approve then tip. Permit2 exists on both chains and is an option for v1.2. |
| 3 | Maybe BOTScan auto-verifies identical bytecode | **Not for our case.** The twin match is on *deployed* bytecode, which includes immutables. Our templates have immutables that differ per user (the recipient, for example), so instances never match each other. Even an exact twin is only *linked* (`verified_twin_address_hash`) and stays `is_verified: false`; we watched for more than 2 minutes. Verifying the factory does **not** verify its children. | `/api/verify` must submit **every** instance. Verification is fast (about 5 to 6 s), so this is fine. |
| 4 | No WebSocket RPC | Confirmed: the upgrade request returns `200`, not `101` | Polling |
| 5 | Vercel KV | No longer offered | Upstash Redis via the Vercel Marketplace |

## 2. Networks (match `@uzolabs/sdk` 0.2.0 exactly)

| | Mainnet | Testnet |
| --- | --- | --- |
| `eth_chainId` | 677 | 968 |
| Client | `Geth/v1.5.13` (version line suggests a BSC-family fork) | same |
| Block gas limit | 35,000,000 | 35,000,000 |
| Average block time | 0.75 s over 10,000 blocks | not measured |
| Cancun opcodes | PUSH0, TSTORE/TLOAD, MCOPY, BLOBBASEFEE all work | same |
| RPC CORS | `*` | `*` |

The SDK (MIT, peer dependency `viem ^2`) exports `botChain`, `botChainTestnet`, `addresses`, `TOKENS` (`USDT` 6 decimals, `BOT` 18), `erc20Abi` and `createExplorerClient`, plus Permit2, Multicall3 and the BDEX addresses. Code is present at the Permit2, Multicall3 and the deterministic CREATE2 deployer (`0x4e59...956C`) on both chains.

## 3. Gas price

- `baseFeePerGas` is always **0**. `eth_gasPrice` = `eth_maxPriorityFeePerGas` = **20 gwei**. viem's `estimateFeesPerGas` returns 20/20 gwei, so wagmi defaults work with no override.
- `eth_feeHistory` (capped at 50 blocks): p10/p50/p90 rewards were 20/20/22 gwei in 49 of 50 blocks. Blocks are on average 0.36% full. Every testnet transaction we sent paid exactly 20 gwei.
- Cost shown before signing = `estimateGas * gasPrice`. **1,000,000 gas = 0.02 BOT.**
- `eth_estimateGas` came in **1.5% above** actual gas used (173,161 estimated, 170,639 used). No extra buffer is needed for the display; wallets add their own.

## 4. Measured gas and latency (testnet)

| Operation | Gas used | Cost at 20 gwei |
| --- | --- | --- |
| Deploy a small factory (spike, about 1.6 KB of runtime code) | 405,746 | 0.0081 |
| Factory `deploy` of a child via CREATE2 (one immutable plus a short string) | 170,639 | 0.0034 |
| Plain BOT transfer | 21,000 | 0.00042 |
| USDT `approve` (new allowance) | 46,961 | 0.00094 |
| USDT `transferFrom` to a new holder (the core of `tipToken`) | 58,254 | 0.0012 |
| BDEX V2 swap tBOT to USDT | 119,134 | 0.0024 |

Estimates for the real templates (to be measured in Phase 2): Token about 1.3M to 1.6M gas (about 0.03 BOT), NFT about 2.0M to 2.6M (about 0.05 BOT), Tip Jar about 0.5M to 0.7M (about 0.014 BOT). **A first-time mainnet user needs about 0.1 BOT.**

**Latency** (viem, `waitForTransactionReceipt` polling every 0.5 s, 5 transactions): `sendTransaction` took 0.8 s (2.2 s on a cold first call), and the receipt arrived 0.4 to 1.7 s later. **From signing to confirmed takes under about 2.5 s**, so the UI can show confirmation almost instantly. (`cast send` showed 6 to 7 s only because of its own slower polling.)

## 5. BOTScan API

| Item | Result |
| --- | --- |
| CORS | `*` on both explorers |
| Rate limits | No rate-limit headers, and 40 rapid requests all returned 200. Served behind Cloudflare. We cache and back off on 429 anyway. |
| Logs | `GET /api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address=<addr>` works from genesis, including `timeStamp` |
| Creation info | `GET /api/v2/addresses/<addr>` returns `creator_address_hash` (the factory, for children) and `creation_transaction_hash`. Indexed within seconds. |
| Contract status | `GET /api/v2/addresses/<addr>` returns `is_verified` for every address. `GET /api/v2/smart-contracts/<addr>` returns the verification flags only once BOTScan has some source for the contract; for an unknown contract it returns just the bytecode. |
| Verification config | Methods `standard-input`, `multi-part`, `flattened-code`. `v0.8.28+commit.7893614a` and EVM `cancun` are available. |
| `backend_version` | Empty, so it can't be pinned. Keep the client thin. |

## 6. Verification flow for factory-created contracts (tested)

Primary path: Blockscout v2, multipart form:

```
POST {explorer}/api/v2/smart-contracts/{instance}/verification/via/standard-input
  compiler_version            = v0.8.28+commit.7893614a
  contract_name               = src/templates/UzoToken.sol:UzoToken   (path:Name, as in the standard JSON input)
  license_type                = mit
  autodetect_constructor_args = false
  constructor_args            = <hex, no 0x>
  files[0]                    = standard JSON input (from our build artifacts)
-> 200 {"message":"Smart-contract verification started"}       (asynchronous)
-> 200 {"message":"Already verified"}                          (idempotent)
```

Then poll `GET /api/v2/addresses/{instance}` until `is_verified` is true. **It took 6 s.** `autodetect_constructor_args=true` also worked (instance B), but we will pass the args explicitly, decoded from the creation transaction, so failures are deterministic.

Fallback path: Etherscan-style.

```
POST {explorer}/api?module=contract&action=verifysourcecode
  codeformat=solidity-standard-json-input, contractaddress, contractname, compilerversion,
  constructorArguements (sic), licenseType=3, sourceCode=<standard JSON input>
-> {"status":"1","result":"<guid>"}
GET  /api?module=contract&action=checkverifystatus&guid=<guid>
-> "Pass - Verified" (after 5 s)  |  "Fail - Unable to verify"
Already verified -> {"status":"0","result":"Smart-contract already verified."}
```

Factories: `forge verify-contract --verifier blockscout --verifier-url https://scan.bohr.life/api/ --watch` worked in 16 s.

What this means for `/api/verify`:

1. Get `creation_transaction_hash` and `creator_address_hash` from BOTScan, or find them through our own `Deployed` log index.
2. Check that the creator is one of our factories, using our config, never client input.
3. Fetch the receipt from the RPC, find our `Deployed` event, and decode the factory call's input to rebuild the constructor args.
4. Submit with the standard JSON input from our artifacts.
5. Poll `is_verified`.

A failure shows up as the asynchronous `Fail` result, or as `is_verified` still false after a timeout of about 30 s. In either case the UI offers a retry and the manual `forge verify-contract` command.

## 7. Testnet USDT

- **Where testnet users get USDT: the official BOT Chain faucet**, https://faucet.botchain.ai, "Test USDT" option. It gives 1,000 test USDT per claim, once every 24 hours, on BOT Chain Testnet. The faucet also has a "Test BOT" option for gas. The faucet states that tBOT and tUSDT have no monetary value. Our docs and the tip jar's testnet empty state link here. Uzo Deploy builds no faucet or swap feature.
- Only one address holds `MINTER_ROLE` and `DEFAULT_ADMIN_ROLE`: `0x2391...4a6c`, presumably BOT Chain's.
- A BDEX V2 tBOT/USDT pool also exists on testnet (`0xD3EC...94Fa`, reserves about 527 tBOT and 8,480 USDT). 0.05 tBOT swapped for 0.80 USDT through `addresses[968].bdexV2Router02`. This is a backup only; the docs point to the faucet.
- Mainnet USDT has the same admin-mintable design. The tip page should say "USDT on BOT Chain" and imply nothing about who issues it.

## 8. On-chain test log (testnet)

Test key `0xff08064bC2764216dE386CCdC4412f3727A8B246`: testnet only, stored in `.secrets/` (gitignored), never to hold mainnet funds. Balance after the tests: 1.92 tBOT.

| What | Address / tx | Result |
| --- | --- | --- |
| SpikeFactory | `0x754EB6fd4679345D77483540767EE0383697B329` (tx `0x1b4a33d4...d301`) | Verified with forge in 16 s |
| Child A (recipient = test key, "Spike-tip-jar") | `0xe743d34442732f2dbaa23cf360a0873d5226e13d` | Not verified by verifying the factory. Verified through the v2 API with explicit args in 6 s |
| Child B (same args as A) | `0xef4bed73a14f82e94c3d8ebe46a6afe7f5fd7377` | Linked as A's twin but **not verified** after 2+ min. Verified through the v2 API with autodetected args |
| Child C (different recipient and title) | `0xa05755e95889154f5d36b31db058d4989fb62420` | No twin link. Verified through the Etherscan-style API in 5 s |
| Child D (wrong contract name, on purpose) | `0xb2f3c1861a36cf4cd831ece666275ff582affc88` | `Fail - Unable to verify`, as expected |
| Resubmit A | | v2: `Already verified`. Etherscan-style: `status 0, already verified` |

The spike source is in `phase0/spike/`, and `phase0/stdin-child.json` is the exact standard JSON input submitted. Both are deleted at the start of Phase 1.

## 9. Wallet tests (Chidile, manual)

For each wallet: add chain 968, then 677, with the SDK values; switch between them; send a 0-value transaction to yourself on testnet. Take a screenshot of each step. A one-click `wallet_addEthereumChain` test page will ship early in Phase 3, along with the WalletConnect test (Reown project ID received, stored in `.env.local`).

| Wallet | Adds 968 | Adds 677 | Shows BOT symbol and balance | Sends tx | Notes |
| --- | --- | --- | --- | --- | --- |
| MetaMask (extension) | | | | | |
| MetaMask Mobile | | | | | |
| Rabby | | | | | |
| OKX Wallet | | | | | |
| Bitget Wallet | | | | | |
| Trust Wallet (WalletConnect) | | | | | |

## 10. Design reference

`uzolabs/website` (commit `538349a`) is the pattern source: Next 16, Tailwind 4, shadcn (radix-ui), lucide, sonner, next-themes, `components/uli/*` motifs, and self-hosted Satoshi woff2 files. Phase 3 will copy its tokens (`globals.css`), Uli components, fonts and footer structure.

## 11. Open questions

1. ~~Where do testnet users get USDT?~~ **Answered (Chidile, 2026-10-06):** the BOT Chain faucet's "Test USDT" option. See section 7.
2. Website version mismatch to note: the website pins `lucide-react ^1.48` and `framer-motion ^13`. We'll match those versions so shared components copy over cleanly.
