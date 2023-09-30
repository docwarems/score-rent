import { test, expect } from "@playwright/test";
require("dotenv").config();

test.beforeEach(async ({ page }) => {
  // login
  await page.goto(`/login`);
  await page.locator('input[name="email"]').click();
  await page
    .locator('input[name="email"]')
    .fill(process.env.PLAYWRIGHT_ADMIN_USER!);
  await page.locator('input[name="email"]').press("Tab");
  await page
    .locator('input[name="password"]')
    .fill(process.env.PLAYWRIGHT_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(
    page.getByRole("link", { name: "Ausleihen anzeigen" })
  ).toBeVisible();
});

test("Show checkouts", async ({ page }) => {
  await page.getByRole("link", { name: "Ausleihen anzeigen" }).click();
  await expect(page.getByRole("heading", { name: "Ausleihen" })).toBeVisible();
  await page.getByRole("combobox").selectOption("ORFF-COM");
  await page.getByRole("button", { name: "Suchen" }).click();

  await expect(
    page.getByRole("cell", {
      name: "ORFF-COM-1f3e2bf1-7dbb-43c7-9b9e-b8b4f7f0306f",
    })
  ).toBeVisible();

  // filter by extId
  await expect(
    page.getByRole("cell", { name: "Filtern.." }).first()
  ).toBeVisible();
  await page.locator("#searchScoreExtIdInput").click();
  await page.locator("#searchScoreExtIdInput").pressSequentially("9"); // fill will not create keypress event and thus will not reduce the list
  // extId '115' should become hidden
  await expect(
    page.getByRole("cell", {
      name: "ORFF-COM-1f3e2bf1-7dbb-43c7-9b9e-b8b4f7f0306f",
    })
  ).toBeHidden();
  await page.keyboard.press("Backspace");

  // filter by last name
  await expect(
    page.getByRole("cell", { name: "Filtern.." }).nth(1)
  ).toBeVisible();
  await page.locator("#searchUserInput").click();
  await page.locator("#searchUserInput").pressSequentially("Be"); // fill will not create keypress event and thus will not reduce the list
  // extId '115' should become hidden
  await expect(
    page.getByRole("cell", {
      name: "ORFF-COM-1f3e2bf1-7dbb-43c7-9b9e-b8b4f7f0306f",
    })
  ).toBeHidden();
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
});
