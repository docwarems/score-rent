import { test, expect } from "@playwright/test";
require("dotenv").config();

test.beforeEach(async ({ page }) => {
  // login
  await page.goto(`/login`);
  await page.locator('input[name="email"]').click();
  await page.locator('input[name="email"]').fill(process.env.PLAYWRIGHT_USER!);
  await page.locator('input[name="email"]').press("Tab");
  await page
    .locator('input[name="password"]')
    .fill(process.env.PLAYWRIGHT_PASSWORD!);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(
    page.getByRole("link", { name: "Ausleihen anzeigen" })
  ).toBeVisible();
});

test.skip("Show checkouts", async ({ page }) => {
  await page.getByRole("link", { name: "Ausleihen anzeigen" }).click();

  await expect(page.getByRole("heading", { name: "Ausleihen" })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Orff De temporum fine comoedia" }).first()
  ).toBeVisible();
});
