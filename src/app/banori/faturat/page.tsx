import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { Screen } from "@/components/resident";
import { Empty, InvoiceStatusChip, Skeleton } from "@/components/ui";
import { requireResident } from "@/lib/auth";
import { unitLabel } from "@/lib/constants";
import { db } from "@/lib/db";
import { invoiceState } from "@/lib/finance";
import { euro, formatDay, periodLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Faturat" };

export default function ResidentInvoicesPage() {
  return (
    <Screen>
      <h1 className="pt-1 text-[26px] font-extrabold tracking-tight">Faturat</h1>
      <Suspense fallback={<Skeleton rows={3} />}>
        <InvoiceList />
      </Suspense>
    </Screen>
  );
}

async function InvoiceList() {
  const resident = await requireResident();
  const invoices = await db.invoice.findMany({
    where: { unitId: resident.unit.id },
    include: { payments: true },
    orderBy: [{ period: "desc" }, { createdAt: "desc" }],
  });
  const rows = invoices.map((invoice) => ({ invoice, state: invoiceState(invoice) }));
  const open = rows.filter((r) => r.state.status !== "PAGUAR");
  const paid = rows.filter((r) => r.state.status === "PAGUAR");

  return (
    <>
      <p className="-mt-2 text-[13px] font-semibold text-muted">
        {unitLabel(resident.unit)} · {resident.building.name}
      </p>
      <Group title="Të hapura" rows={open} empty="Nuk ke fatura të papaguara." />
      <Group title="Të paguara" rows={paid} empty="Ende asnjë pagesë." />
    </>
  );
}

function Group({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { invoice: { id: string; title: string; period: string; dueDate: Date; totalCents: number }; state: ReturnType<typeof invoiceState> }[];
  empty: string;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="pt-2 text-[15px] font-extrabold">{title}</h2>
      {rows.length === 0 ? <Empty>{empty}</Empty> : null}
      {rows.map(({ invoice, state }) => (
        <Link
          key={invoice.id}
          href={`/banori/faturat/${invoice.id}`}
          className="flex items-center gap-3 rounded-[20px] bg-white p-4 transition hover:bg-white/80"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[15px] font-bold">{invoice.title}</span>
            <span className="text-[13px] text-muted">
              <span className="capitalize">{periodLabel(invoice.period)}</span>
              {state.status === "PAGUAR" ? "" : ` · afati ${formatDay(invoice.dueDate)}`}
            </span>
          </span>
          <span className="flex flex-col items-end gap-1.5">
            <span className="text-[15px] font-extrabold">{euro(invoice.totalCents)}</span>
            <InvoiceStatusChip status={state.status} />
          </span>
          <ChevronRight className="size-[18px] shrink-0 text-muted" aria-hidden="true" />
        </Link>
      ))}
    </section>
  );
}
