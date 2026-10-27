import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/client";
import { btn, Card, CardHeader, Chip, Empty, field, PageTitle, Progress, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/format";
import { createNotice } from "../actions";

export const metadata: Metadata = { title: "Njoftimet" };

export default function NoticesPage() {
  return (
    <div className="flex flex-col gap-7">
      <PageTitle title="Njoftimet" subtitle="Bordi i hyrjes, pa letra të ngjitura në lift" />
      <div className="flex flex-wrap items-start gap-5">
        <Card className="flex-[1_1_320px]">
          <CardHeader title="Njoftim i ri" />
          <ActionForm action={createNotice} submitLabel="Publiko njoftimin" submitClassName={btn.primary}>
            <div className="flex flex-col gap-2">
              <label htmlFor="notice-title" className={field.label}>
                Titulli
              </label>
              <input id="notice-title" name="title" placeholder="P.sh. Ndërprerje e rrymës" className={field.input} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="notice-body" className={field.label}>
                Teksti
              </label>
              <textarea
                id="notice-body"
                name="body"
                rows={4}
                placeholder="Kur, ku dhe çfarë duhet të dinë banorët."
                className={field.textarea}
              />
            </div>
            <label className="flex items-start gap-3 rounded-2xl bg-soft p-4 text-[15px]">
              <input type="checkbox" name="important" className="mt-0.5 size-5 accent-deep" />
              <span className="flex flex-col">
                <span className="font-bold">E rëndësishme</span>
                <span className="text-[13px] text-muted">Banorët duhet të klikojnë «E lexova».</span>
              </span>
            </label>
          </ActionForm>
        </Card>
        <div className="min-w-0 flex-[2_1_480px]">
          <Suspense fallback={<Skeleton rows={2} />}>
            <NoticeList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function NoticeList() {
  const admin = await requireAdmin();
  const now = new Date();
  const [notices, residents] = await Promise.all([
    db.notice.findMany({
      where: { buildingId: admin.buildingId, unitId: null },
      include: { _count: { select: { reads: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.user.count({ where: { buildingId: admin.buildingId, role: "RESIDENT" } }),
  ]);
  if (notices.length === 0) return <Empty>Asnjë njoftim ende.</Empty>;
  return (
    <div className="flex flex-col gap-4">
      {notices.map((notice) => (
        <Card key={notice.id} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            {notice.important ? <Chip tone="solid">E rëndësishme</Chip> : <Chip>Njoftim</Chip>}
            <span className="text-[13px] text-muted">{formatRelative(notice.createdAt, now)}</span>
          </div>
          <h2 className="text-base font-extrabold">{notice.title}</h2>
          <p className="text-sm leading-relaxed text-muted">{notice.body}</p>
          <div className="flex items-center gap-3 border-t border-line pt-3">
            <Progress value={residents ? (notice._count.reads / residents) * 100 : 0} className="h-2 flex-1" label="E lexuan" />
            <span className="text-[13px] font-semibold text-muted">
              {notice._count.reads} nga {residents} banorë e lexuan
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
