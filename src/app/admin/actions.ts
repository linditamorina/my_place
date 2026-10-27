"use server";

import { refresh } from "next/cache";
import type { FormState } from "@/components/client";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { EXPENSE_CATEGORY, TICKET_STATUS, isKey, unitLabel } from "@/lib/constants";
import { db } from "@/lib/db";
import { saveUpload } from "@/lib/files";
import { getBillingPeriods, getDebts, invoiceState } from "@/lib/finance";
import {
  dueDateFor,
  euro,
  monthlyInvoiceTitle,
  parseEuro,
  periodLabel,
  periodOf,
  receiptNumber,
} from "@/lib/format";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Merr numrin e radhës së dëftesës brenda transaksionit, që dy pagesa të mos marrin të njëjtin numër. */
async function takeReceiptNo(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  buildingId: string,
): Promise<number> {
  const building = await tx.building.update({
    where: { id: buildingId },
    data: { nextReceiptNo: { increment: 1 } },
    select: { nextReceiptNo: true },
  });
  return building.nextReceiptNo - 1;
}

// ── Faturat ──────────────────────────────────────────────────────────────

export async function generateInvoices(): Promise<void> {
  const admin = await requireAdmin();
  const { nextPeriod } = await getBillingPeriods(admin.buildingId, periodOf(new Date()));
  const [units, existing] = await Promise.all([
    db.unit.findMany({ where: { buildingId: admin.buildingId } }),
    db.invoice.findMany({
      where: { buildingId: admin.buildingId, period: nextPeriod, kind: "MUJORE" },
      select: { unitId: true },
    }),
  ]);
  const billed = new Set(existing.map((i) => i.unitId));
  const toBill = units.filter((u) => !billed.has(u.id));

  await db.$transaction(
    toBill.map((unit) =>
      db.invoice.create({
        data: {
          buildingId: admin.buildingId,
          unitId: unit.id,
          kind: "MUJORE",
          period: nextPeriod,
          title: monthlyInvoiceTitle(nextPeriod),
          dueDate: dueDateFor(nextPeriod),
          totalCents: unit.monthlyFeeCents,
          lines: { create: [{ description: "Mirëmbajtja mujore", amountCents: unit.monthlyFeeCents }] },
        },
      }),
    ),
  );
  await audit(admin.buildingId, admin.id, `Gjeneroi ${toBill.length} fatura për ${periodLabel(nextPeriod)}.`);
  refresh();
}

export async function createExtraInvoice(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const description = text(formData, "description");
  const amountCents = parseEuro(text(formData, "amount"));
  const fundId = text(formData, "fundId") || null;
  const scope = text(formData, "scope");
  if (description.length < 3) return { error: "Shkruaj për çfarë është fatura." };
  if (!amountCents) return { error: "Shuma nuk është e vlefshme. Shembull: 50 ose 12,50." };
  if (fundId) {
    const fund = await db.fund.findFirst({ where: { id: fundId, buildingId: admin.buildingId } });
    if (!fund) return { error: "Fondi i zgjedhur nuk ekziston." };
  }

  const units = await db.unit.findMany({
    where: { buildingId: admin.buildingId, ...(scope === "BANESAT" ? { kind: "BANESE" } : {}) },
  });
  const period = periodOf(new Date());
  const due = new Date();
  due.setDate(due.getDate() + 30);
  due.setHours(23, 59, 0, 0);

  await db.$transaction(
    units.map((unit) =>
      db.invoice.create({
        data: {
          buildingId: admin.buildingId,
          unitId: unit.id,
          kind: "JASHTEZAKONSHME",
          period,
          title: description,
          dueDate: due,
          totalCents: amountCents,
          lines: { create: [{ description, amountCents, fundId }] },
        },
      }),
    ),
  );
  await audit(
    admin.buildingId,
    admin.id,
    `Krijoi faturën e jashtëzakonshme «${description}» prej ${euro(amountCents)} për ${units.length} njësi.`,
  );
  refresh();
  return { success: `U krijuan ${units.length} fatura prej ${euro(amountCents)}.` };
}

// ── Pagesat ──────────────────────────────────────────────────────────────

