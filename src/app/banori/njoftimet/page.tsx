import type { Metadata } from "next";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { Screen, TopBar } from "@/components/resident";
import { btn, Chip, Empty, Skeleton } from "@/components/ui";
import { requireResident } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/format";
import { markNoticeRead } from "../actions";

export const metadata: Metadata = { title: "Njoftimet" };

export default function ResidentNoticesPage() {
  return (
    <Screen>
      <TopBar title="Njoftimet" back="/banori" />
      <Suspense fallback={<Skeleton rows={3} />}>
        <Notices />
      </Suspense>
    </Screen>
  );
}

async function Notices() {
  const resident = await requireResident();
  const now = new Date();
  const notices = await db.notice.findMany({
    where: { buildingId: resident.buildingId, OR: [{ unitId: null }, { unitId: resident.unit.id }] },
    include: { reads: { where: { userId: resident.id }, select: { userId: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (notices.length === 0) return <Empty>Asnjë njoftim ende.</Empty>;
  return (
    <div className="flex flex-col gap-3">
      {notices.map((notice) => {
        const read = notice.reads.length > 0;
        return (
          <article key={notice.id} className="flex flex-col gap-2.5 rounded-[20px] bg-white p-[18px]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex gap-2">
                {notice.important ? <Chip tone="solid">E rëndësishme</Chip> : <Chip>Njoftim</Chip>}
                {notice.unitId ? <Chip tone="outline">Vetëm për ty</Chip> : null}
              </span>
              <span className="text-[13px] text-muted">{formatRelative(notice.createdAt, now)}</span>
            </div>
            <h2 className="text-base font-extrabold">{notice.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{notice.body}</p>
            {read ? (
              <span className="flex items-center gap-1.5 text-[13px] font-bold">
                <Check className="size-4" strokeWidth={2.4} aria-hidden="true" />E lexuar
              </span>
            ) : (
              <form action={markNoticeRead}>
                <input type="hidden" name="noticeId" value={notice.id} />
                <SubmitButton className={`${btn.smallPrimary} h-11 w-full`} pendingText="…">
                  E lexova
                </SubmitButton>
              </form>
            )}
          </article>
        );
      })}
    </div>
  );
}
