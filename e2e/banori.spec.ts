import { expect, test } from "@playwright/test";
import { TINY_PNG, loginAsResident } from "./helpers";

// Banorja demo: Drita Morina, Banesa 12. Testet ndjekin njëri-tjetrin mbi të njëjtat të dhëna.
test.describe.configure({ mode: "serial" });

test.describe("Aplikacioni i banorit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsResident(page);
  });

  test("ballina tregon sa ka për të paguar", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Drita" })).toBeVisible();
    await expect(page.getByText("Banesa 12 · Hyrja A")).toBeVisible();
    await expect(page.getByText("Për t'u paguar")).toBeVisible();
    await expect(page.getByRole("link", { name: "Paguaj tani" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Raporto prishje" }).first()).toBeVisible();
  });

  test("fatura ka të dhënat për m-banking dhe kodin QR", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("link", { name: "Faturat", exact: true }).click();
    await page.getByRole("link").filter({ hasText: "E papaguar" }).first().click();
    await expect(page).toHaveURL(/\/banori\/faturat\/.+/);
    await expect(page.getByRole("heading", { name: "Paguaj me m-banking" })).toBeVisible();
    await expect(page.getByText("XK05 1212 0123 4567 8906")).toBeVisible();
    await expect(page.getByText(/^HA-B12-\d{4}J?$/)).toBeVisible();
    await expect(page.getByRole("img", { name: "Kodi QR me të dhënat e pagesës" })).toBeVisible();

    await page.getByRole("button", { name: "Kopjo IBAN-in" }).click();
    await expect(page.getByRole("button", { name: "U kopjua" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("XK05 1212 0123 4567 8906");
  });

  test("dëshmia me format të palejuar refuzohet", async ({ page }) => {
    await page.getByRole("link", { name: "Faturat", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Të hapura" })).toBeVisible();
    await page.getByRole("link").filter({ hasText: "E papaguar" }).first().click();
    await page
      .getByLabel("Pagove? Ngarko screenshot-in e transferit")
      .setInputFiles({ name: "skript.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
    await page.getByRole("button", { name: "Dërgo dëshminë e pagesës" }).click();
    await expect(page.getByText(/Lejohen vetëm foto/)).toBeVisible();
  });

  test("ngarkimi i dëshmisë e kalon faturën në pritje", async ({ page }) => {
    await page.getByRole("link", { name: "Faturat", exact: true }).click();
    await page.getByRole("link").filter({ hasText: "E papaguar" }).first().click();
    await page
      .getByLabel("Pagove? Ngarko screenshot-in e transferit")
      .setInputFiles({ name: "deshmia.png", mimeType: "image/png", buffer: TINY_PNG });
    await page.getByRole("button", { name: "Dërgo dëshminë e pagesës" }).click();
    await expect(page.getByText(/Dëshmia u dërgua/).first()).toBeVisible();
    await expect(page.getByText("Në pritje", { exact: true })).toBeVisible();
  });

  test("raportimi i prishjes me tre hapa dhe ndjekja e statusit", async ({ page }) => {
    await page.getByRole("link", { name: "Raporto prishje" }).first().click();
    await expect(page.getByRole("heading", { name: "Raporto një prishje" })).toBeVisible();
    await page.locator("label").filter({ hasText: /^Uji$/ }).click();
    await page.getByLabel("Shto një foto").setInputFiles({ name: "tubi.png", mimeType: "image/png", buffer: TINY_PNG });
    await page.getByLabel("Përshkruaj shkurt").fill("Rrjedh ujë nga tubi në bodrum.");
    await page.getByRole("button", { name: "Dërgo raportin" }).click();
    await expect(page.getByRole("status")).toContainText("Raporti u dërgua te admini");
    await expect(page.getByText("Raporti yt i fundit")).toBeVisible();
    await expect(page.getByText("Rrjedh ujë nga tubi në bodrum.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Statusi: Dërguar" })).toBeVisible();
  });

  test("votimi: një votë për njësi dhe rezultatet pas votës", async ({ page }) => {
    await page.getByRole("link", { name: /Votimet/ }).click();
    await page.getByRole("link", { name: /A të vendosim kamera sigurie në parking\?/ }).click();
    await expect(page.getByText("Rezultatet shfaqen pasi të votosh.")).toBeVisible();
    await page.getByLabel("Po, pajtohem").check();
    await page.getByRole("button", { name: "Voto" }).click();
    await expect(page.getByText("Vota jote: Po, pajtohem")).toBeVisible();
    await expect(page.getByText("13 vota · 65%")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Voto" })).toHaveCount(0);
  });

  test("njoftimi i rëndësishëm shënohet si i lexuar", async ({ page }) => {
    await page.getByRole("link", { name: /^Njoftimet/ }).click();
    await expect(page.getByRole("heading", { name: "Njoftimet" })).toBeVisible();
    const buttons = page.getByRole("button", { name: "E lexova" });
    await expect(buttons.first()).toBeVisible();
    const before = await buttons.count();
    await buttons.first().click();
    await expect(buttons).toHaveCount(before - 1);
  });

  test("arka e hyrjes është e dukshme për banorin", async ({ page }) => {
    await page.getByRole("link", { name: "Arka", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Arka e hyrjes" })).toBeVisible();
    await expect(page.getByText("Gjendja aktuale")).toBeVisible();
    await expect(page.getByText("Fondi: Riparimi i kulmit")).toBeVisible();
    await expect(page.getByRole("link", { name: /Shiko faturën: Servisi i ashensorit/ }).first()).toBeVisible();
  });

  test("dëftesa e pagesës së paguar", async ({ page }) => {
    await page.getByRole("link", { name: "Faturat", exact: true }).click();
    await page.getByRole("link").filter({ hasText: "E paguar" }).first().click();
    await page.getByRole("link", { name: /Dëftesa #\d{4}/ }).click();
    await expect(page.getByText("Dëftesë pagese")).toBeVisible();
    await expect(page.getByText("Arben Gashi")).toBeVisible();
    await expect(page.getByRole("button", { name: "Printo ose ruaje si PDF" })).toBeVisible();
  });

  test("profili dhe dalja nga llogaria", async ({ page }) => {
    await page.getByRole("link", { name: "Profili", exact: true }).click();
    await expect(page.getByText("drita@myplace.test")).toBeVisible();
    await expect(page.getByText("Pronar", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Dil nga llogaria" }).click();
    await expect(page).toHaveURL(/\/hyr$/);
  });
});

test("hyrja demo me një klik", async ({ page }) => {
  await page.goto("/hyr");
  await page.getByRole("button", { name: "Si banor" }).click();
  await expect(page).toHaveURL(/\/banori$/);
});
