import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { loginAs } from "./helpers";

// Screenshot-et për promovim: `npm run screenshots` → docs/screenshots/.
// Merren mbi të dhënat demo të sapokrijuara, para çdo ndryshimi.

const OUT = path.join(process.cwd(), "docs", "screenshots");
const file = (name: string) => path.join(OUT, name);

test.describe.configure({ mode: "serial" });

async function desktop(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "sq-AL" });
  return context.newPage();
}

async function phone(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "sq-AL",
  });
  return context.newPage();
}

async function shot(page: Page, name: string, fullPage = false) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file(name), fullPage });
}

test("paneli i administratorit", async ({ browser }) => {
  const page = await desktop(browser);
  await page.goto("/hyr");
  await expect(page.getByRole("heading", { name: "Mirë se erdhe" })).toBeVisible();
  await shot(page, "01-hyrja.png");

  await loginAs(page, "admin@myplace.test");
  await expect(page.getByRole("heading", { name: "Pagesat për aprovim" })).toBeVisible();
  await shot(page, "02-admin-pasqyra.png");

  await page.goto("/admin/pagesat");
  await expect(page.getByRole("img", { name: /Dëshmia e pagesës/ }).first()).toBeVisible();
  await shot(page, "03-admin-pagesat.png");

  await page.goto("/admin/arka");
  await expect(page.getByRole("heading", { name: "Shpenzimet" })).toBeVisible();
  await shot(page, "04-admin-arka.png");

  await page.goto("/admin/prishjet");
  await expect(page.getByRole("heading", { name: /Të hapura/ })).toBeVisible();
  await shot(page, "05-admin-prishjet.png");

  await page.goto("/admin/printo");
  await expect(page.getByRole("heading", { name: /Pagesat · / })).toBeVisible();
  await shot(page, "06-fleta-per-hyrje.png", true);
  await page.context().close();
});

test("aplikacioni i banorit", async ({ browser }) => {
  const page = await phone(browser);
  await loginAs(page, "drita@myplace.test");
  await expect(page.getByRole("link", { name: "Paguaj tani" })).toBeVisible();
  await shot(page, "07-banori-ballina.png");

  await page.getByRole("link", { name: "Paguaj tani" }).click();
  await expect(page.getByRole("img", { name: "Kodi QR me të dhënat e pagesës" })).toBeVisible();
  await shot(page, "08-banori-fatura.png");

  await page.goto("/banori/raporto");
  await page.locator("label").filter({ hasText: /^Ashensori$/ }).click();
  await expect(page.getByText("Raporti yt i fundit")).toBeVisible();
  await shot(page, "09-banori-raporto.png");

  await page.goto("/banori/arka");
  await expect(page.getByText("Ku shkuan paratë")).toBeVisible();
  await shot(page, "10-banori-arka.png");

  await page.goto("/banori/votimet");
  await page.getByRole("link", { name: /kamera sigurie/ }).click();
  await page.getByLabel("Po, pajtohem").check();
  await shot(page, "11-banori-votimi.png");
  await page.context().close();
});

async function dataUrl(name: string) {
  return `data:image/png;base64,${(await readFile(file(name))).toString("base64")}`;
}

const FONT =
  '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">';
const LOGO = `<svg width="56" height="56" viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#e6f2ee"/><path d="M11 19.5 20 12l9 7.5V29a1 1 0 0 1-1 1h-5v-6h-6v6h-5a1 1 0 0 1-1-1z" fill="#0f3d36"/><rect x="17" y="24" width="6" height="6" fill="#3a9a88"/></svg>`;

function phoneFrame(src: string, width: number, extra = "") {
  return `<div style="width:${width}px;padding:${width * 0.035}px;border-radius:${width * 0.14}px;background:#0b2e29;box-shadow:0 40px 80px rgba(0,0,0,.35);${extra}">
    <img src="${src}" style="display:block;width:100%;border-radius:${width * 0.11}px">
  </div>`;
}

