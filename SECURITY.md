# Security policy

Uzo Deploy contracts are **tested, not audited**. See
[contracts/REVIEWS.md](contracts/REVIEWS.md) for what has been checked.

## Reporting a vulnerability

Please report security issues privately through GitHub: open the **Security** tab of
`uzolabs/uzo-deploy` and choose **Report a vulnerability**. Do not open a public issue.

Include:

- the contract or page affected, and the network (testnet or mainnet)
- steps to reproduce, or a proof of concept
- what an attacker could do with it

We will reply within **72 hours**, keep you updated while we work on it, and credit you when the
fix is public unless you ask us not to.

## What we can and cannot do

The factories and templates are immutable and have no admin keys. Uzo Labs cannot pause, upgrade
or change a deployed contract, and cannot move anyone's funds. If a template has a bug, we will
publish a warning, stop offering it in the app, and release a fixed version. Contracts already
deployed stay as they are.

## Scope

- Contracts in `contracts/src`
- The Uzo Deploy web app at https://deploy.uzolabs.xyz
- Scripts in `contracts/script`

Out of scope: BOT Chain itself, BOTScan, wallets, and third-party token contracts such as USDT.
