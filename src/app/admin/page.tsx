import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ArrowUpRight, Bell, CircleAlert, CreditCard, Image as ImageIcon, Plus, Wallet, Wrench } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { ExpenseIcon, TicketIcon } from "@/components/icons";
import { btn, Card, CardHeader, Empty, IconTile, Progress, Skeleton, TicketStatusChip } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { PAYMENT_METHOD, isKey, unitLabel } from "@/lib/constants";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import { getBalance, getBillingPeriods, getDebts, getMonthFlow, getPeriodCollection } from "@/lib/finance";
import {
  euro,
  formatDay,
  formatRelative,
  formatWeekday,
  initials,
  periodGenitive,
  periodMonth,
  periodOf,
} from "@/lib/format";
import { approvePayment, generateInvoices, sendReminders } from "./actions";

export const metadata: Metadata = { title: "Pasqyra" };

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<Skeleton rows={4} />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const admin = await requireAdmin();
  const now = new Date();
  const period = periodOf(now);
  const buildingId = admin.buildingId;

  const [balance, flow, collection, debts, pending, expenses, tickets, poll, billing, ticketCounts] =
    await Promise.all([
      getBalance(buildingId),
      getMonthFlow(buildingId, period),
      getPeriodCollection(buildingId, period),
      getDebts(buildingId),
      db.payment.findMany({
        where: { buildingId, status: "NE_PRITJE" },
        include: { unit: { include: { residents: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      db.expense.findMany({ where: { buildingId }, orderBy: { date: "desc" }, take: 3 }),
      db.ticket.findMany({
        where: { buildingId, status: { not: "KRYER" } },
        include: { unit: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      db.poll.findFirst({
        where: { buildingId, closesAt: { gt: now } },
        include: { _count: { select: { votes: true } } },
        orderBy: { createdAt: "desc" },
      }),
      getBillingPeriods(buildingId, period),
      db.ticket.groupBy({ by: ["status"], where: { buildingId, status: { not: "KRYER" } }, _count: true }),
    ]);

  const debtors = [...debts.values()].filter((d) => d.debtCents > 0);
  const debtTotal = debtors.reduce((sum, d) => sum + d.debtCents, 0);
  const openTickets = ticketCounts.reduce((sum, t) => sum + t._count, 0);
  const inProgress = ticketCounts.find((t) => t.status === "NE_PROCES")?._count ?? 0;
  const unitCount = await db.unit.count({ where: { buildingId } });
  const collectedPercent = collection.billedCents ? (collection.collectedCents / collection.billedCents) * 100 : 0;
  const firstName = admin.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted">{formatWeekday(now)}</span>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">Mirëdita, {firstName}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/njoftimet" className={btn.white}>
            <Bell className="size-[18px]" aria-hidden="true" />
            Njoftim i ri
          </Link>
          <form action={generateInvoices}>
            <SubmitButton className={btn.primary} pendingText="Duke gjeneruar…">
              <Plus className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
              Gjenero faturat e {periodGenitive(billing.nextPeriod)}
            </SubmitButton>
          </form>
        </div>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
        <Stat label="Arka e hyrjes" icon={<Wallet className="size-5" strokeWidth={1.8} aria-hidden="true" />}>
          <span className="text-[30px] font-extrabold tracking-tight">{euro(balance)}</span>
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
            <ArrowUpRight className="size-4" strokeWidth={2} aria-hidden="true" />
            {euro(flow.incomeCents - flow.expenseCents)} neto këtë muaj
          </span>
        </Stat>
        <Stat
          label={`Mbledhur në ${periodMonth(period)}`}
          icon={<CreditCard className="size-5" strokeWidth={1.8} aria-hidden="true" />}
        >
          <span className="flex items-baseline gap-1.5">
            <span className="text-[30px] font-extrabold tracking-tight">{euro(collection.collectedCents)}</span>
          </span>
          <span className="flex flex-col gap-2">
            <Progress value={collectedPercent} label="Pagesat e muajit" />
            <span className="text-[13px] font-semibold text-muted">
              {collection.unitsPaid} nga {collection.units} njësi kanë paguar · nga {euro(collection.billedCents)}
            </span>
          </span>
        </Stat>
        <Stat label="Me borxh" icon={<CircleAlert className="size-5" strokeWidth={1.8} aria-hidden="true" />}>
          <span className="text-[30px] font-extrabold tracking-tight">
            {debtors.length} njësi
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-muted">{euro(debtTotal)} gjithsej</span>
            {debtors.length ? (
              <form action={sendReminders}>
                <SubmitButton
                  className="min-h-8 rounded-full bg-soft px-3 text-[13px] font-bold"
                  pendingText="Duke dërguar…"
                >
                  Dërgo kujtesë
                </SubmitButton>
              </form>
            ) : null}
          </span>
        </Stat>
        <Stat label="Prishje të hapura" icon={<Wrench className="size-5" strokeWidth={1.8} aria-hidden="true" />}>
          <span className="text-[30px] font-extrabold tracking-tight">{openTickets}</span>
          <span className="text-[13px] font-semibold text-muted">
            {inProgress} në proces · {openTickets - inProgress} në pritje
          </span>
        </Stat>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[2_1_460px] flex-col gap-5">
          <Card className="px-6 pb-2.5">
            <CardHeader
              title="Pagesat për aprovim"
              action={
                <Link href="/admin/pagesat" className="text-sm font-bold">
                  Shiko të gjitha
                </Link>
              }
            />
            {pending.length === 0 ? (
              <div className="pb-4">
                <Empty>Asnjë dëshmi pagese në pritje.</Empty>
              </div>
            ) : (
              pending.map((payment) => {
                const name = payment.unit.residents[0]?.name ?? payment.unit.ownerName;
                return (
                  <div key={payment.id} className="flex flex-wrap items-center gap-3.5 border-t border-line py-3.5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-extrabold">
                      {initials(name)}
                    </span>
                    <span className="flex min-w-0 flex-[1_1_200px] flex-col">
                      <span className="text-[15px] font-bold">{name}</span>
                      <span className="text-[13px] text-muted">
                        {unitLabel(payment.unit)} ·{" "}
                        {isKey(PAYMENT_METHOD, payment.method) ? PAYMENT_METHOD[payment.method] : payment.method} ·{" "}
                        {formatRelative(payment.createdAt, now)}
                      </span>
                    </span>
                    <span className="text-base font-extrabold">{euro(payment.amountCents)}</span>
                    {payment.proofFile ? (
                      <a
                        href={fileUrl(payment.proofFile)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Shiko dëshminë e pagesës nga ${name}`}
                        className={btn.icon}
                      >
                        <ImageIcon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                      </a>
                    ) : null}
                    <form action={approvePayment}>
                      <input type="hidden" name="paymentId" value={payment.id} />
                      <SubmitButton className={`${btn.smallPrimary} h-11`} pendingText="…">
                        Aprovo
                      </SubmitButton>
                    </form>
                  </div>
                );
              })
            )}
          </Card>

          <Card className="px-6 pb-2.5">
            <CardHeader
              title="Shpenzimet e fundit"
              action={
                <Link href="/admin/arka" className={btn.smallSoft}>
                  <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />
                  Shto shpenzim
                </Link>
              }
            />
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
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{expense.description}</span>
                  <span className="text-[13px] text-muted">{formatDay(expense.date)}</span>
                  <span className="w-24 text-right text-[15px] font-extrabold">{euro(expense.amountCents)}</span>
                </div>
              ))
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
          <Card className="px-6 pb-2.5">
            <CardHeader
              title="Prishjet"
              action={
                <Link href="/admin/prishjet" className="text-sm font-bold">
                  Të gjitha
                </Link>
              }
            />
            {tickets.length === 0 ? (
              <div className="pb-4">
                <Empty>Asnjë prishje e hapur.</Empty>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="flex items-start gap-3 border-t border-line py-3.5">
                  <IconTile>
                    <TicketIcon category={ticket.category} />
                  </IconTile>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="line-clamp-2 text-[15px] font-bold">{ticket.description}</span>
                    <span className="text-[13px] text-muted">
                      {ticket.unit ? `${unitLabel(ticket.unit)} · ` : ""}
                      {formatRelative(ticket.createdAt, now)}
                    </span>
                  </span>
                  <TicketStatusChip status={ticket.status} />
                </div>
              ))
            )}
          </Card>

          {poll ? (
            <Link
              href="/admin/votimet"
              className="flex flex-col gap-3.5 rounded-[20px] bg-deep px-6 py-5 text-white transition hover:bg-deep/95"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-bold text-soft">Votim aktiv</span>
                <span className="text-[13px] text-white/75">Mbyllet më {formatDay(poll.closesAt)}</span>
              </span>
              <span className="text-lg font-extrabold leading-snug">{poll.question}</span>
              <Progress value={(poll._count.votes / unitCount) * 100} track="dark" label="Pjesëmarrja në votim" />
              <span className="flex justify-between text-[13px] text-white/75">
                <span>
                  {poll._count.votes} nga {unitCount} njësi kanë votuar
                </span>
                <span>{Math.round((poll._count.votes / unitCount) * 100)}%</span>
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[20px] bg-white p-[22px]">
      <span className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted">{label}</span>
        <IconTile>{icon}</IconTile>
      </span>
      {children}
    </div>
  );
}
