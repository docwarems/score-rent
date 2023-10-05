import { test, expect } from "@playwright/test";
require("dotenv").config();
const path = require("path");

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


test("checkout/checkin with user QR Code", async ({ page }) => {
  await gotoCheckoutPage(page);

  // User scan
  await page.getByRole("button", { name: "User/Leihzettel scannen" }).click();
  await expect(page.getByText("Scan an Image File")).toBeVisible({ timeout: 10 * 1000 });
  await page.getByText("Scan an Image File").click();
  await page.setInputFiles(
    'input[type="file"]',
    path.join(__dirname, "qr-test-user.png")
  );
  await expect(page.getByText("Benutzer: Monika Mustermann")).toBeVisible();

  await scanScoreAndCheckout(page);
  await page.goto(`/`);
  await checkin(page);
  //   await page.pause();
});

test("checkout/checkin with user last name", async ({ page }) => {
  await gotoCheckoutPage(page);

  await page.locator('input[name="userLastName"]').click();
  await page
    .locator('input[name="userLastName"]')
    .fill(process.env.PLAYWRIGHT_USER_LAST_NAME!);
  await page.getByRole("button", { name: "User über Namen suchen" }).click();

  await expect(
    page.getByRole("cell", {
      name: "Monika Mustermann",
    })
  ).toBeVisible();
  await expect(
    page
      .getByRole("cell", {
        name: "Auswählen",
      })
      .first()
  ).toBeVisible();
  await expect(
    page
      .getByRole("button", {
        name: "Auswählen",
      })
      .first()
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Auswählen",
    })
    .first()
    .click();
  await expect(page.getByText("Benutzer: Monika Mustermann")).toBeVisible();


  await scanScoreAndCheckout(page);
  await page.goto(`/`);
  await checkin(page);
  //   await page.pause();
});

async function gotoCheckoutPage(page: any) {
  await page.getByRole("link", { name: "Noten Ausleihe" }).click();
  await expect(page.getByRole("heading", { name: "Ausleihe" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "User/Leihzettel scannen" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "User über Namen suchen" })
  ).toBeVisible();
}

async function scanScoreAndCheckout(page: any) {
  // scan non existing score
  await page.getByRole("button", { name: "Noten scannen" }).click();
  await expect(page.getByText("Scan an Image File")).toBeVisible({ timeout: 10 * 1000 });
  await page.getByText("Scan an Image File").click();
  await page.setInputFiles(
    'input[type="file"]',
    path.join(__dirname, "qr-brfs-ad-150.png")
  );
  await expect(
    page.getByText("Score with Id BRFS-AD-150 not found")
  ).toBeVisible();

  // scan existing score
  await page.getByRole("button", { name: "Noten scannen" }).click();
  await page.getByText("Scan an Image File").click();
  await page.setInputFiles(
    'input[type="file"]',
    path.join(__dirname, "qr-brfs-ad-140.png")
  );
  //   await expect(page.getByText('Score with Id BRFS-AD-150 not found')).toBeVisible();

  await page.getByRole("button", { name: "Ausleihe" }).click();
  await expect(
    page.getByText(
      "Benutzer: Monika MustermannNoten Id BRFS-AD-140Ausleihe erfolgreich"
    )
  ).toBeVisible({ timeout: 10 * 1000 });
}

async function checkin(page: any) {
  await page.getByRole("link", { name: "Noten Rückgabe" }).click();
  await expect(page.getByRole("heading", { name: "Rückgabe" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Noten scannen" })
  ).toBeVisible();

  // scan non existing score
  await page.getByRole("button", { name: "Noten scannen" }).click();
  await expect(page.getByText("Scan an Image File")).toBeVisible({ timeout: 10 * 1000 });
  await page.getByText("Scan an Image File").click();
  await page.setInputFiles(
    'input[type="file"]',
    path.join(__dirname, "qr-brfs-ad-150.png")
  );
  await expect(
    page.getByText("Score with Id BRFS-AD-150 not found")
  ).toBeVisible();

  // TODO: scan score not checked out

  // scan existing score
  await page.getByRole("button", { name: "Noten scannen" }).click();
  await page.getByText("Scan an Image File").click();
  await page.setInputFiles(
    'input[type="file"]',
    path.join(__dirname, "qr-brfs-ad-140.png")
  );
  await page.getByRole("button", { name: "Rückgabe" }).click();
  await expect(page.getByText("Rückgabe erfolgreich")).toBeVisible({ timeout: 10 * 1000 });

  //   await page.pause();
}

test("checkout user not found", async ({ page }) => {
  await page.getByRole("link", { name: "Noten Ausleihe" }).click();
  await expect(page.getByRole("heading", { name: "Ausleihe" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "User/Leihzettel scannen" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "User über Namen suchen" })
  ).toBeVisible();

  await page.locator('input[name="userLastName"]').click();
  await page.locator('input[name="userLastName"]').fill("foo");
  await page.getByRole("button", { name: "User über Namen suchen" }).click();

  await expect(page.getByText("Benutzer nicht gefunden")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "User/Leihzettel scannen" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "User über Namen suchen" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Noten scannen" })
  ).toBeHidden();
});
