import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import { ChevronRight, Clock, Upload } from "lucide-react";
import { ActionForm, CopyButton, FileField } from "@/components/client";
import { Screen, TopBar } from "@/components/resident";
import { btn, InvoiceStatusChip, Skeleton } from "@/components/ui";
import { requireResident } from "@/lib/auth";
import { paymentReference, unitLabel } from "@/lib/constants";
import { db } from "@/lib/db";
import { invoiceState } from "@/lib/finance";
import { euro, formatDay, formatRelative, receiptNumber } from "@/lib/format";
import { uploadProof } from "../../actions";

export const metadata: Metadata = { title: "Fatura" };

export default function InvoicePage({ params }: PageProps<"/banori/faturat/[id]">) {
  return (
    <Screen>
      <Suspense fallback={<Skeleton rows={3} />}>
        <Invoice params={params} />
      </Suspense>
    </Screen>
  );
}

async function Invoice({ params }: { params: PageProps<"/banori/faturat/[id]">["params"] }) {
  const resident = await requireResident();
  const { id } = await params;
  const invoice = await db.invoice.findFirst({
    where: { id, unitId: resident.unit.id },
    include: { lines: true, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!invoice) notFound();

  const now = new Date();
  const state = invoiceState(invoice);
  const building = resident.building;
  const reference = paymentReference(building.codePrefix, resident.unit, invoice.period, invoice.kind);
  const approved = invoice.payments.filter((p) => p.status === "APROVUAR");
  const pending = invoice.payments.find((p) => p.status === "NE_PRITJE");
  const rejected = invoice.payments.find((p) => p.status === "REFUZUAR");

  // QR me të dhënat e pagesës; varet nga banka nëse aplikacioni i saj e lexon këtë format.
  const qr =
    state.status === "PAPAGUAR"
      ? await QRCode.toString(
          [
            `IBAN: ${building.iban}`,
            `Përfituesi: ${building.beneficiary}`,
            `Shuma: ${(state.remainingCents / 100).toFixed(2)} EUR`,
            `Përshkrimi: ${reference}`,
          ].join("\n"),
          { type: "svg", margin: 0, color: { dark: "#0f3d36", light: "#ffffff" } },
        )
      : null;

  return (
    <>
      <TopBar title={invoice.title} back="/banori/faturat" />

      <section className="flex flex-col gap-3 rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-muted">
            {unitLabel(resident.unit)} · {building.name}
          </span>
          <InvoiceStatusChip status={state.status} />
        </div>
        <span className="text-[38px] font-extrabold leading-tight tracking-tight">
          {euro(state.status === "PAGUAR" ? invoice.totalCents : state.remainingCents)}
        </span>
        <div className="flex flex-col gap-2 text-sm">
          {invoice.lines.map((line) => (
            <div key={line.id} className="flex justify-between gap-3">
              <span className="text-muted">{line.description}</span>
              <span className="font-bold">{euro(line.amountCents)}</span>
            </div>
          ))}
          <div className="h-px bg-line" />
          <div className="flex justify-between gap-3 font-extrabold">
            <span>Gjithsej</span>
            <span>{euro(invoice.totalCents)}</span>
          </div>
          {state.status !== "PAGUAR" ? (
            <span className="text-[13px] text-muted">Afati i pagesës: {formatDay(invoice.dueDate)}</span>
          ) : null}
        </div>
      </section>

      {approved.length ? (
        <section className="flex flex-col gap-2 rounded-[20px] bg-white p-2">
          {approved.map((payment) => (
            <Link
              key={payment.id}
              href={`/banori/deftesa/${payment.id}`}
              className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-soft"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-bold">Dëftesa {receiptNumber(payment.receiptNo ?? 0)}</span>
                <span className="text-[13px] text-muted">
                  {euro(payment.amountCents)} · {payment.method === "KESH" ? "kesh" : "transfer bankar"} ·{" "}
                  {formatDay(payment.approvedAt ?? payment.createdAt)}
                </span>
              </span>
              <ChevronRight className="size-[18px] text-muted" aria-hidden="true" />
            </Link>
          ))}
        </section>
      ) : null}

      {pending ? (
        <section className="flex items-start gap-3 rounded-[20px] bg-white p-5">
          <Clock className="mt-0.5 size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <span className="flex flex-col gap-1">
            <span className="text-[15px] font-bold">Dëshmia u dërgua {formatRelative(pending.createdAt, now)}</span>
            <span className="text-sm text-muted">
              Admini e kontrollon dhe ti merr dëftesën këtu. S&apos;ke nevojë të bësh asgjë tjetër.
            </span>
          </span>
        </section>
      ) : null}

      {state.status === "PAPAGUAR" ? (
        <>
          <section className="flex flex-col gap-2.5 rounded-3xl bg-white p-5">
            <h2 className="text-base font-extrabold">Paguaj me m-banking</h2>
            <div className="flex flex-col gap-0.5 pb-1">
              <span className="text-xs font-semibold text-muted">Përfituesi</span>
              <span className="text-[15px] font-bold">{building.beneficiary}</span>
            </div>
            <CopyRow label="IBAN" value={building.iban} copyLabel="Kopjo IBAN-in" />
            <CopyRow label="Përshkrimi i pagesës" value={reference} copyLabel="Kopjo përshkrimin" />
            {qr ? (
              <div className="flex items-center gap-3.5 pt-1">
                <span
                  role="img"
                  aria-label="Kodi QR me të dhënat e pagesës"
                  className="block size-[76px] shrink-0 rounded-[14px] border border-line bg-white p-1.5 [&>svg]:size-full"
                  dangerouslySetInnerHTML={{ __html: qr }}
                />
                <span className="text-sm leading-snug text-muted">
                  Ose skano kodin QR në aplikacionin e bankës, nëse e mbështet.
                </span>
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-3 rounded-3xl bg-white p-5">
            {rejected ? (
              <p className="rounded-xl border-[1.5px] border-deep px-3 py-2 text-sm font-semibold">
                Dëshmia e mëparshme nuk u pranua. Kontrollo shumën dhe përshkrimin, pastaj ngarkoje sërish.
              </p>
            ) : null}
            <ActionForm
              action={uploadProof.bind(null, invoice.id)}
              submitLabel={
                <>
                  <Upload className="size-5" strokeWidth={2} aria-hidden="true" />
                  Dërgo dëshminë e pagesës
                </>
              }
              pendingLabel="Duke dërguar…"
              submitClassName={`${btn.primary} h-[52px] text-base`}
            >
              <label htmlFor="proof" className="text-[15px] font-bold">
                Pagove? Ngarko screenshot-in e transferit
              </label>
              <FileField
                id="proof"
                name="proof"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required
                title="Zgjidh screenshot-in ose PDF-në"
                hint="Foto ose PDF, deri në 5 MB."
              />
            </ActionForm>
            <p className="text-center text-[13px] leading-snug text-muted">
              Pagove me kesh? Kryetari e regjistron pagesën dhe dëftesa të vjen këtu.
            </p>
          </section>
        </>
      ) : null}
    </>
  );
}

function CopyRow({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] bg-soft py-2.5 pr-2.5 pl-3.5">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <span className="truncate text-[15px] font-bold tracking-wide">{value}</span>
      </span>
      <CopyButton value={value} label={copyLabel} />
    </div>
  );
}
