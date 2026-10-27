import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, Empty, PageTitle, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Aktiviteti" };

export default function ActivityPage() {
  return (
    <div className="flex flex-col gap-7">
      <PageTitle
        title="Aktiviteti"
        subtitle="Çdo veprim me para dhe status regjistrohet këtu dhe nuk mund të fshihet"
      />
      <Suspense fallback={<Skeleton rows={2} />}>
        <ActivityLog />
      </Suspense>
    </div>
  );
}

async function ActivityLog() {
  const admin = await requireAdmin();
  const logs = await db.auditLog.findMany({
    where: { buildingId: admin.buildingId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  if (logs.length === 0) return <Empty>Asnjë veprim ende.</Empty>;
  return (
    <Card className="px-6 py-2">
      <ol>
        {logs.map((log, i) => (
          <li key={log.id} className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3.5 ${i ? "border-t border-line" : ""}`}>
            <span className="w-36 shrink-0 text-[13px] font-semibold text-muted">
              {formatDate(log.createdAt)}, {formatTime(log.createdAt)}
            </span>
            <span className="min-w-0 flex-1 text-[15px]">{log.action}</span>
            <span className="text-[13px] font-bold">{log.user?.name ?? "Sistemi"}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
