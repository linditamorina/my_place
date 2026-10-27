import type { Metadata } from "next";
import { Suspense } from "react";
import { Image as ImageIcon } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { TicketIcon } from "@/components/icons";
import { btn, Card, Empty, IconTile, PageTitle, Skeleton, TicketStatusChip } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { TICKET_CATEGORY, TICKET_FLOW, TICKET_STATUS, isKey, unitLabel } from "@/lib/constants";
import { db } from "@/lib/db";
import { fileUrl } from "@/lib/files";
import { formatRelative } from "@/lib/format";
import { updateTicket } from "../actions";

export const metadata: Metadata = { title: "Prishjet" };

export default function TicketsPage() {
  return (
    <div className="flex flex-col gap-7">
      <PageTitle title="Prishjet" subtitle="Ankesat e banorëve dhe ecuria e riparimeve" />
      <Suspense fallback={<Skeleton rows={3} />}>
        <Tickets />
      </Suspense>
    </div>
  );
}

async function Tickets() {
  const admin = await requireAdmin();
  const now = new Date();
  const tickets = await db.ticket.findMany({
    where: { buildingId: admin.buildingId },
    include: { unit: true, reporter: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const open = tickets.filter((t) => t.status !== "KRYER");
  const done = tickets.filter((t) => t.status === "KRYER");

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-extrabold">Të hapura ({open.length})</h2>
        {open.length === 0 ? <Empty>Asnjë prishje e hapur. Gjithçka në rregull!</Empty> : null}
        {open.map((ticket) => (
          <Card key={ticket.id} className="flex flex-col gap-4">
            <div className="flex items-start gap-3.5">
              <IconTile>
                <TicketIcon category={ticket.category} />
              </IconTile>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[15px] font-bold">{ticket.description}</span>
                <span className="text-[13px] text-muted">
                  {isKey(TICKET_CATEGORY, ticket.category) ? TICKET_CATEGORY[ticket.category] : ticket.category}
                  {ticket.unit ? ` · ${unitLabel(ticket.unit)}` : ""}
                  {ticket.reporter ? ` · ${ticket.reporter.name}` : ""} · {formatRelative(ticket.createdAt, now)}
                </span>
              </div>
              {ticket.photoFile ? (
                <a
                  href={fileUrl(ticket.photoFile)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Shiko foton e prishjes"
                  className={btn.icon}
                >
                  <ImageIcon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                </a>
              ) : null}
              <TicketStatusChip status={ticket.status} />
            </div>
            <form action={updateTicket} className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <label className="flex flex-col gap-1.5 text-[13px] font-bold">
                Statusi
                <select
                  name="status"
                  defaultValue={ticket.status}
                  className="h-11 rounded-xl border-[1.5px] border-line bg-white px-3 text-[15px] font-semibold outline-none focus:border-mid"
                >
                  {TICKET_FLOW.map((status) => (
                    <option key={status} value={status}>
                      {TICKET_STATUS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-60 flex-1 flex-col gap-1.5 text-[13px] font-bold">
                Shënim për banorin
                <input
                  name="adminNote"
                  defaultValue={ticket.adminNote ?? ""}
                  placeholder="P.sh. Elektricisti vjen nesër në ora 10:00"
                  className="h-11 rounded-xl border-[1.5px] border-line bg-white px-3 text-[15px] font-normal outline-none focus:border-mid"
                />
              </label>
              <SubmitButton className={`${btn.smallPrimary} h-11`} pendingText="Duke ruajtur…">
                Ruaj
              </SubmitButton>
            </form>
          </Card>
        ))}
      </section>

      {done.length ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-extrabold">Të kryera ({done.length})</h2>
          <Card className="px-6 py-2">
            {done.map((ticket, i) => (
              <div key={ticket.id} className={`flex items-start gap-3.5 py-3.5 ${i ? "border-t border-line" : ""}`}>
                <IconTile>
                  <TicketIcon category={ticket.category} />
                </IconTile>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-bold">{ticket.description}</span>
                  <span className="text-[13px] text-muted">
                    {ticket.adminNote ?? "Pa shënim"} · {formatRelative(ticket.updatedAt, now)}
                  </span>
                </span>
                <TicketStatusChip status={ticket.status} />
              </div>
            ))}
          </Card>
        </section>
      ) : null}
    </>
  );
}
