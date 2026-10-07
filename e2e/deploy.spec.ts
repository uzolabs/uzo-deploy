import { expect, test, type Page } from "@playwright/test"

// Runs against a local Anvil fork of BOT Chain testnet with a mock wallet (see
// playwright.config.ts). Transactions are real on the fork; BOTScan is not, so the
// verify call is answered here instead.

async function mockVerify(page: Page) {
  await page.route("**/api/verify", (route) => route.fulfill({ json: { status: "verified" } }))
}

/** Fills the form, signs and waits for the deploy. Returns the new contract address. */
async function deploy(page: Page, slug: string, fill: (page: Page) => Promise<void>) {
  await mockVerify(page)
  await page.goto(`/deploy/${slug}`)
  await fill(page)
  await page.getByRole("button", { name: "Review" }).click()
  await page.getByRole("button", { name: "Sign and deploy" }).click()
  await expect(page.getByText("Verified on BOTScan")).toBeVisible({ timeout: 60_000 })

  const manage = page.getByRole("link", { name: "Manage" })
  const href = await manage.getAttribute("href")
  const address = href?.match(/0x[0-9a-fA-F]{40}/)?.[0]
  expect(address).toBeTruthy()
  return { manage, address: address! }
}

test("deploy a token, then manage it and find it under my contracts", async ({ page }) => {
  const name = `E2E Token ${Date.now()}`
  const { manage, address } = await deploy(page, "token", async (p) => {
    await p.getByLabel("Token name").fill(name)
    await p.getByLabel("Symbol").fill("E2E")
    await p.getByLabel("Total supply").fill("1000")
    // The supply goes to the connected wallet unless something else is typed.
    await expect(p.getByLabel("Send the supply to")).not.toHaveValue("")
  })

  await manage.click()
  await expect(page).toHaveURL(new RegExp(`/manage/${address}`, "i"))
  await expect(page.getByRole("heading", { level: 2, name: "Token", exact: true })).toBeVisible()
  await expect(page.getByText(name).first()).toBeVisible()

  // The list is read from chain logs and cached briefly on the server, so allow a refresh.
  await expect(async () => {
    await page.goto("/my")
    await expect(page.getByText(`${name} (E2E)`)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText("You deployed a token to BOT Chain Testnet.")).toBeVisible()
    await expect(page.getByText("Total supply: 1,000 E2E.")).toBeVisible()
  }).toPass({ timeout: 90_000, intervals: [5_000] })
})

test("deploy a tip jar and send it a tip in the native coin", async ({ page }) => {
  const title = `E2E Jar ${Date.now()}`
  const { address } = await deploy(page, "tip-jar", async (p) => {
    await p.getByLabel("Title").fill(title)
    await expect(p.getByLabel("Recipient")).not.toHaveValue("")
  })

  await page.goto(`/tip/${address}?network=testnet`)
  await expect(page.getByText(title).first()).toBeVisible()
  // The native coin is BOT on mainnet and tBOT on testnet.
  await page.getByText(/^t?BOT$/).click()
  await page.getByLabel("Or enter an amount").fill("0.01")
  await page.getByRole("button", { name: /^Send 0\.01 t?BOT$/ }).click()
  await expect(page.getByText("Tip sent")).toBeVisible({ timeout: 60_000 })
})
