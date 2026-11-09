# Phase 5 beta kit

Everything needed to run the outside test on `deploy.uzolabs.xyz` (testnet only).
Goal: at least 10 people who have not seen the app, each finishing the task alone.

## 1. Invite message

Copy, paste, change the name.

> Hi {name}, I'm testing a small tool called Uzo Deploy. It lets you put a token,
> an NFT collection or a tip jar on BOT Chain testnet from your own wallet, no code.
> It uses test coins only, so nothing real is at stake.
>
> Could you give it 10 minutes this week? Open https://deploy.uzolabs.xyz on your
> phone and follow the task sheet I'll send. Please don't ask me for help while
> you do it. Wherever you get stuck or unsure is exactly what I need to hear.

## 2. Task sheet (send to the tester)

Use your phone if you can. Time yourself from step 1 to step 4.

1. Open https://deploy.uzolabs.xyz.
2. Get some free testnet BOT for your wallet.
3. Deploy a token with any name and symbol you like.
4. Find your token on BOTScan and check it says it is verified.
5. Find the token again from "My contracts".
6. Optional: deploy a tip jar and send yourself a small tip.

Then answer:

- How long did steps 1 to 4 take?
- Where did you pause, re-read, or guess? Quote the words on screen if you can.
- Was anything on the page wrong, broken or hard to read?
- What phone and browser, and which wallet?
- Would you use this for a real project? Why or why not?

## 3. Confusion log (for you)

One row per problem. Count how many testers hit the same thing; fix the biggest counts first.

| # | Tester | Device / wallet | Step | What they said or did | Times seen | Fix | Fixed in |
|---|--------|-----------------|------|-----------------------|------------|-----|----------|
| 1 |        |                 |      |                       |            |     |          |

What to watch for:

- Time to a verified token over 3 minutes (the v1 target).
- Getting testnet BOT: did they find the faucet and come back?
- Wrong network in the wallet, and whether the notice told them what to do.
- Any word they did not understand (factory, CREATE2, verify, permit, burn).
- Waiting with no sign that something is happening.

## 4. Already checked before the test

- Lighthouse, mobile, local production build: Accessibility 100, Best Practices 100, SEO 100 on every page.
- Performance: home about 65 to 74, /deploy about 60 to 69, token page about 41.
- Initial JS on home and /deploy: 1550 KB down to 727 KB.
- E2E on a local fork: deploy, manage and tip flows pass at 360px width.
