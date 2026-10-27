import "server-only";
import type { InvoiceStatus } from "./constants";
import { db } from "./db";

type PaymentLike = { status: string; amountCents: number };

/** Statusi i një fature llogaritet nga pagesat e aprovuara, nuk ruhet veçmas. */
export function invoiceState(invoice: { totalCents: number; payments: PaymentLike[] }) {
  const paidCents = invoice.payments
    .filter((p) => p.status === "APROVUAR")
    .reduce((sum, p) => sum + p.amountCents, 0);
  const remainingCents = Math.max(invoice.totalCents - paidCents, 0);
  const pending = invoice.payments.some((p) => p.status === "NE_PRITJE");
  const status: InvoiceStatus = remainingCents === 0 ? "PAGUAR" : pending ? "NE_PRITJE" : "PAPAGUAR";
  return { paidCents, remainingCents, status };
}

/** Arka = gjendja fillestare + pagesat e aprovuara − shpenzimet. */
export async function getBalance(buildingId: string): Promise<number> {
  const [building, income, spent] = await Promise.all([
    db.building.findUniqueOrThrow({ where: { id: buildingId }, select: { openingBalanceCents: true } }),
    db.payment.aggregate({ where: { buildingId, status: "APROVUAR" }, _sum: { amountCents: true } }),
    db.expense.aggregate({ where: { buildingId }, _sum: { amountCents: true } }),
  ]);
  return building.openingBalanceCents + (income._sum.amountCents ?? 0) - (spent._sum.amountCents ?? 0);
}

function monthRange(period: string) {
  const [year, month] = period.split("-").map(Number);
  return { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
}

/** Të hyrat dhe shpenzimet që hynë/dolën brenda muajit. */
export async function getMonthFlow(buildingId: string, period: string) {
  const range = monthRange(period);
  const [income, spent] = await Promise.all([
    db.payment.aggregate({
      where: { buildingId, status: "APROVUAR", approvedAt: range },
      _sum: { amountCents: true },
    }),
    db.expense.aggregate({ where: { buildingId, date: range }, _sum: { amountCents: true } }),
  ]);
  return { incomeCents: income._sum.amountCents ?? 0, expenseCents: spent._sum.amountCents ?? 0 };
}

/** Sa është mbledhur nga faturat mujore të një periudhe. */
export async function getPeriodCollection(buildingId: string, period: string) {
  const invoices = await db.invoice.findMany({
    where: { buildingId, period, kind: "MUJORE" },
    include: { payments: true },
  });
  let billedCents = 0;
  let collectedCents = 0;
  let unitsPaid = 0;
  for (const invoice of invoices) {
    const state = invoiceState(invoice);
    billedCents += invoice.totalCents;
    collectedCents += state.paidCents;
    if (state.status === "PAGUAR") unitsPaid += 1;
  }
  return { billedCents, collectedCents, unitsPaid, units: invoices.length };
}

export async function getFunds(buildingId: string) {
  const funds = await db.fund.findMany({
    where: { buildingId },
    include: { lines: { include: { invoice: { include: { payments: true } } } }, expenses: true },
  });
  return funds.map((fund) => ({
    id: fund.id,
    name: fund.name,
    targetCents: fund.targetCents,
    collectedCents: fund.lines.reduce(
      (sum, line) => sum + (invoiceState(line.invoice).status === "PAGUAR" ? line.amountCents : 0),
      0,
    ),
    spentCents: fund.expenses.reduce((sum, e) => sum + e.amountCents, 0),
  }));
}

/** Borxhet sipas njësisë: vetëm faturat e papaguara (jo ato me dëshmi në pritje). */
export async function getDebts(buildingId: string) {
  const invoices = await db.invoice.findMany({
    where: { buildingId },
    include: { payments: true, unit: true },
    orderBy: { dueDate: "asc" },
  });
  const byUnit = new Map<
    string,
    { unit: (typeof invoices)[number]["unit"]; debtCents: number; pendingCents: number; oldestInvoiceId: string | null }
  >();
  for (const invoice of invoices) {
    const state = invoiceState(invoice);
    if (state.status === "PAGUAR") continue;
    const entry = byUnit.get(invoice.unitId) ?? {
      unit: invoice.unit,
      debtCents: 0,
      pendingCents: 0,
      oldestInvoiceId: null,
    };
    if (state.status === "NE_PRITJE") {
      entry.pendingCents += state.remainingCents;
    } else {
      entry.debtCents += state.remainingCents;
      entry.oldestInvoiceId ??= invoice.id;
    }
    byUnit.set(invoice.unitId, entry);
  }
  return byUnit;
}

/** Periudha e fundit e faturuar dhe ajo që gjenerohet më pas. */
export async function getBillingPeriods(buildingId: string, currentPeriod: string) {
  const latest = await db.invoice.findFirst({
    where: { buildingId, kind: "MUJORE" },
    orderBy: { period: "desc" },
    select: { period: true },
  });
  const lastPeriod = latest?.period ?? null;
  const [year, month] = (lastPeriod ?? currentPeriod).split("-").map(Number);
  const next = lastPeriod ? new Date(year, month, 1) : new Date(year, month - 1, 1);
  return {
    lastPeriod,
    nextPeriod: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
  };
}