test("kolazhet për postim", async ({ browser }) => {
  const [admin, home, invoice, report, cashbox] = await Promise.all([
    dataUrl("02-admin-pasqyra.png"),
    dataUrl("07-banori-ballina.png"),
    dataUrl("08-banori-fatura.png"),
    dataUrl("09-banori-raporto.png"),
    dataUrl("10-banori-arka.png"),
  ]);

  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  await page.setContent(
    `<!doctype html><html><head>${FONT}</head>
    <body style="margin:0;font-family:'Plus Jakarta Sans',sans-serif">
      <div style="position:relative;width:1600px;height:1000px;overflow:hidden;background:#0f3d36;color:#fff">
        <div style="position:absolute;left:96px;top:92px;width:490px;display:flex;flex-direction:column;gap:26px">
          <div style="display:flex;align-items:center;gap:16px">${LOGO}<span style="font-size:34px;font-weight:800;letter-spacing:-.02em">MyPlace</span></div>
          <h1 style="margin:0;font-size:54px;line-height:1.06;font-weight:800;letter-spacing:-.03em">Gjithçka për hyrjen tënde, në një vend.</h1>
          <p style="margin:0;font-size:20px;line-height:1.5;color:rgba(255,255,255,.75);font-weight:500">Faturat, pagesat me QR, arka transparente, prishjet dhe votimet. Për administratorin dhe për çdo banor.</p>
        </div>
        <div style="position:absolute;left:660px;top:96px;width:1240px;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 40px 90px rgba(0,0,0,.35)">
          <div style="height:38px;display:flex;align-items:center;gap:8px;padding:0 16px;background:#e6f2ee">
            <span style="width:12px;height:12px;border-radius:50%;background:#3a9a88"></span>
            <span style="width:12px;height:12px;border-radius:50%;background:rgba(15,61,54,.25)"></span>
            <span style="width:12px;height:12px;border-radius:50%;background:rgba(15,61,54,.25)"></span>
          </div>
          <img src="${admin}" style="display:block;width:100%">
        </div>
        <div style="position:absolute;left:300px;top:470px;display:flex;gap:28px;align-items:flex-end">
          ${phoneFrame(home, 270)}
          ${phoneFrame(invoice, 270, "margin-bottom:-70px")}
        </div>
      </div>
    </body></html>`,
    { waitUntil: "networkidle" },
  );
  await shot(page, "promo-hero.png");

  await page.setViewportSize({ width: 1080, height: 1350 });
  await page.setContent(
    `<!doctype html><html><head>${FONT}</head>
    <body style="margin:0;font-family:'Plus Jakarta Sans',sans-serif">
      <div style="position:relative;width:1080px;height:1350px;overflow:hidden;background:#e6f2ee;color:#0f3d36">
        <div style="padding:96px 90px 0;display:flex;flex-direction:column;gap:22px">
          <span style="display:inline-flex;align-self:flex-start;padding:10px 18px;border-radius:999px;background:#0f3d36;color:#fff;font-size:20px;font-weight:700">Aplikacioni i banorit</span>
          <h1 style="margin:0;font-size:64px;line-height:1.05;font-weight:800;letter-spacing:-.03em">Paguaj, raporto dhe shih ku shkojnë paratë e hyrjes.</h1>
          <p style="margin:0;font-size:24px;line-height:1.5;color:rgba(15,61,54,.75);font-weight:500">IBAN dhe QR për m-banking, prishjet me 3 klikime dhe arka e hapur për të gjithë banorët.</p>
        </div>
        <div style="position:absolute;left:50%;top:560px;transform:translateX(-50%);display:flex;gap:28px;align-items:flex-start">
          ${phoneFrame(report, 300, "margin-top:100px")}
          ${phoneFrame(home, 360)}
          ${phoneFrame(cashbox, 300, "margin-top:100px")}
        </div>
      </div>
    </body></html>`,
    { waitUntil: "networkidle" },
  );
  await shot(page, "promo-telefonat.png");
  await page.close();
});
