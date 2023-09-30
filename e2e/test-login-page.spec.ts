import { test, expect } from "@playwright/test";
require("dotenv").config();

test("has title", async ({ page }) => {
  await page.goto(`/login`);

  await expect(page).toHaveTitle(/HSC Leihnoten Verwaltung/);
});

test("Password forgotten link", async ({ page }) => {
  await page.goto(`/login`);

  await page.getByRole("link", { name: "Passwort vergessen" }).click();

  await expect(
    page.getByRole("heading", { name: "Passwort vergessen" })
  ).toBeVisible();
});

test("Login link", async ({ page }) => {
  await page.goto(`login`);
  await page.locator('input[name="email"]').click();
  await page.locator('input[name="email"]').fill(process.env.PLAYWRIGHT_USER!);
  await page.locator('input[name="email"]').press("Tab");
  await page
    .locator('input[name="password"]')
    .fill(process.env.PLAYWRIGHT_PASSWORD!);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(
    page.getByRole("link", { name: "QRCode für Login anzeigen" })
  ).toBeVisible();
});
