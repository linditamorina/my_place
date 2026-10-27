import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrintButton } from "@/components/client";
import { LogoMark } from "@/components/logo";
import { Screen, TopBar } from "@/components/resident";
import { btn, Skeleton } from "@/components/ui";
import { requireResident } from "@/lib/auth";
import { PAYMENT_METHOD, isKey, unitLabel } from "@/lib/constants";
import { db } from "@/lib/db";
import { euro, formatDate, formatTime, receiptNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Dëftesa" };

export default function ReceiptPage({ params }: PageProps<"/banori/deftesa/[id]">) {
  return (
    <Screen>
      <Suspense fallback={<Skeleton rows={2} />}>
        <Receipt params={params} />
      </Suspense>
    </Screen>
  );
}

async function Receipt({ params }: { params: PageProps<"/banori/deftesa/[id]">["params"] }) {
  const resident = await requireResident();
  const { id } = await params;
  const payment = await db.payment.findFirst({
    where: { id, unitId: resident.unit.id, status: "APROVUAR" },
    include: { invoice: true },
  });
  if (!payment || !payment.receiptNo) notFound();
  const approver = payment.approvedById
    ? await db.user.findUnique({ where: { id: payment.approvedById }, select: { name: true } })
    : null;
  const date = payment.approvedAt ?? payment.createdAt;

  const rows: [string, string][] = [
    ["Njësia", `${unitLabel(resident.unit)} · ${resident.building.name}`],
    ["Pronari", resident.unit.ownerName],
    ["Për", payment.invoice.title],
    ["Mënyra", isKey(PAYMENT_METHOD, payment.method) ? PAYMENT_METHOD[payment.method] : payment.method],
    ["Data", `${formatDate(date)}, ${formatTime(date)}`],
    ["Pranoi", approver?.name ?? "Administratori"],
  ];

  return (
    <>
      <TopBar title="Dëftesa e pagesës" back={`/banori/faturat/${payment.invoiceId}`} />
      <article className="flex flex-col gap-5 rounded-3xl bg-white p-6 print:p-0">
        <header className="flex items-center justify-between">
          <span className="flex flex-col">
            <span className="text-xs font-bold tracking-wide text-muted uppercase">Dëftesë pagese</span>
            <span className="text-2xl font-extrabold">{receiptNumber(payment.receiptNo)}</span>
          </span>
          <LogoMark size={44} />
        </header>
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-soft py-5">
          <span className="text-sm font-semibold text-muted">Shuma e paguar</span>
          <span className="text-[36px] font-extrabold tracking-tight">{euro(payment.amountCents)}</span>
        </div>
        <dl className="flex flex-col">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-center text-xs text-muted">
          {resident.building.beneficiary} · {resident.building.address}, {resident.building.city}
        </p>
      </article>
      <PrintButton className={`${btn.white} print:hidden`} label="Printo ose ruaje si PDF" />
    </>
  );
}
