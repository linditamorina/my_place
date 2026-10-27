import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "myplace-demo";

export async function loginAs(page: Page, email: string) {
  await page.goto("/hyr");
  await page.getByLabel("Email-i").fill(email);
  await page.getByLabel("Fjalëkalimi").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Hyr", exact: true }).click();
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, "admin@myplace.test");
  await expect(page).toHaveURL(/\/admin$/);
}

export async function loginAsResident(page: Page) {
  await loginAs(page, "drita@myplace.test");
  await expect(page).toHaveURL(/\/banori$/);
}

/** Një PNG e vogël e vlefshme, për ngarkimin e dëshmive dhe fotove. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
