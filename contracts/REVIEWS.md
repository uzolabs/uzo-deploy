# Contract reviews

The Uzo contracts are **tested, not audited**. This file records what has been checked, what the
tools reported, and why each finding was accepted or fixed. Update it whenever a contract or a
tool result changes.

## Scope

| Contract | Role | Owner or admin |
| --- | --- | --- |
| `src/templates/UzoToken.sol` | Fixed-supply ERC-20 with permit and burn | None. No mint after the constructor. |
| `src/templates/UzoNFT.sol` | ERC-721 with capped supply, ERC-2981 royalties, freezable metadata | The user's chosen owner (two-step transfer). Uzo has no role. |
| `src/templates/UzoTipJar.sol` | Forwards BOT and USDT tips to a fixed recipient | None. |
| `src/factories/UzoTokenFactory.sol` | CREATE2 factory | None. |
| `src/factories/UzoNFTFactory.sol` | CREATE2 factory | None. |
| `src/factories/UzoTipJarFactory.sol` | CREATE2 factory, USDT fixed at deploy | None. |

Toolchain: Solidity 0.8.28, EVM `cancun`, optimizer 200 runs, OpenZeppelin Contracts v5.7.0,
Foundry 1.8.3.

## Properties we rely on

- **No custody.** The tip jar never holds funds. Native tips are forwarded in the same call, and
  USDT moves with `transferFrom(tipper, recipient)`. There is no `receive` or `fallback`, so plain
  transfers revert. Checked by unit tests and by three invariants over 16,384 random calls
  (`test/invariant/UzoTipJar.invariant.t.sol`).
- **No fees and no admin keys.** No factory has an owner, a pause, an upgrade path or a fee. Only
  `UzoNFT` has an owner, and that is the address the user picks.
- **No address squatting.** The CREATE2 salt is `keccak256(abi.encode(msg.sender, userSalt))`,
  so nobody can deploy to an address predicted for someone else. Tested in `test/Factories.t.sol`.
- **Predictable addresses.** `predictAddress` matches `deploy` for random salts and arguments
  (10,000 fuzz runs per factory).
- **Fixed supply.** `UzoToken` mints once in the constructor and has no other mint path.
- **Capped NFT supply.** `mintBatch` can never exceed `maxSupply`, including under reentrancy from
  `onERC721Received` (the count is updated before the safe-mint loop).

## Test results

- 86 tests: unit, fuzz (10,000 runs, fixed seed `0x5a0`), invariant (256 runs, depth 64) and
  deploy script tests. All pass.
- 5 fork tests run the tip jar against real testnet USDT. They skip when the testnet env from
  `script/sdk-env.mjs` is not loaded.
- `forge coverage`: 100% of lines (102/102), statements (116/116), branches (24/24) and functions
  (27/27) in `src/`.
- Gas snapshot is committed in `.gas-snapshot`. CI fails if it changes without being updated.

Gas used inside each factory `deploy` call: Token 914,201, NFT 1,440,805, Tip Jar 467,790.

## Slither 0.11.6

Run: `slither . --filter-paths "lib/|test/|script/"`. 102 detectors, 4 informational results.

| Detector | Where | Decision |
| --- | --- | --- |
| `low-level-calls` | `UzoTipJar.tipNative`, `recipient.call{value: msg.value}("")` | Accepted. Needed to forward BOT to contract recipients (for example a multisig). Protected by `nonReentrant`, the event is emitted before the call, and failure reverts the whole tip. |
| `too-many-digits` (x3) | `predictAddress` in each factory, `type(X).creationCode` | False positive. The "literal" is the template's creation code. |

## forge lint

Clean on `src/` and `script/`. Four warnings are suppressed inline, each with a comment in the
source:

| Lint | Where | Why it is safe |
| --- | --- | --- |
| `encode-packed-collision` (x3) | `predictAddress` in each factory | `abi.encodePacked(creationCode, abi.encode(args))` is exactly how CREATE2 init code is built. The creation code is a constant, so two different inputs cannot produce the same bytes. |
| `reentrancy-events` (x3) | `emit Deployed` after `new Template{salt: ...}` | The only external call is to our own template constructor, which makes no calls back into the factory. |
| `missing-zero-check` | `UzoTipJarFactory` constructor | The `usdt_.code.length == 0` check already rejects the zero address. |

## Design notes

- **No `tipTokenWithPermit`.** BOT Chain USDT has no EIP-2612 permit on either network (Phase 0),
  so USDT tips take two transactions: approve, then tip.
- **USDT is fixed per tip jar factory.** The deploy script reverts unless
  `UzoTipJarFactory.usdt()` equals the SDK's USDT, and `record-deployments.mjs` checks it again on
  chain before writing `config/deployments.json`.
- **Tip jar recipient cannot be the jar itself.** With CREATE2 this would need a hash fixed point,
  so the guard mainly matters for plain CREATE deploys of the template. Kept because it is cheap.
- **Messages are capped at 140 bytes and titles at 64 bytes** to bound the gas cost of logs.
- **`ReentrancyGuardTransient`** uses TSTORE, which BOT Chain supports (Phase 0, Cancun opcodes).

## Verification

Factories are verified with `forge verify-contract --verifier blockscout`, which worked on
BOTScan in 16 seconds in Phase 0. User instances are verified one by one through BOTScan's v2
standard-input API using Foundry's build info (Phase 2).

**Hardhat was dropped.** The brief listed Hardhat 3 with hardhat-verify for verification. Hardhat
3 always prefixes source names with `project/`, which changes the metadata hash. Since each factory
embeds its template's creation code, the factory bytecode then differs outside the metadata too,
so Hardhat cannot verify factories deployed by Foundry. The templates only get a partial match.
Foundry's own verifier gives a full match, so it is used instead.

## Known limitations

- Not audited. Do not use for large amounts until an independent audit is done.
- Tokens with transfer fees or rebasing are not supported by the tip jar. It only accepts the
  USDT fixed in its factory.
- NFT metadata hosting is the owner's job. Freezing metadata stops changes to the base URI only,
  not to whatever that URI serves.
