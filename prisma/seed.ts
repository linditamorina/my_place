// Të dhëna demo për një hyrje me 32 njësi. Datat llogariten nga dita e sotme,
// që demo të duket gjithmonë aktuale. Ekzekutimi i fshin të dhënat ekzistuese.
//
// Llogaritë demo (fjalëkalimi: DEMO_PASSWORD më poshtë):
//   admin@myplace.test  — administratori i hyrjes
//   drita@myplace.test  — banore, Banesa 12

import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { euro, formatDay, monthlyInvoiceTitle, dueDateFor, periodLabel, periodOf, shiftPeriod } from "../src/lib/format";
import { hashPassword } from "../src/lib/password";

const DEMO_PASSWORD = "myplace-demo";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "storage", "uploads");

const now = new Date();
const currentPeriod = periodOf(now);
const previousPeriod = shiftPeriod(currentPeriod, -1);

/** Data në muajin aktual (offset 0) ose të kaluar (−1), asnjëherë në të ardhmen. */
function at(monthOffset: number, day: number, hour = 10, minute = 0): Date {
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, day, hour, minute);
  return date > now ? new Date(now.getTime() - (day + 1) * 60_000) : date;
}

function ago(days: number, hour?: number, minute = 0): Date {
  const date = new Date(now.getTime() - days * 86_400_000);
  if (hour !== undefined) date.setHours(hour, minute, 0, 0);
  return date > now ? new Date(now.getTime() - 3_600_000) : date;
}

const BANESA_OWNERS = [
  "Agron Shala", "Besa Kelmendi", "Driton Bytyqi", "Elira Rexhepi", "Gëzim Hoti",
  "Hana Zeqiri", "Blerim Hoxha", "Jeta Kastrati", "Kujtim Rama", "Labinot Gashi",
  "Mimoza Hasani", "Drita Morina", "Nora Krasniqi", "Petrit Sadiku", "Qëndresa Ahmeti",
  "Rinor Haliti", "Shpresa Dema", "Arta Berisha", "Teuta Mustafa", "Valon Hyseni",
  "Blerta Osmani", "Ardit Lila", "Fjolla Ibrahimi", "Genc Selimi", "Lindrit Avdiu",
  "Mrika Bajrami", "Nderim Kryeziu", "Orjeta Leka", "Përparim Gjoka", "Rina Statovci",
];
const AREAS = [52, 64, 78, 86, 95];

