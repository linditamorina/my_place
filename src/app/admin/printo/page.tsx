import type { Metadata } from "next";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { PrintButton } from "@/components/client";
import { LogoMark } from "@/components/logo";
import { btn, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { EXPENSE_CATEGORY, isKey } from "@/lib/constants";
import { db } from "@/lib/db";
import { getBalance, getMonthFlow, invoiceState } from "@/lib/finance";
import { euro, formatDate, formatDay, periodLabel, periodOf } from "@/lib/format";

export const metadata: Metadata = { title: "Lista për hyrje" };

// Fleta që ngjitet në hyrje për banorët pa telefon. Pa emra: vetëm numrat e njësive (privatësia).
export default function PrintPage() {
  return (
    <Suspense fallback={<Skeleton rows={3} />}>
      <PrintSheet />
    </Suspense>
  );
}

async function PrintSheet() {
  const admin = await requireAdmin();
  const now = new Date();
  const period = periodOf(now);
  const [units, invoices, balance, flow, expenses] = await Promise.all([
    db.unit.findMany({ where: { buildingId: admin.buildingId } }),
    db.invoice.findMany({ where: { buildingId: admin.buildingId, period, kind: "MUJORE" }, include: { payments: true } }),
    getBalance(admin.buildingId),
    getMonthFlow(admin.buildingId, period),
    db.expense.findMany({
      where: {
        buildingId: admin.buildingId,
        date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      orderBy: { date: "asc" },
    }),
  ]);
  units.sort((a, b) => b.kind.localeCompare(a.kind) || Number(a.number) - Number(b.number));
  const paid = new Set(invoices.filter((i) => invoiceState(i).status === "PAGUAR").map((i) => i.unitId));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex justify-end print:hidden">
        <PrintButton className={btn.primary} label="Printo fletën" />
      </div>
      <article className="flex flex-col gap-8 rounded-[20px] bg-white p-10 print:rounded-none print:p-0">
        <header className="flex items-center justify-between gap-6 border-b-2 border-deep pb-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold uppercase tracking-wide text-muted">
              {admin.building.name} · {admin.building.address}
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight capitalize">Pagesat · {periodLabel(period)}</h1>
          </div>
          <LogoMark size={52} />
        </header>

        <section className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-soft p-4 print:border print:border-deep print:bg-white">
            <span className="block text-[13px] font-semibold text-muted">Gjendja e arkës</span>
            <span className="text-xl font-extrabold">{euro(balance)}</span>
          </div>
          <div className="rounded-2xl bg-soft p-4 print:border print:border-deep print:bg-white">
            <span className="block text-[13px] font-semibold text-muted">Të hyrat këtë muaj</span>
            <span className="text-xl font-extrabold">+{euro(flow.incomeCents)}</span>
          </div>
          <div className="rounded-2xl bg-soft p-4 print:border print:border-deep print:bg-white">
            <span className="block text-[13px] font-semibold text-muted">Shpenzimet këtë muaj</span>
            <span className="text-xl font-extrabold">{euro(-flow.expenseCents)}</span>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-extrabold">
            Kanë paguar {paid.size} nga {units.length} njësi
          </h2>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {units.map((unit) => {
              const isPaid = paid.has(unit.id);
              return (
                <li
                  key={unit.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold ${
                    isPaid ? "bg-deep text-white" : "border-[1.5px] border-deep"
                  }`}
                >
                  <span>{unit.kind === "LOKAL" ? `L${unit.number}` : unit.number}</span>
                  {isPaid ? <Check className="size-4" strokeWidth={3} aria-label="E paguar" /> : <span aria-label="Pa paguar">—</span>}
                </li>
              );
            })}
          </ul>
          <p className="text-[13px] text-muted">
            Katrorët e mbushur = e paguar. «L» = lokal. Lista nuk përmban emra për të ruajtur privatësinë.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-extrabold">Ku shkuan paratë këtë muaj</h2>
          <table className="w-full text-left text-[15px]">
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-line">
                  <td className="py-2 text-muted">{formatDay(expense.date)}</td>
                  <td className="py-2">
                    {expense.description}
                    <span className="text-muted">
                      {" "}
                      · {isKey(EXPENSE_CATEGORY, expense.category) ? EXPENSE_CATEGORY[expense.category] : "Tjetër"}
                    </span>
                  </td>
                  <td className="py-2 text-right font-bold">{euro(expense.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-[13px] text-muted">
          <span>
            Paguaj në IBAN {admin.building.iban} · {admin.building.beneficiary}
          </span>
          <span>Përditësuar më {formatDate(now)}</span>
        </footer>
      </article>
      <p className="text-center text-[13px] text-muted print:hidden">Printoje në A4 dhe ngjite në hyrje.</p>
    </div>
  );
}
