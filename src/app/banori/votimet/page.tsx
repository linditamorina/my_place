import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { Screen, TopBar } from "@/components/resident";
import { Chip, Empty, Skeleton } from "@/components/ui";
import { requireResident } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "Votimet" };

export default function ResidentPollsPage() {
  return (
    <Screen>
      <TopBar title="Votimet" back="/banori" />
      <Suspense fallback={<Skeleton rows={2} />}>
        <PollList />
      </Suspense>
    </Screen>
  );
}

async function PollList() {
  const resident = await requireResident();
  const now = new Date();
  const polls = await db.poll.findMany({
    where: { buildingId: resident.buildingId },
    include: { votes: { where: { unitId: resident.unit.id }, select: { id: true } } },
    orderBy: { closesAt: "desc" },
  });
  if (polls.length === 0) return <Empty>Asnjë votim ende.</Empty>;
  return (
    <div className="flex flex-col gap-3">
      {polls.map((poll) => {
        const open = poll.closesAt > now;
        const voted = poll.votes.length > 0;
        return (
          <Link
            key={poll.id}
            href={`/banori/votimet/${poll.id}`}
            className="flex items-center gap-3 rounded-[20px] bg-white p-4 transition hover:bg-white/80"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="flex flex-wrap items-center gap-2">
                {open ? <Chip tone="solid">Aktiv</Chip> : <Chip>Mbyllur</Chip>}
                {voted ? <Chip tone="outline">Ke votuar</Chip> : null}
              </span>
              <span className="text-[15px] font-bold leading-snug">{poll.question}</span>
              <span className="text-[13px] text-muted">
                {open ? "Mbyllet" : "U mbyll"} më {formatDay(poll.closesAt)}
              </span>
            </span>
            <ChevronRight className="size-[18px] shrink-0 text-muted" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
