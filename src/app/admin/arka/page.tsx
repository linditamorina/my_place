import type { Metadata } from "next";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { ActionForm, FileField, PrintButton } from "@/components/client";
import { ExpenseIcon } from "@/components/icons";
import { btn, Card, CardHeader, Empty, field, IconTile, PageTitle, Progress, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { EXPENSE_CATEGORY } from "@/lib/constants";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import { getBalance, getFunds, getMonthFlow } from "@/lib/finance";
import { euro, formatDay, pad, periodMonth, periodOf } from "@/lib/format";
import { addExpense } from "../actions";
import Link from "next/link";

export const metadata: Metadata = { title: "Arka" };

export default function CashboxPage() {
  return (
    <div className="flex flex-col gap-7">
      <PageTitle
        title="Arka e hyrjes"
        subtitle="Të hyrat, shpenzimet dhe fondet, të dukshme për të gjithë banorët"
        actions={
          <Link href="/admin/printo" className={btn.white}>
            Lista për hyrje
          </Link>
        }
      />
      <Suspense fallback={<Skeleton rows={3} />}>
        <Cashbox />
      </Suspense>
    </div>
  );
}

async function Cashbox() {
  const admin = await requireAdmin();
  const now = new Date();
  const period = periodOf(now);
  const [balance, flow, funds, expenses] = await Promise.all([
    getBalance(admin.buildingId),
    getMonthFlow(admin.buildingId, period),
    getFunds(admin.buildingId),
    db.expense.findMany({
      where: { buildingId: admin.buildingId },
      include: { fund: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className="flex flex-col gap-1 rounded-[20px] bg-deep px-5 py-4 text-white">
          <span className="text-[13px] font-semibold text-white/75">Gjendja aktuale</span>
          <span className="text-2xl font-extrabold">{euro(balance)}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[20px] bg-white px-5 py-4">
          <span className="text-[13px] font-semibold text-muted">Të hyrat në {periodMonth(period)}</span>
          <span className="text-2xl font-extrabold">+{euro(flow.incomeCents)}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[20px] bg-white px-5 py-4">
          <span className="text-[13px] font-semibold text-muted">Shpenzimet në {periodMonth(period)}</span>
          <span className="text-2xl font-extrabold">{euro(-flow.expenseCents)}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[20px] bg-white px-5 py-4">
          <span className="text-[13px] font-semibold text-muted">Gjendja fillestare</span>
          <span className="text-2xl font-extrabold">{euro(admin.building.openingBalanceCents)}</span>
        </div>
      </div>

      {funds.map((fund) => (
        <Card key={fund.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-extrabold">Fondi: {fund.name}</h2>
            <span className="text-sm font-semibold text-muted">
              {euro(fund.collectedCents)} nga {euro(fund.targetCents)} · shpenzuar {euro(fund.spentCents)}
            </span>
          </div>
          <Progress
            value={(fund.collectedCents / fund.targetCents) * 100}
            tone="deep"
            className="h-2.5"
            label={`Fondi ${fund.name}`}
          />
        </Card>
      ))}

      <div className="flex flex-wrap items-start gap-5">
        <Card className="min-w-0 flex-[2_1_520px] px-6 pb-2.5">
          <CardHeader title="Shpenzimet" action={<PrintButton className={btn.smallSoft} label="Printo" />} />
          {expenses.length === 0 ? (
            <div className="pb-4">
              <Empty>Nuk ka shpenzime ende.</Empty>
            </div>
          ) : (
            expenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3.5 border-t border-line py-3">
                <IconTile>
                  <ExpenseIcon category={expense.category} />
                </IconTile>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-bold">{expense.description}</span>
                  <span className="text-[13px] text-muted">
                    {formatDay(expense.date)} · {EXPENSE_CATEGORY[expense.category as keyof typeof EXPENSE_CATEGORY] ?? "Tjetër"}
                    {expense.fund ? ` · ${expense.fund.name}` : ""}
                  </span>
                </span>
                <span className="text-[15px] font-extrabold">{euro(expense.amountCents)}</span>
                {expense.receiptFile ? (
                  <a
                    href={fileUrl(expense.receiptFile)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Shiko faturën: ${expense.description}`}
                    className={`${btn.icon} print:hidden`}
                  >
                    <FileText className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="size-11" aria-hidden="true" />
                )}
              </div>
            ))
          )}
        </Card>

        <Card className="flex-[1_1_300px] print:hidden">
          <CardHeader title="Shto shpenzim" />
          <ActionForm action={addExpense} submitLabel="Shto shpenzimin" submitClassName={btn.primary}>
            <div className="flex flex-col gap-2">
              <label htmlFor="expense-category" className={field.label}>
                Kategoria
              </label>
              <select id="expense-category" name="category" className={field.input} defaultValue="PASTRIMI">
                {Object.entries(EXPENSE_CATEGORY).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="expense-description" className={field.label}>
                Përshkrimi
              </label>
              <input id="expense-description" name="description" placeholder="P.sh. Pastrimi i hyrjes" className={field.input} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="expense-amount" className={field.label}>
                  Shuma (€)
                </label>
                <input id="expense-amount" name="amount" inputMode="decimal" placeholder="35,00" className={field.input} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="expense-date" className={field.label}>
                  Data
                </label>
                <input id="expense-date" name="date" type="date" defaultValue={today} max={today} className={field.input} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="expense-fund" className={field.label}>
                Paguar nga
              </label>
              <select id="expense-fund" name="fundId" className={field.input} defaultValue="">
                <option value="">Arka e përgjithshme</option>
                {funds.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    Fondi: {fund.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="expense-receipt" className={field.label}>
                Fatura e furnitorit
              </label>
              <FileField
                id="expense-receipt"
                name="receipt"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                icon="file"
                title="Zgjidh foton ose PDF-në"
                hint="Deri në 5 MB. Banorët e shohin te arka."
              />
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
