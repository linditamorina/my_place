import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Bell, Check, ChevronRight, Receipt, SquareCheck, Wallet, Wrench } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { btn, Chip, IconTile, Skeleton } from "@/components/ui";
import { requireResident } from "@/lib/auth";
import { unitLabel } from "@/lib/constants";
import { db } from "@/lib/db";
import { getBalance, invoiceState } from "@/lib/finance";
import { euro, formatDay, formatRelative, periodLabel } from "@/lib/format";
import { markNoticeRead } from "./actions";

export const metadata: Metadata = { title: "Ballina" };

export default function ResidentHomePage() {
  return (
    <Suspense
      fallback={
        <div className="px-5 pt-7">
          <Skeleton rows={4} />
        </div>
      }
    >
      <Home />
    </Suspense>
  );
}

function greeting(hour: number): string {
  if (hour < 12) return "Mirëmëngjes,";
  if (hour < 18) return "Mirëdita,";
  return "Mirëmbrëma,";
}

async function Home() {
  const resident = await requireResident();
  const now = new Date();
  const [invoices, balance, polls, notices] = await Promise.all([
    db.invoice.findMany({
      where: { unitId: resident.unit.id },
      include: { payments: true },
      orderBy: { dueDate: "asc" },
    }),
    getBalance(resident.buildingId),
    db.poll.findMany({
      where: { buildingId: resident.buildingId, closesAt: { gt: now } },
      include: { votes: { where: { unitId: resident.unit.id }, select: { id: true } } },
    }),
    db.notice.findMany({
      where: { buildingId: resident.buildingId, OR: [{ unitId: null }, { unitId: resident.unit.id }] },
      include: { reads: { where: { userId: resident.id }, select: { userId: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const unpaid = invoices
    .map((invoice) => ({ invoice, state: invoiceState(invoice) }))
    .filter(({ state }) => state.status === "PAPAGUAR");
  const pendingCount = invoices.filter((i) => invoiceState(i).status === "NE_PRITJE").length;
  const dueCents = unpaid.reduce((sum, u) => sum + u.state.remainingCents, 0);
  const payHref = unpaid.length === 1 ? `/banori/faturat/${unpaid[0].invoice.id}` : "/banori/faturat";
  const openPolls = polls.filter((p) => p.votes.length === 0).length;
  const unread = notices.filter((n) => n.reads.length === 0);
  const featured = unread.find((n) => n.important) ?? notices[0];
  const firstName = resident.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-5 px-5 pt-7">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-muted">{greeting(now.getHours())}</span>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{firstName}</h1>
          <span className="text-[13px] font-semibold text-muted">
            {unitLabel(resident.unit)} · {resident.building.name}
          </span>
        </div>
        <Link
          href="/banori/njoftimet"
          aria-label={unread.length ? `Njoftimet, ${unread.length} të palexuara` : "Njoftimet"}
          className="relative flex size-12 items-center justify-center rounded-2xl bg-white"
        >
          <Bell className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
          {unread.length ? (
            <span className="absolute top-2.5 right-3 size-2.5 rounded-full border-2 border-white bg-mid" />
          ) : null}
        </Link>
      </header>

      {dueCents > 0 ? (
        <section className="flex flex-col gap-1.5 rounded-3xl bg-deep p-[22px] text-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white/75">Për t&apos;u paguar</span>
            <span className={`rounded-full bg-white/12 px-2.5 py-1 text-xs font-bold ${unpaid.length === 1 ? "capitalize" : ""}`}>
              {unpaid.length === 1 ? periodLabel(unpaid[0].invoice.period) : `${unpaid.length} fatura`}
            </span>
          </div>
          <span className="text-[42px] font-extrabold tracking-tight">{euro(dueCents)}</span>
          <span className="text-sm text-white/75">Afati: {formatDay(unpaid[0].invoice.dueDate)}</span>
          <Link
            href={payHref}
            className="mt-3 flex h-[50px] items-center justify-center gap-2 rounded-[14px] bg-soft text-base font-bold text-deep"
          >
            Paguaj tani
            <ChevronRight className="size-[18px]" strokeWidth={2} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <section className="flex items-center gap-4 rounded-3xl bg-deep p-[22px] text-white">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/12">
            <Check className="size-6" strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-lg font-extrabold">
              {pendingCount ? "Pagesa jote është në pritje" : "S'ke asnjë borxh"}
            </span>
            <span className="text-sm text-white/75">
              {pendingCount ? "Admini po e kontrollon dëshminë." : "Faleminderit që paguan me kohë!"}
            </span>
          </span>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <QuickLink href="/banori/raporto" icon={<Wrench className="size-5" strokeWidth={1.8} aria-hidden="true" />} title="Raporto prishje" detail="Me 3 klikime" />
        <QuickLink href="/banori/arka" icon={<Wallet className="size-5" strokeWidth={1.8} aria-hidden="true" />} title="Arka e hyrjes" detail={euro(balance)} />
        <QuickLink
          href="/banori/votimet"
          icon={<SquareCheck className="size-5" strokeWidth={1.8} aria-hidden="true" />}
          title="Votimet"
          detail={openPolls ? `${openPolls} pret votën tënde` : "Asnjë votim i ri"}
        />
        <QuickLink
          href="/banori/faturat"
          icon={<Receipt className="size-5" strokeWidth={1.8} aria-hidden="true" />}
          title="Faturat"
          detail="Historiku dhe dëftesat"
        />
      </div>

      {featured ? (
        <section className="flex flex-col gap-2.5 rounded-[20px] bg-white p-[18px]">
          <div className="flex items-center justify-between">
            {featured.important ? <Chip tone="solid">E rëndësishme</Chip> : <Chip>Njoftim</Chip>}
            <span className="text-[13px] text-muted">{formatRelative(featured.createdAt, now)}</span>
          </div>
          <h2 className="text-base font-extrabold">{featured.title}</h2>
          <p className="text-sm leading-relaxed text-muted">{featured.body}</p>
          {featured.reads.length ? (
            <span className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-soft text-sm font-bold">
              <Check className="size-4" strokeWidth={2.4} aria-hidden="true" />
              E lexuar
            </span>
          ) : (
            <form action={markNoticeRead} className="mt-1">
              <input type="hidden" name="noticeId" value={featured.id} />
              <SubmitButton className={`${btn.smallPrimary} h-11 w-full`} pendingText="…">
                E lexova
              </SubmitButton>
            </form>
          )}
          {unread.length > 1 ? (
            <Link href="/banori/njoftimet" className="pt-1 text-center text-sm font-bold">
              {unread.length === 2 ? "Edhe 1 njoftim tjetër" : `Edhe ${unread.length - 1} njoftime të tjera`}
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function QuickLink({ href, icon, title, detail }: { href: string; icon: ReactNode; title: string; detail: string }) {
  return (
    <Link href={href} className="flex flex-col gap-3 rounded-[20px] bg-white p-4 transition hover:bg-white/80">
      <IconTile>{icon}</IconTile>
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-bold">{title}</span>
        <span className="text-[13px] text-muted">{detail}</span>
      </span>
    </Link>
  );
}
