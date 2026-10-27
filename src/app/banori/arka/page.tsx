import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowDownRight, ArrowUpRight, Eye, FileText } from "lucide-react";
import { ExpenseIcon } from "@/components/icons";
import { IconTile, Progress, Skeleton } from "@/components/ui";
import { requireResident } from "@/lib/auth";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import { getBalance, getFunds, getMonthFlow, getPeriodCollection } from "@/lib/finance";
import { euro, formatDay, periodGenitive, periodLabel, periodOf } from "@/lib/format";

export const metadata: Metadata = { title: "Arka e hyrjes" };

export default function ResidentCashboxPage() {
  return (
    <div className="flex flex-col gap-4 px-5 pt-7">
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-extrabold tracking-tight">Arka e hyrjes</h1>
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
          <Eye className="size-4" strokeWidth={1.8} aria-hidden="true" />E dukshme për të gjithë banorët
        </span>
      </div>
      <Suspense fallback={<Skeleton rows={3} />}>
        <Cashbox />
      </Suspense>
    </div>
  );
}

async function Cashbox() {
  const resident = await requireResident();
  const period = periodOf(new Date());
  const [balance, flow, collection, funds, expenses] = await Promise.all([
    getBalance(resident.buildingId),
    getMonthFlow(resident.buildingId, period),
    getPeriodCollection(resident.buildingId, period),
    getFunds(resident.buildingId),
    db.expense.findMany({
      where: { buildingId: resident.buildingId },
      orderBy: { date: "desc" },
      take: 8,
    }),
  ]);

  return (
    <>
      <section className="flex flex-col gap-1 rounded-3xl bg-deep p-[22px] text-white">
        <span className="text-sm font-semibold text-white/75">Gjendja aktuale</span>
        <span className="text-[40px] font-extrabold tracking-tight">{euro(balance)}</span>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1 rounded-2xl bg-white/10 p-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-white/75">
              <ArrowUpRight className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
              Të hyrat · <span className="capitalize">{periodLabel(period).split(" ")[0]}</span>
            </span>
            <span className="text-[17px] font-extrabold">+{euro(flow.incomeCents)}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-white/10 p-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-white/75">
              <ArrowDownRight className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
              Shpenzimet
            </span>
            <span className="text-[17px] font-extrabold">{euro(-flow.expenseCents)}</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] bg-white p-[18px]">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-2.5 text-sm">
            <span className="font-bold">Pagesat e {periodGenitive(period)}</span>
            <span className="font-semibold text-muted">
              {collection.unitsPaid} nga {collection.units} njësi
            </span>
          </div>
          <Progress
            value={collection.units ? (collection.unitsPaid / collection.units) * 100 : 0}
            label="Njësitë që kanë paguar këtë muaj"
          />
        </div>
        {funds.map((fund) => (
          <div key={fund.id} className="flex flex-col gap-2">
            <div className="flex justify-between gap-2.5 text-sm">
              <span className="font-bold">Fondi: {fund.name}</span>
              <span className="font-semibold text-muted">
                {euro(fund.collectedCents)} nga {euro(fund.targetCents)}
              </span>
            </div>
            <Progress value={(fund.collectedCents / fund.targetCents) * 100} tone="deep" label={`Fondi ${fund.name}`} />
          </div>
        ))}
      </section>

      <section className="flex flex-col rounded-[20px] bg-white px-[18px] pt-[18px] pb-1.5">
        <h2 className="pb-2 text-base font-extrabold">Ku shkuan paratë</h2>
        {expenses.map((expense) => (
          <div key={expense.id} className="flex items-center gap-3 border-t border-line py-2.5">
            <IconTile>
              <ExpenseIcon category={expense.category} />
            </IconTile>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-bold">{expense.description}</span>
              <span className="text-xs text-muted">{formatDay(expense.date)}</span>
            </span>
            <span className="text-[15px] font-extrabold">{euro(expense.amountCents)}</span>
            {expense.receiptFile ? (
              <a
                href={fileUrl(expense.receiptFile)}
                target="_blank"
                rel="noreferrer"
                aria-label={`Shiko faturën: ${expense.description}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              >
                <FileText className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
              </a>
            ) : (
              <span className="size-11 shrink-0" aria-hidden="true" />
            )}
          </div>
        ))}
      </section>
    </>
  );
}