export async function approvePayment(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const payment = await db.payment.findFirst({
    where: { id: text(formData, "paymentId"), buildingId: admin.buildingId, status: "NE_PRITJE" },
    include: { unit: true },
  });
  if (!payment) return;
  const receiptNo = await db.$transaction(async (tx) => {
    const no = await takeReceiptNo(tx, admin.buildingId);
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "APROVUAR", receiptNo: no, approvedAt: new Date(), approvedById: admin.id },
    });
    return no;
  });
  await audit(
    admin.buildingId,
    admin.id,
    `Aprovoi pagesën ${euro(payment.amountCents)} nga ${unitLabel(payment.unit)} (dëftesa ${receiptNumber(receiptNo)}).`,
  );
  refresh();
}

export async function rejectPayment(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const payment = await db.payment.findFirst({
    where: { id: text(formData, "paymentId"), buildingId: admin.buildingId, status: "NE_PRITJE" },
    include: { unit: true, invoice: true },
  });
  if (!payment) return;
  await db.payment.update({ where: { id: payment.id }, data: { status: "REFUZUAR" } });
  // Banori e sheh arsyen te njoftimet e veta.
  await db.notice.create({
    data: {
      buildingId: admin.buildingId,
      unitId: payment.unitId,
      title: "Dëshmia e pagesës nuk u pranua",
      body: `Dëshmia për «${payment.invoice.title}» (${euro(payment.amountCents)}) nuk u pranua. Kontrollo shumën dhe përshkrimin e pagesës, pastaj ngarkoje sërish.`,
      important: true,
    },
  });
  await audit(
    admin.buildingId,
    admin.id,
    `Refuzoi dëshminë e pagesës ${euro(payment.amountCents)} nga ${unitLabel(payment.unit)}.`,
  );
  refresh();
}

/** Pagesë me kesh: mbyll faturën më të vjetër të papaguar të njësisë dhe lëshon dëftesë. */
export async function registerCash(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const unit = await db.unit.findFirst({
    where: { id: text(formData, "unitId"), buildingId: admin.buildingId },
    include: { invoices: { include: { payments: true }, orderBy: { dueDate: "asc" } } },
  });
  if (!unit) return;
  const open = unit.invoices
    .map((invoice) => ({ invoice, state: invoiceState(invoice) }))
    .find(({ state }) => state.status === "PAPAGUAR");
  if (!open) return;

  const receiptNo = await db.$transaction(async (tx) => {
    const no = await takeReceiptNo(tx, admin.buildingId);
    await tx.payment.create({
      data: {
        buildingId: admin.buildingId,
        unitId: unit.id,
        invoiceId: open.invoice.id,
        amountCents: open.state.remainingCents,
        method: "KESH",
        status: "APROVUAR",
        receiptNo: no,
        approvedAt: new Date(),
        approvedById: admin.id,
      },
    });
    return no;
  });
  await audit(
    admin.buildingId,
    admin.id,
    `Regjistroi pagesë kesh ${euro(open.state.remainingCents)} për ${unitLabel(unit)} (dëftesa ${receiptNumber(receiptNo)}).`,
  );
  refresh();
}

export async function sendReminders(): Promise<void> {
  const admin = await requireAdmin();
  const debts = [...(await getDebts(admin.buildingId)).values()].filter((d) => d.debtCents > 0);
  await db.notice.createMany({
    data: debts.map((d) => ({
      buildingId: admin.buildingId,
      unitId: d.unit.id,
      title: "Kujtesë për pagesë",
      body: `Ke ${euro(d.debtCents)} të papaguara. Të dhënat për pagesë i gjen te «Faturat».`,
      important: true,
    })),
  });
  await audit(admin.buildingId, admin.id, `Dërgoi kujtesë për pagesë te ${debts.length} njësi.`);
  refresh();
}

// ── Banesat ──────────────────────────────────────────────────────────────

export async function updateFee(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const feeCents = parseEuro(text(formData, "fee"));
  const unit = await db.unit.findFirst({ where: { id: text(formData, "unitId"), buildingId: admin.buildingId } });
  if (!unit || !feeCents || feeCents === unit.monthlyFeeCents) return;
  await db.unit.update({ where: { id: unit.id }, data: { monthlyFeeCents: feeCents } });
  await audit(
    admin.buildingId,
    admin.id,
    `Ndryshoi tarifën mujore të ${unitLabel(unit)} nga ${euro(unit.monthlyFeeCents)} në ${euro(feeCents)}.`,
  );
  refresh();
}