async function writeSvg(svg: string): Promise<string> {
  const name = `${randomBytes(16).toString("hex")}.svg`;
  await writeFile(path.join(UPLOAD_DIR, name), svg, "utf8");
  return name;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function proofSvg(amount: string, payer: string, reference: string, iban: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="640" viewBox="0 0 390 640">
<rect width="390" height="640" fill="#f4f6f8"/>
<rect x="0" y="0" width="390" height="120" fill="#22313f"/>
<text x="24" y="70" font-family="Arial" font-size="22" fill="#ffffff" font-weight="bold">m-Banking</text>
<circle cx="195" cy="190" r="34" fill="#2e9e6b"/>
<path d="M180 190l10 10 20-22" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<text x="195" y="262" font-family="Arial" font-size="20" fill="#22313f" text-anchor="middle" font-weight="bold">Transferi u krye</text>
<text x="195" y="310" font-family="Arial" font-size="34" fill="#22313f" text-anchor="middle" font-weight="bold">${escapeXml(amount)}</text>
<rect x="24" y="350" width="342" height="230" rx="14" fill="#ffffff"/>
<text x="44" y="388" font-family="Arial" font-size="13" fill="#6b7785">Paguesi</text>
<text x="44" y="410" font-family="Arial" font-size="16" fill="#22313f">${escapeXml(payer)}</text>
<text x="44" y="448" font-family="Arial" font-size="13" fill="#6b7785">IBAN i përfituesit</text>
<text x="44" y="470" font-family="Arial" font-size="16" fill="#22313f">${escapeXml(iban)}</text>
<text x="44" y="508" font-family="Arial" font-size="13" fill="#6b7785">Përshkrimi</text>
<text x="44" y="530" font-family="Arial" font-size="16" fill="#22313f">${escapeXml(reference)}</text>
</svg>`;
}

function receiptSvg(vendor: string, item: string, amount: string, date: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560">
<rect width="420" height="560" fill="#ffffff"/>
<text x="210" y="70" font-family="Courier New" font-size="22" fill="#222" text-anchor="middle" font-weight="bold">${escapeXml(vendor)}</text>
<text x="210" y="100" font-family="Courier New" font-size="14" fill="#555" text-anchor="middle">Prishtinë · NUI 81123456</text>
<line x1="30" y1="130" x2="390" y2="130" stroke="#999" stroke-dasharray="6 6"/>
<text x="30" y="170" font-family="Courier New" font-size="16" fill="#222">FATURË</text>
<text x="390" y="170" font-family="Courier New" font-size="16" fill="#222" text-anchor="end">${escapeXml(date)}</text>
<text x="30" y="220" font-family="Courier New" font-size="16" fill="#222">${escapeXml(item)}</text>
<line x1="30" y1="400" x2="390" y2="400" stroke="#999" stroke-dasharray="6 6"/>
<text x="30" y="440" font-family="Courier New" font-size="20" fill="#222" font-weight="bold">TOTALI</text>
<text x="390" y="440" font-family="Courier New" font-size="20" fill="#222" text-anchor="end" font-weight="bold">${escapeXml(amount)}</text>
<text x="210" y="510" font-family="Courier New" font-size="13" fill="#555" text-anchor="middle">Faleminderit!</text>
</svg>`;
}

async function clearData() {
  await db.auditLog.deleteMany();
  await db.vote.deleteMany();
  await db.pollOption.deleteMany();
  await db.poll.deleteMany();
  await db.noticeRead.deleteMany();
  await db.notice.deleteMany();
  await db.ticket.deleteMany();
  await db.expense.deleteMany();
  await db.payment.deleteMany();
  await db.invoiceLine.deleteMany();
  await db.invoice.deleteMany();
  await db.fund.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
  await db.unit.deleteMany();
  await db.building.deleteMany();
  await rm(UPLOAD_DIR, { recursive: true, force: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
}

async function main() {
  await clearData();

  const building = await db.building.create({
    data: {
      name: "Hyrja A",
      address: "Rr. e Lules 14",
      city: "Prishtinë",
      beneficiary: "Bashkësia e Pronarëve · Hyrja A",
      iban: "XK05 1212 0123 4567 8906",
      codePrefix: "HA",
      openingBalanceCents: 21_000,
    },
  });

  const units: Awaited<ReturnType<typeof db.unit.create>>[] = [];
  for (let n = 1; n <= 30; n++) {
    units.push(
      await db.unit.create({
        data: {
          buildingId: building.id,
          kind: "BANESE",
          number: String(n),
          floor: Math.ceil(n / 5),
          areaM2: AREAS[n % AREAS.length],
          monthlyFeeCents: 1_500,
          ownerName: BANESA_OWNERS[n - 1],
        },
      }),
    );
  }
  for (const [n, owner, area] of [[1, "Market Fiona", 85], [2, "Fatmir Krasniqi", 60]] as const) {
    units.push(
      await db.unit.create({
        data: {
          buildingId: building.id,
          kind: "LOKAL",
          number: String(n),
          floor: 0,
          areaM2: area,
          monthlyFeeCents: 2_500,
          ownerName: owner,
        },
      }),
    );
  }
  const unit = (kind: "BANESE" | "LOKAL", number: number) =>
    units.find((u) => u.kind === kind && u.number === String(number))!;

  const passwordHash = hashPassword(DEMO_PASSWORD);
  const admin = await db.user.create({
    data: {
      name: "Arben Gashi",
      email: "admin@myplace.test",
      phone: "+383 44 100 200",
      passwordHash,
      role: "ADMIN",
      buildingId: building.id,
    },
  });
  const residentData = [
    { name: "Drita Morina", email: "drita@myplace.test", phone: "+383 44 123 456", unit: unit("BANESE", 12) },
    { name: "Blerim Hoxha", email: "blerim@myplace.test", phone: "+383 45 222 333", unit: unit("BANESE", 7) },
    { name: "Arta Berisha", email: "arta@myplace.test", phone: "+383 49 444 555", unit: unit("BANESE", 18) },
    { name: "Fatmir Krasniqi", email: "fatmir@myplace.test", phone: "+383 44 666 777", unit: unit("LOKAL", 2) },
  ];
  const residents: Awaited<ReturnType<typeof db.user.create>>[] = [];
  for (const r of residentData) {
    residents.push(
      await db.user.create({
        data: {
          name: r.name,
          email: r.email,
          phone: r.phone,
          passwordHash,
          role: "RESIDENT",
          buildingId: building.id,
          unitId: r.unit.id,
        },
      }),
    );
  }
  const [drita, blerim, arta] = residents;

  const roofFund = await db.fund.create({
    data: { buildingId: building.id, name: "Riparimi i kulmit", targetCents: 160_000 },
  });

  // Faturat: muaji i kaluar i paguar plotësisht, muaji aktual pjesërisht.
  const unpaidNow = new Set([unit("BANESE", 12).id, unit("BANESE", 3).id, unit("BANESE", 21).id, unit("BANESE", 27).id]);
  const pendingNow = new Map([
    [unit("BANESE", 7).id, "Blerim Hoxha"],
    [unit("BANESE", 18).id, "Arta Berisha"],
    [unit("LOKAL", 2).id, "Fatmir Krasniqi"],
  ]);
  let receiptNo = 1;

  for (const [offset, period, part] of [[-1, previousPeriod, 1], [0, currentPeriod, 2]] as const) {
    for (const [index, u] of units.entries()) {
      const lines = [
        { description: "Mirëmbajtja mujore", amountCents: u.monthlyFeeCents },
        { description: `Riparimi i kulmit · pjesa ${part} nga 5`, amountCents: 1_000, fundId: roofFund.id },
      ];
      const totalCents = lines.reduce((sum, l) => sum + l.amountCents, 0);
      const invoice = await db.invoice.create({
        data: {
          buildingId: building.id,
          unitId: u.id,
          kind: "MUJORE",
          period,
          title: monthlyInvoiceTitle(period),
          dueDate: dueDateFor(period),
          totalCents,
          createdAt: at(offset, 1, 8),
          lines: { create: lines },
        },
      });

      if (offset === 0 && unpaidNow.has(u.id)) continue;

      const reference = `HA-${u.kind === "LOKAL" ? "L" : "B"}${u.number}-${period.slice(2, 4)}${period.slice(5)}`;
      if (offset === 0 && pendingNow.has(u.id)) {
        const proofFile = await writeSvg(proofSvg(euro(totalCents), pendingNow.get(u.id)!, reference, building.iban));
        await db.payment.create({
          data: {
            buildingId: building.id,
            unitId: u.id,
            invoiceId: invoice.id,
            amountCents: totalCents,
            method: "BANKE",
            status: "NE_PRITJE",
            proofFile,
            createdAt: ago(index % 2, 9 + (index % 9), 14),
          },
        });
        continue;
      }

      const paidAt = at(offset, 2 + (index % 20), 9 + (index % 9), (index * 7) % 60);
      await db.payment.create({
        data: {
          buildingId: building.id,
          unitId: u.id,
          invoiceId: invoice.id,
          amountCents: totalCents,
          method: index % 3 === 0 ? "KESH" : "BANKE",
          status: "APROVUAR",
          receiptNo: receiptNo++,
          createdAt: paidAt,
          approvedAt: paidAt,
          approvedById: admin.id,
        },
      });
    }
  }
  await db.building.update({ where: { id: building.id }, data: { nextReceiptNo: receiptNo } });

  // Shpenzimet, me faturat e furnitorëve për muajin aktual.
  const expenses = [
    { offset: -1, day: 3, category: "PASTRIMI", description: "Pastrimi i hyrjes", cents: 5_000, vendor: "Pastërtia SH.P.K." },
    { offset: -1, day: 12, category: "RRYMA", description: "Rryma e përbashkët", cents: 2_240, vendor: "KESCO" },
    { offset: -1, day: 18, category: "ASHENSORI", description: "Servisi i ashensorit", cents: 3_500, vendor: "Lifti Servis" },
    { offset: -1, day: 20, category: "RIPARIME", description: "Amortizuesi i derës së hyrjes", cents: 1_800, vendor: "Bravari Dardania" },
    { offset: 0, day: 3, category: "PASTRIMI", description: "Pastrimi i hyrjes", cents: 5_000, vendor: "Pastërtia SH.P.K." },
    { offset: 0, day: 12, category: "RRYMA", description: "Rryma e përbashkët", cents: 2_400, vendor: "KESCO" },
    { offset: 0, day: 18, category: "ASHENSORI", description: "Servisi i ashensorit", cents: 3_500, vendor: "Lifti Servis" },
  ] as const;
  for (const e of expenses) {
    const date = at(e.offset, e.day, 12);
    const receiptFile = await writeSvg(receiptSvg(e.vendor, e.description, euro(e.cents), formatDay(date)));
    await db.expense.create({
      data: {
        buildingId: building.id,
        category: e.category,
        description: e.description,
        amountCents: e.cents,
        date,
        receiptFile,
        createdAt: date,
      },
    });
  }

  await db.ticket.createMany({
    data: [
      {
        buildingId: building.id,
        unitId: drita.unitId,
        reporterId: drita.id,
        category: "ASHENSORI",
        description: "Ashensori ndalet mes katit 3 dhe 4, dyert nuk hapen menjëherë.",
        status: "NE_PROCES",
        adminNote: "Ashensoristi vjen sot, 14:00–16:00.",
        createdAt: ago(2, 18, 40),
      },
      {
        buildingId: building.id,
        unitId: blerim.unitId,
        reporterId: blerim.id,
        category: "DRITA",
        description: "Llamba në shkallë te kati 5 nuk ndizet.",
        status: "E_RE",
        createdAt: ago(0, 8, 20),
      },
      {
        buildingId: building.id,
        unitId: arta.unitId,
        reporterId: arta.id,
        category: "DERA",
        description: "Dera e hyrjes nuk mbyllet vetë dhe mbetet hapur natën.",
        status: "KRYER",
        adminNote: "U ndërrua amortizuesi i derës.",
        createdAt: ago(12, 20, 5),
      },
    ],
  });

  const tuesday = new Date(now);
  tuesday.setDate(now.getDate() + (((2 - now.getDay() + 7) % 7) || 7));
  const waterNotice = await db.notice.create({
    data: {
      buildingId: building.id,
      title: "Pastrimi i rezervuarit të ujit",
      body: `Të martën, ${formatDay(tuesday)}, nga ora 08:00 deri në 12:00 nuk do të ketë ujë.`,
      important: true,
      createdAt: new Date(now.getTime() - 2 * 3_600_000),
    },
  });
  const meetingNotice = await db.notice.create({
    data: {
      buildingId: building.id,
      title: "Mbledhja e banorëve",
      body: "Të enjten në ora 19:00, në hollin e hyrjes. Do të flasim për kamerat në parking dhe riparimin e kulmit.",
      createdAt: ago(6, 17),
    },
  });
  await db.noticeRead.createMany({
    data: [
      { noticeId: meetingNotice.id, userId: blerim.id },
      { noticeId: meetingNotice.id, userId: arta.id },
      { noticeId: meetingNotice.id, userId: drita.id },
      { noticeId: waterNotice.id, userId: arta.id },
    ],
  });

  // Votimi aktiv: 19 banesa kanë votuar (12 Po, 7 Jo). Banesa 12 nuk ka votuar ende.
  const cameraPoll = await db.poll.create({
    data: {
      buildingId: building.id,
      question: "A të vendosim kamera sigurie në parking?",
      description: "Kostoja e vlerësuar është 30 € për banesë, e paguar një herë. Kamerat do të mbulojnë hyrjen dhe parkingun.",
      closesAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 9, 20, 0),
      createdAt: ago(5, 11),
      options: { create: [{ label: "Po, pajtohem", position: 0 }, { label: "Jo, nuk pajtohem", position: 1 }] },
    },
    include: { options: true },
  });
  const voters = units.filter((u) => u.kind === "BANESE" && u.number !== "12").slice(0, 19);
  await db.vote.createMany({
    data: voters.map((u, i) => ({
      pollId: cameraPoll.id,
      optionId: cameraPoll.options[i < 12 ? 0 : 1].id,
      unitId: u.id,
      userId: residents.find((r) => r.unitId === u.id)?.id ?? null,
      createdAt: ago(4 - (i % 4), 9 + (i % 10)),
    })),
  });

  const cleaningPoll = await db.poll.create({
    data: {
      buildingId: building.id,
      question: "A të ndërrojmë kompaninë e pastrimit?",
      description: "Oferta e re është 45 € në muaj në vend të 50 €, por pa pastrimin e xhamave.",
      closesAt: ago(20, 20),
      createdAt: ago(34, 10),
      options: { create: [{ label: "Po", position: 0 }, { label: "Jo", position: 1 }] },
    },
    include: { options: true },
  });
  const cleaningVoters = units.filter((u) => u.kind === "BANESE").slice(0, 26);
  await db.vote.createMany({
    data: cleaningVoters.map((u, i) => ({
      pollId: cleaningPoll.id,
      optionId: cleaningPoll.options[i % 3 === 0 ? 0 : 1].id,
      unitId: u.id,
      userId: residents.find((r) => r.unitId === u.id)?.id ?? null,
      createdAt: ago(25 + (i % 5), 12),
    })),
  });

  await db.auditLog.createMany({
    data: [
      { buildingId: building.id, userId: admin.id, action: `Gjeneroi 32 fatura për ${periodLabel(previousPeriod)}.`, createdAt: at(-1, 1, 8) },
      { buildingId: building.id, userId: admin.id, action: `Gjeneroi 32 fatura për ${periodLabel(currentPeriod)}.`, createdAt: at(0, 1, 8) },
      { buildingId: building.id, userId: admin.id, action: "Shtoi shpenzimin «Servisi i ashensorit» 35,00 €.", createdAt: at(0, 18, 12) },
      { buildingId: building.id, userId: admin.id, action: "Ndryshoi statusin e prishjes «Ashensori» në «Në proces».", createdAt: ago(1, 9, 30) },
      { buildingId: building.id, userId: admin.id, action: "Krijoi votimin «A të vendosim kamera sigurie në parking?».", createdAt: ago(5, 11) },
    ],
  });

  console.log(`U krijua hyrja demo: ${units.length} njësi, ${receiptNo - 1} pagesa të aprovuara.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
