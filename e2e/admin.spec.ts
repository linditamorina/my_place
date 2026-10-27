import { expect, test } from "@playwright/test";
import { TINY_PNG, loginAs, loginAsAdmin } from "./helpers";

// Testet ndjekin njëri-tjetrin mbi të njëjtat të dhëna demo (shih global-setup.ts).
test.describe.configure({ mode: "serial" });

test.describe("Hyrja dhe qasja", () => {
  test("pa llogari, paneli të dërgon te faqja e hyrjes", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/hyr$/);
  });

  test("fjalëkalimi i gabuar shfaq gabim", async ({ page }) => {
    await page.goto("/hyr");
    await page.getByLabel("Email-i").fill("admin@myplace.test");
    await page.getByLabel("Fjalëkalimi").fill("fjalekalim-i-gabuar");
    await page.getByRole("button", { name: "Hyr", exact: true }).click();
    await expect(page.getByText("Email-i ose fjalëkalimi nuk janë të saktë.")).toBeVisible();
    await expect(page).toHaveURL(/\/hyr$/);
  });

  test("banori nuk mund të hapë panelin e adminit", async ({ page }) => {
    await loginAs(page, "drita@myplace.test");
    await expect(page).toHaveURL(/\/banori$/);
    await page.goto("/admin/pagesat");
    await expect(page).toHaveURL(/\/banori$/);
  });

  test("dëshmia e pagesës shihet vetëm nga admini dhe njësia e vet", async ({ page, browser }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/pagesat");
    const proof = page.getByRole("img", { name: "Dëshmia e pagesës nga Fatmir Krasniqi" });
    const src = await proof.getAttribute("src");
    expect(src).toMatch(/^\/api\/skedaret\//);
    expect((await page.request.get(src!)).status()).toBe(200);

    const anonymous = await browser.newContext();
    expect((await anonymous.request.get(src!)).status()).toBe(401);
    await anonymous.close();

    const neighbour = await browser.newContext();
    const neighbourPage = await neighbour.newPage();
    await loginAs(neighbourPage, "drita@myplace.test");
    await expect(neighbourPage).toHaveURL(/\/banori$/);
    expect((await neighbourPage.request.get(src!)).status()).toBe(404);
    expect((await neighbourPage.request.get("/api/skedaret/..%2F..%2F.env")).status()).toBe(404);
    await neighbour.close();
  });
});

