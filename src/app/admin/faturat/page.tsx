import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/client";
import { btn, Card, CardHeader, Empty, field, InvoiceStatusChip, PageTitle, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { INVOICE_KIND, isKey, unitLabel } from "@/lib/constants";
import { db } from "@/lib/db";
import { getBillingPeriods, invoiceState } from "@/lib/finance";
import { euro, formatDay, periodGenitive, periodLabel, periodOf, shiftPeriod } from "@/lib/format";
import { createExtraInvoice, generateInvoices } from "../actions";

export const metadata: Metadata = { title: "Faturat" };

export default function InvoicesPage({ searchParams }: PageProps<"/admin/faturat">) {
  return (
    <div className="flex flex-col gap-7">
      <Suspense fallback={<Skeleton rows={3} />}>
        <Invoices searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Invoices({ searchParams }: { searchParams: PageProps<"/admin/faturat">["searchParams"] }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const requested = typeof params.periudha === "string" ? params.periudha : "";
  const period = /^\d{4}-\d{2}$/.test(requested) ? requested : periodOf(new Date());

  const [invoices, funds, billing] = await Promise.all([
    db.invoice.findMany({
      where: { buildingId: admin.buildingId, period },
      include: { unit: true, payments: true },
      orderBy: [{ kind: "desc" }, { createdAt: "asc" }],
    }),
    db.fund.findMany({ where: { buildingId: admin.buildingId } }),
    getBillingPeriods(admin.buildingId, periodOf(new Date())),
  ]);
  const rows = invoices
    .map((invoice) => ({ invoice, state: invoiceState(invoice) }))
    .sort(
      (a, b) =>
        a.invoice.kind.localeCompare(b.invoice.kind) ||
        a.invoice.unit.kind.localeCompare(b.invoice.unit.kind) ||
        Number(a.invoice.unit.number) - Number(b.invoice.unit.number),
    );
  const sum = (status?: string) =>
    rows
      .filter((r) => !status || r.state.status === status)
      .reduce((s, r) => s + (status === "PAGUAR" ? r.state.paidCents : status ? r.state.remainingCents : r.invoice.totalCents), 0);

  return (
    <>
      <PageTitle
        title="Faturat"
        subtitle={
          <span className="flex items-center gap-2">
            <Link
              href={`/admin/faturat?periudha=${shiftPeriod(period, -1)}`}
              aria-label="Muaji i kaluar"
              className="flex size-8 items-center justify-center rounded-lg bg-white"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Link>
            <span className="min-w-28 text-center capitalize">{periodLabel(period)}</span>
            <Link
              href={`/admin/faturat?periudha=${shiftPeriod(period, 1)}`}
              aria-label="Muaji tjetër"
              className="flex size-8 items-center justify-center rounded-lg bg-white"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </span>
        }
        actions={
          <form action={generateInvoices}>
            <SubmitButton className={btn.primary} pendingText="Duke gjeneruar…">
              <Plus className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
              Gjenero faturat e {periodGenitive(billing.nextPeriod)}
            </SubmitButton>
          </form>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <Summary label="Faturuar" value={euro(sum())} />
        <Summary label="Paguar" value={euro(sum("PAGUAR"))} />
        <Summary label="Në pritje të aprovimit" value={euro(sum("NE_PRITJE"))} />
        <Summary label="Pa paguar" value={euro(sum("PAPAGUAR"))} />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <Card className="min-w-0 flex-[2_1_520px] p-0">
          {rows.length === 0 ? (
            <div className="p-6">
              <Empty>Nuk ka fatura për {periodLabel(period)}.</Empty>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-[15px]">
                <thead className="text-[13px] text-muted">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Njësia</th>
                    <th className="px-3 py-4 font-semibold">Fatura</th>
                    <th className="px-3 py-4 font-semibold">Shuma</th>
                    <th className="px-3 py-4 font-semibold">Afati</th>
                    <th className="px-6 py-4 font-semibold">Statusi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ invoice, state }) => (
                    <tr key={invoice.id} className="border-t border-line">
                      <td className="px-6 py-3 font-bold">{unitLabel(invoice.unit)}</td>
                      <td className="px-3 py-3">
                        <span className="flex flex-col">
                          <span className="font-semibold">{invoice.title}</span>
                          <span className="text-[13px] text-muted">
                            {isKey(INVOICE_KIND, invoice.kind) ? INVOICE_KIND[invoice.kind] : invoice.kind}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3 font-extrabold">{euro(invoice.totalCents)}</td>
                      <td className="px-3 py-3 text-muted">{formatDay(invoice.dueDate)}</td>
                      <td className="px-6 py-3">
                        <InvoiceStatusChip status={state.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="flex-[1_1_300px]">
          <CardHeader title="Faturë e jashtëzakonshme" />
          <p className="pb-4 text-sm text-muted">
            Për shpenzime të veçanta, p.sh. riparimin e kulmit. Krijohet një faturë për çdo njësi.
          </p>
          <ActionForm action={createExtraInvoice} submitLabel="Krijo faturat" submitClassName={btn.primary}>
            <div className="flex flex-col gap-2">
              <label htmlFor="extra-description" className={field.label}>
                Përshkrimi
              </label>
              <input id="extra-description" name="description" placeholder="P.sh. Ngjyrosja e shkallëve" className={field.input} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="extra-amount" className={field.label}>
                Shuma për njësi (€)
              </label>
              <input id="extra-amount" name="amount" inputMode="decimal" placeholder="50,00" className={field.input} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="extra-fund" className={field.label}>
                Fondi
              </label>
              <select id="extra-fund" name="fundId" className={field.input} defaultValue="">
                <option value="">Arka e përgjithshme</option>
                {funds.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.name}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className={`${field.label} pb-2`}>Kush e paguan</legend>
              <label className="flex items-center gap-3 text-[15px]">
                <input type="radio" name="scope" value="TE_GJITHA" defaultChecked className="size-4 accent-deep" />
                Të gjitha njësitë
              </label>
              <label className="flex items-center gap-3 text-[15px]">
                <input type="radio" name="scope" value="BANESAT" className="size-4 accent-deep" />
                Vetëm banesat
              </label>
            </fieldset>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[20px] bg-white px-5 py-4">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <span className="text-xl font-extrabold">{value}</span>
    </div>
  );
}
