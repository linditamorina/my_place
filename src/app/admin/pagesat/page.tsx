import type { Metadata } from "next";
import { Suspense } from "react";
import { Check, X } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { btn, Card, CardHeader, Chip, Empty, field, PageTitle, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { PAYMENT_METHOD, PAYMENT_STATUS, isKey, unitLabel } from "@/lib/constants";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import { getDebts } from "@/lib/finance";
import { euro, formatDay, formatRelative, receiptNumber } from "@/lib/format";
import { approvePayment, registerCash, rejectPayment } from "../actions";

export const metadata: Metadata = { title: "Pagesat" };

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-7">
      <PageTitle title="Pagesat" subtitle="Dëshmitë bankare, pagesat me kesh dhe dëftesat" />
      <Suspense fallback={<Skeleton rows={3} />}>
        <Payments />
      </Suspense>
    </div>
  );
}

async function Payments() {
  const admin = await requireAdmin();
  const now = new Date();
  const [pending, recent, debts] = await Promise.all([
    db.payment.findMany({
      where: { buildingId: admin.buildingId, status: "NE_PRITJE" },
      include: { unit: { include: { residents: { select: { name: true } } } }, invoice: true },
      orderBy: { createdAt: "asc" },
    }),
    db.payment.findMany({
      where: { buildingId: admin.buildingId, status: { not: "NE_PRITJE" } },
      include: { unit: true, invoice: true },
      orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
      take: 25,
    }),
    getDebts(admin.buildingId),
  ]);
  const debtors = [...debts.values()]
    .filter((d) => d.debtCents > 0)
    .sort((a, b) => a.unit.kind.localeCompare(b.unit.kind) || Number(a.unit.number) - Number(b.unit.number));

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-extrabold">Në pritje të aprovimit ({pending.length})</h2>
        {pending.length === 0 ? (
          <Empty>Asnjë dëshmi pagese në pritje.</Empty>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
            {pending.map((payment) => {
              const name = payment.unit.residents[0]?.name ?? payment.unit.ownerName;
              return (
                <Card key={payment.id} className="flex flex-col gap-4">
                  {payment.proofFile ? (
                    <a
                      href={fileUrl(payment.proofFile)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-2xl bg-soft"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- skedar privat, shërbehet nga route-i me kontroll qasjeje */}
                      <img
                        src={fileUrl(payment.proofFile)}
                        alt={`Dëshmia e pagesës nga ${name}`}
                        className="h-56 w-full object-cover object-top"
                      />
                    </a>
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex flex-col">
                      <span className="text-[15px] font-bold">{name}</span>
                      <span className="text-[13px] text-muted">
                        {unitLabel(payment.unit)} · {payment.invoice.title} · {formatRelative(payment.createdAt, now)}
                      </span>
                    </span>
                    <span className="text-lg font-extrabold">{euro(payment.amountCents)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <form action={rejectPayment}>
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <SubmitButton className={`${btn.smallOutline} w-full`} pendingText="…">
                        <X className="size-4" aria-hidden="true" />
                        Refuzo
                      </SubmitButton>
                    </form>
                    <form action={approvePayment}>
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <SubmitButton className={`${btn.smallPrimary} w-full`} pendingText="…">
                        <Check className="size-4" strokeWidth={2.4} aria-hidden="true" />
                        Aprovo
                      </SubmitButton>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <Card className="flex-[1_1_300px]">
          <CardHeader title="Regjistro pagesë kesh" />
          <p className="pb-4 text-sm text-muted">
            Mbyll faturën më të vjetër të papaguar të njësisë. Banori e merr dëftesën në aplikacion.
          </p>
          {debtors.length === 0 ? (
            <Empty>Asnjë njësi me borxh.</Empty>
          ) : (
            <form action={registerCash} className="flex flex-col gap-4">
              <label htmlFor="cash-unit" className={field.label}>
                Njësia
              </label>
              <select id="cash-unit" name="unitId" className={field.input}>
                {debtors.map((d) => (
                  <option key={d.unit.id} value={d.unit.id}>
                    {unitLabel(d.unit)} · {d.unit.ownerName} · borxh {euro(d.debtCents)}
                  </option>
                ))}
              </select>
              <SubmitButton className={btn.primary} pendingText="Duke regjistruar…">
                Regjistro dhe lësho dëftesë
              </SubmitButton>
            </form>
          )}
        </Card>

        <Card className="min-w-0 flex-[2_1_520px] p-0">
          <div className="px-6 pt-5">
            <CardHeader title="Pagesat e fundit" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[15px]">
              <thead className="text-[13px] text-muted">
                <tr>
                  <th className="px-6 py-3 font-semibold">Dëftesa</th>
                  <th className="px-3 py-3 font-semibold">Njësia</th>
                  <th className="px-3 py-3 font-semibold">Fatura</th>
                  <th className="px-3 py-3 font-semibold">Mënyra</th>
                  <th className="px-3 py-3 font-semibold">Shuma</th>
                  <th className="px-6 py-3 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((payment) => (
                  <tr key={payment.id} className="border-t border-line">
                    <td className="px-6 py-3 font-bold">
                      {payment.receiptNo ? (
                        receiptNumber(payment.receiptNo)
                      ) : (
                        <Chip tone="outline">
                          {isKey(PAYMENT_STATUS, payment.status) ? PAYMENT_STATUS[payment.status] : payment.status}
                        </Chip>
                      )}
                    </td>
                    <td className="px-3 py-3">{unitLabel(payment.unit)}</td>
                    <td className="px-3 py-3 text-muted">{payment.invoice.title}</td>
                    <td className="px-3 py-3">
                      {isKey(PAYMENT_METHOD, payment.method) ? PAYMENT_METHOD[payment.method] : payment.method}
                    </td>
                    <td className="px-3 py-3 font-extrabold">{euro(payment.amountCents)}</td>
                    <td className="px-6 py-3 text-muted">{formatDay(payment.approvedAt ?? payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
