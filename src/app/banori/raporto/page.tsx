import type { Metadata } from "next";
import { Suspense } from "react";
import { Clock, Send } from "lucide-react";
import { ActionForm, FileField } from "@/components/client";
import { Screen, TicketTracker, TopBar } from "@/components/resident";
import { btn, TicketStatusChip } from "@/components/ui";
import { requireResident } from "@/lib/auth";
import { TICKET_CATEGORY } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/format";
import { reportTicket } from "../actions";

export const metadata: Metadata = { title: "Raporto prishje" };

function StepTitle({ n, children, htmlFor }: { n: number; children: string; htmlFor?: string }) {
  const content = (
    <>
      <span className="flex size-[26px] items-center justify-center rounded-full bg-white text-[13px] font-extrabold">
        {n}
      </span>
      <span className="text-base font-extrabold">{children}</span>
    </>
  );
  return htmlFor ? (
    <label htmlFor={htmlFor} className="flex items-center gap-2.5">
      {content}
    </label>
  ) : (
    <span className="flex items-center gap-2.5">{content}</span>
  );
}

export default function ReportPage() {
  return (
    <Screen>
      <TopBar title="Raporto një prishje" back="/banori" />
      <ActionForm
        action={reportTicket}
        className="flex flex-col gap-5"
        submitLabel={
          <>
            <Send className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            Dërgo raportin
          </>
        }
        pendingLabel="Duke dërguar…"
        submitClassName={`${btn.primary} h-[52px] text-base`}
      >
        <fieldset className="flex flex-col gap-3">
          <legend className="pb-3">
            <StepTitle n={1}>Çka është prishur?</StepTitle>
          </legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TICKET_CATEGORY).map(([value, label]) => (
              <label
                key={value}
                className="flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-line bg-white px-4 text-sm font-semibold transition has-[:checked]:border-deep has-[:checked]:bg-deep has-[:checked]:font-bold has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-mid"
              >
                <input type="radio" name="category" value={value} required className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3">
          <StepTitle n={2} htmlFor="photo">
            Shto një foto
          </StepTitle>
          <FileField
            id="photo"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            icon="camera"
            title="Bëj foto ose zgjidh nga galeria"
            hint="Opsionale, por ndihmon teknikun."
          />
        </div>

        <div className="flex flex-col gap-3">
          <StepTitle n={3} htmlFor="description">
            Përshkruaj shkurt
          </StepTitle>
          <textarea
            id="description"
            name="description"
            rows={3}
            required
            minLength={5}
            placeholder="P.sh. Llamba në katin 5 nuk ndizet"
            className="h-24 resize-none rounded-2xl border-[1.5px] border-line bg-white px-4 py-3.5 text-[15px] leading-relaxed outline-none focus:border-mid"
          />
        </div>
      </ActionForm>

      <Suspense fallback={null}>
        <MyReports />
      </Suspense>
    </Screen>
  );
}

async function MyReports() {
  const resident = await requireResident();
  const now = new Date();
  const tickets = await db.ticket.findMany({
    where: { buildingId: resident.buildingId, OR: [{ reporterId: resident.id }, { unitId: resident.unit.id }] },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  if (tickets.length === 0) return null;
  const [latest, ...older] = tickets;

  return (
    <section className="flex flex-col gap-3 pt-2">
      <div className="flex flex-col gap-4 rounded-[20px] bg-white p-[18px]">
        <div className="flex items-start justify-between gap-2.5">
          <span className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-muted">Raporti yt i fundit</span>
            <span className="text-[15px] font-extrabold">{latest.description}</span>
          </span>
          <TicketStatusChip status={latest.status} />
        </div>
        <TicketTracker status={latest.status} />
        {latest.adminNote ? (
          <span className="flex items-center gap-2 text-[13px] text-muted">
            <Clock className="size-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            {latest.adminNote}
          </span>
        ) : null}
      </div>
      {older.map((ticket) => (
        <div key={ticket.id} className="flex items-center gap-3 rounded-[20px] bg-white px-[18px] py-3.5">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold">{ticket.description}</span>
            <span className="text-xs text-muted">{formatRelative(ticket.createdAt, now)}</span>
          </span>
          <TicketStatusChip status={ticket.status} />
        </div>
      ))}
    </section>
  );
}