// ── Arka ─────────────────────────────────────────────────────────────────

export async function addExpense(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const category = text(formData, "category");
  const description = text(formData, "description");
  const amountCents = parseEuro(text(formData, "amount"));
  const dateValue = text(formData, "date");
  const fundId = text(formData, "fundId") || null;
  if (!isKey(EXPENSE_CATEGORY, category)) return { error: "Zgjidh kategorinë." };
  if (description.length < 3) return { error: "Shkruaj përshkrimin e shpenzimit." };
  if (!amountCents) return { error: "Shuma nuk është e vlefshme. Shembull: 35 ose 22,40." };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? new Date(`${dateValue}T12:00:00`) : null;
  if (!date || Number.isNaN(date.getTime()) || date > new Date()) return { error: "Data nuk është e vlefshme." };
  if (fundId && !(await db.fund.findFirst({ where: { id: fundId, buildingId: admin.buildingId } }))) {
    return { error: "Fondi i zgjedhur nuk ekziston." };
  }
  const upload = await saveUpload(formData.get("receipt"));
  if (!upload.ok) return { error: upload.error };

  await db.expense.create({
    data: {
      buildingId: admin.buildingId,
      category,
      description,
      amountCents,
      date,
      fundId,
      receiptFile: upload.name,
    },
  });
  await audit(admin.buildingId, admin.id, `Shtoi shpenzimin «${description}» ${euro(amountCents)}.`);
  refresh();
  return { success: `U shtua shpenzimi ${euro(amountCents)}.` };
}

// ── Prishjet ─────────────────────────────────────────────────────────────

export async function updateTicket(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const status = text(formData, "status");
  const adminNote = text(formData, "adminNote") || null;
  const ticket = await db.ticket.findFirst({ where: { id: text(formData, "ticketId"), buildingId: admin.buildingId } });
  if (!ticket || !isKey(TICKET_STATUS, status)) return;
  await db.ticket.update({ where: { id: ticket.id }, data: { status, adminNote } });
  if (status !== ticket.status) {
    await audit(
      admin.buildingId,
      admin.id,
      `Ndryshoi statusin e prishjes «${ticket.description.slice(0, 40)}» në «${TICKET_STATUS[status]}».`,
    );
  }
  refresh();
}

// ── Njoftimet dhe votimet ────────────────────────────────────────────────

export async function createNotice(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const title = text(formData, "title");
  const body = text(formData, "body");
  const important = formData.get("important") === "on";
  if (title.length < 3) return { error: "Shkruaj titullin e njoftimit." };
  if (body.length < 5) return { error: "Shkruaj tekstin e njoftimit." };
  await db.notice.create({ data: { buildingId: admin.buildingId, title, body, important } });
  await audit(admin.buildingId, admin.id, `Publikoi njoftimin «${title}».`);
  refresh();
  return { success: "Njoftimi u publikua për të gjithë banorët." };
}

export async function createPoll(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const question = text(formData, "question");
  const description = text(formData, "description");
  const closesValue = text(formData, "closesAt");
  const ownersOnly = formData.get("ownersOnly") === "on";
  const options = [1, 2, 3, 4].map((n) => text(formData, `option${n}`)).filter(Boolean);
  if (question.length < 5) return { error: "Shkruaj pyetjen e votimit." };
  if (options.length < 2) return { error: "Votimi ka nevojë për të paktën dy përgjigje." };
  const closesAt = /^\d{4}-\d{2}-\d{2}$/.test(closesValue) ? new Date(`${closesValue}T20:00:00`) : null;
  if (!closesAt || closesAt <= new Date()) return { error: "Afati i votimit duhet të jetë në të ardhmen." };

  await db.poll.create({
    data: {
      buildingId: admin.buildingId,
      question,
      description,
      closesAt,
      ownersOnly,
      options: { create: options.map((label, position) => ({ label, position })) },
    },
  });
  await audit(admin.buildingId, admin.id, `Krijoi votimin «${question}».`);
  refresh();
  return { success: "Votimi u hap. Banorët e shohin menjëherë." };
}