test.describe("Paneli i administratorit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("pasqyra tregon arkën, borxhet dhe pagesat në pritje", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Mirëdita, Arben" })).toBeVisible();
    await expect(page.getByText("1.430,60 €")).toBeVisible();
    await expect(page.getByText("4 njësi", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pagesat për aprovim" })).toBeVisible();
    await expect(page.getByText("Blerim Hoxha")).toBeVisible();
    await expect(page.getByText("A të vendosim kamera sigurie në parking?")).toBeVisible();
  });

  test("aprovimi i dëshmisë lëshon dëftesën e radhës", async ({ page }) => {
    await page.goto("/admin/pagesat");
    await expect(page.getByRole("heading", { name: "Në pritje të aprovimit (3)" })).toBeVisible();
    const card = page.locator("section").filter({ hasText: "Arta Berisha" }).last();
    await card.getByRole("button", { name: "Aprovo" }).click();
    await expect(page.getByRole("heading", { name: "Në pritje të aprovimit (2)" })).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: "#0058" });
    await expect(row).toContainText("Banesa 18");
    await expect(row).toContainText("25,00 €");
  });

  test("refuzimi i dëshmisë e kthen faturën në të papaguar", async ({ page }) => {
    await page.goto("/admin/pagesat");
    const card = page.locator("section").filter({ hasText: "Blerim Hoxha" }).last();
    await card.getByRole("button", { name: "Refuzo" }).click();
    await expect(page.getByRole("heading", { name: "Në pritje të aprovimit (1)" })).toBeVisible();
    await expect(page.getByRole("option", { name: /Banesa 7 · Blerim Hoxha/ })).toBeAttached();
  });

  test("pagesa me kesh mbyll borxhin e njësisë", async ({ page }) => {
    await page.goto("/admin/banesat");
    await expect(page.getByText("5 me borxh")).toBeVisible();
    const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "Banesa 3", exact: true }) });
    await row.getByRole("button", { name: "Pagesë kesh" }).click();
    await expect(row.getByRole("button", { name: "Pagesë kesh" })).toHaveCount(0);
    await expect(page.getByText("4 me borxh")).toBeVisible();
  });

  test("ndryshimi i tarifës mujore", async ({ page }) => {
    await page.goto("/admin/banesat");
    const fee = page.getByLabel("Tarifa mujore për Lokali 1");
    await fee.fill("30,00");
    await page.getByRole("row").filter({ has: fee }).getByRole("button", { name: "Ruaj" }).click();
    await page.goto("/admin/aktiviteti");
    await expect(page.getByText("Ndryshoi tarifën mujore të Lokali 1 nga 25,00 € në 30,00 €.")).toBeVisible();
  });

  test("gjenerimi i faturave të muajit tjetër", async ({ page }) => {
    await page.goto("/admin/faturat");
    const button = page.getByRole("button", { name: /Gjenero faturat e / });
    const before = (await button.textContent())!.trim();
    await button.click();
    await expect(page.getByRole("button", { name: /Gjenero faturat e / })).not.toHaveText(before);
    await page.goto("/admin/aktiviteti");
    await expect(page.getByText(/Gjeneroi 32 fatura për/).first()).toBeVisible();
  });

  test("fatura e jashtëzakonshme: validimi dhe krijimi", async ({ page }) => {
    await page.goto("/admin/faturat");
    await page.getByLabel("Përshkrimi").fill("Ngjyrosja e shkallëve");
    await page.getByLabel("Shuma për njësi (€)").fill("dhjetë");
    await page.getByRole("button", { name: "Krijo faturat" }).click();
    await expect(page.getByText(/Shuma nuk është e vlefshme/)).toBeVisible();

    await page.getByLabel("Përshkrimi").fill("Ngjyrosja e shkallëve");
    await page.getByLabel("Shuma për njësi (€)").fill("12,50");
    await page.getByLabel("Vetëm banesat").check();
    await page.getByRole("button", { name: "Krijo faturat" }).click();
    await expect(page.getByRole("status")).toContainText("U krijuan 30 fatura prej 12,50 €.");
    await expect(page.getByRole("cell", { name: /Ngjyrosja e shkallëve/ }).first()).toBeVisible();
  });

  test("shpenzimi i ri me faturë shfaqet te arka", async ({ page }) => {
    await page.goto("/admin/arka");
    await page.getByLabel("Kategoria").selectOption("RIPARIME");
    await page.getByLabel("Përshkrimi").fill("Llamba LED për shkallët");
    await page.getByLabel("Shuma (€)").fill("18,90");
    await page.getByLabel("Fatura e furnitorit").setInputFiles({ name: "fatura.png", mimeType: "image/png", buffer: TINY_PNG });
    await page.getByRole("button", { name: "Shto shpenzimin" }).click();
    await expect(page.getByRole("status")).toContainText("U shtua shpenzimi 18,90 €.");
    await expect(page.getByRole("link", { name: "Shiko faturën: Llamba LED për shkallët" })).toBeVisible();
  });

  test("prishja kalon nëpër statuse dhe merr shënim", async ({ page }) => {
    await page.goto("/admin/prishjet");
    await expect(page.getByRole("heading", { name: "Të hapura (2)" })).toBeVisible();
    const card = page.locator("section").filter({ hasText: "Llamba në shkallë te kati 5" }).last();
    await card.getByLabel("Statusi").selectOption("NE_PROCES");
    await card.getByLabel("Shënim për banorin").fill("Elektricisti vjen nesër në ora 10:00.");
    await card.getByRole("button", { name: "Ruaj" }).click();
    await page.reload();
    await expect(card.getByLabel("Statusi")).toHaveValue("NE_PROCES");
    await expect(card.getByLabel("Shënim për banorin")).toHaveValue("Elektricisti vjen nesër në ora 10:00.");

    const lift = page.locator("section").filter({ hasText: "Ashensori ndalet" }).last();
    await lift.getByLabel("Statusi").selectOption("KRYER");
    await lift.getByRole("button", { name: "Ruaj" }).click();
    await expect(page.getByRole("heading", { name: "Të hapura (1)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Të kryera (2)" })).toBeVisible();
  });

  test("njoftimi i ri publikohet për banorët", async ({ page }) => {
    await page.goto("/admin/njoftimet");
    await page.getByLabel("Titulli").fill("Ndërprerje e rrymës");
    await page.getByLabel("Teksti").fill("Të enjten nga ora 10:00 deri në 11:00 KESCO punon në rrjet.");
    await page.getByRole("checkbox", { name: /E rëndësishme/ }).check();
    await page.getByRole("button", { name: "Publiko njoftimin" }).click();
    await expect(page.getByRole("status")).toContainText("Njoftimi u publikua");
    const notice = page.locator("section").filter({ hasText: "Ndërprerje e rrymës" }).last();
    await expect(notice).toContainText("0 nga 4 banorë e lexuan");
  });

  test("votimi i ri hapet me afat", async ({ page }) => {
    await page.goto("/admin/votimet");
    await page.getByLabel("Pyetja").fill("A të mbjellim lule në oborr?");
    await page.getByLabel("Përshkrimi").fill("Kostoja është 5 € për banesë.");
    await page.getByRole("button", { name: "Hap votimin" }).click();
    await expect(page.getByRole("status")).toContainText("Votimi u hap");
    await expect(page.locator("section").filter({ hasText: "A të mbjellim lule në oborr?" }).last()).toContainText(
      "Votim aktiv",
    );
  });

  test("regjistri i aktivitetit ruan veprimet me para", async ({ page }) => {
    await page.goto("/admin/aktiviteti");
    await expect(page.getByText(/Aprovoi pagesën 25,00 € nga Banesa 18 \(dëftesa #0058\)/)).toBeVisible();
    await expect(page.getByText(/Regjistroi pagesë kesh 25,00 € për Banesa 3/)).toBeVisible();
    await expect(page.getByText(/Refuzoi dëshminë e pagesës/)).toBeVisible();
  });

  test("fleta për hyrje nuk përmban emra", async ({ page }) => {
    await page.goto("/admin/printo");
    await expect(page.getByRole("heading", { name: /Pagesat · / })).toBeVisible();
    await expect(page.getByText(/Kanë paguar \d+ nga 32 njësi/)).toBeVisible();
    await expect(page.getByText("Agron Shala")).toHaveCount(0);
    await expect(page.getByText("Drita Morina")).toHaveCount(0);
  });

  test("dalja nga llogaria", async ({ page }) => {
    await page.getByRole("button", { name: /^Dil/ }).last().click();
    await expect(page).toHaveURL(/\/hyr$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/hyr$/);
  });
});
