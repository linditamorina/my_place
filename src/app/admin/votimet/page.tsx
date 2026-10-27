import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/client";
import { btn, Card, CardHeader, Chip, Empty, field, PageTitle, Progress, Skeleton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDay, pad } from "@/lib/format";
import { createPoll } from "../actions";

export const metadata: Metadata = { title: "Votimet" };

export default function PollsPage() {
  return (
    <div className="flex flex-col gap-7">
      <PageTitle title="Votimet" subtitle="Një votë për njësi, me afat kohor" />
      <Suspense fallback={<Skeleton rows={2} />}>
        <Polls />
      </Suspense>
    </div>
  );
}

async function Polls() {
  await requireAdmin();
  const inAWeek = new Date();
  inAWeek.setDate(inAWeek.getDate() + 7);
  const defaultClose = `${inAWeek.getFullYear()}-${pad(inAWeek.getMonth() + 1)}-${pad(inAWeek.getDate())}`;
  return (
    <div className="flex flex-wrap items-start gap-5">
        <Card className="flex-[1_1_320px]">
          <CardHeader title="Votim i ri" />
          <ActionForm action={createPoll} submitLabel="Hap votimin" submitClassName={btn.primary}>
            <div className="flex flex-col gap-2">
              <label htmlFor="poll-question" className={field.label}>
                Pyetja
              </label>
              <input id="poll-question" name="question" placeholder="P.sh. A të vendosim barrierë në parking?" className={field.input} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="poll-description" className={field.label}>
                Përshkrimi
              </label>
              <textarea
                id="poll-description"
                name="description"
                rows={3}
                placeholder="Kostoja, afati dhe çfarë ndryshon."
                className={field.textarea}
              />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className={`${field.label} pb-2`}>Përgjigjet</legend>
              <input name="option1" defaultValue="Po" aria-label="Përgjigjja 1" className={field.input} />
              <input name="option2" defaultValue="Jo" aria-label="Përgjigjja 2" className={field.input} />
              <input name="option3" placeholder="Përgjigje tjetër (opsionale)" aria-label="Përgjigjja 3" className={field.input} />
            </fieldset>
            <div className="flex flex-col gap-2">
              <label htmlFor="poll-closes" className={field.label}>
                Mbyllet më
              </label>
              <input id="poll-closes" name="closesAt" type="date" defaultValue={defaultClose} className={field.input} />
            </div>
            <label className="flex items-start gap-3 rounded-2xl bg-soft p-4 text-[15px]">
              <input type="checkbox" name="ownersOnly" defaultChecked className="mt-0.5 size-5 accent-deep" />
              <span className="flex flex-col">
                <span className="font-bold">Votojnë vetëm pronarët</span>
                <span className="text-[13px] text-muted">Qiramarrësit e shohin votimin, por nuk votojnë.</span>
              </span>
            </label>
          </ActionForm>
        </Card>
        <div className="min-w-0 flex-[2_1_480px]">
          <PollList />
        </div>
    </div>
  );
}

async function PollList() {
  const admin = await requireAdmin();
  const now = new Date();
  const [polls, unitCount] = await Promise.all([
    db.poll.findMany({
      where: { buildingId: admin.buildingId },
      include: { options: { orderBy: { position: "asc" }, include: { _count: { select: { votes: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    db.unit.count({ where: { buildingId: admin.buildingId } }),
  ]);
  if (polls.length === 0) return <Empty>Asnjë votim ende.</Empty>;
  return (
    <div className="flex flex-col gap-4">
      {polls.map((poll) => {
        const total = poll.options.reduce((s, o) => s + o._count.votes, 0);
        const open = poll.closesAt > now;
        return (
          <Card key={poll.id} className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              {open ? <Chip tone="solid">Votim aktiv</Chip> : <Chip>Mbyllur</Chip>}
              <span className="text-[13px] text-muted">
                {open ? "Mbyllet" : "U mbyll"} më {formatDay(poll.closesAt)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-extrabold leading-snug">{poll.question}</h2>
              {poll.description ? <p className="text-sm text-muted">{poll.description}</p> : null}
            </div>
            <div className="flex flex-col gap-3">
              {poll.options.map((option, i) => {
                const percent = total ? Math.round((option._count.votes / total) * 100) : 0;
                return (
                  <div key={option.id} className="flex flex-col gap-1.5">
                    <span className="flex justify-between text-sm font-bold">
                      <span>{option.label}</span>
                      <span>
                        {option._count.votes} vota · {percent}%
                      </span>
                    </span>
                    <Progress value={percent} tone={i === 0 ? "deep" : "mid"} className="h-2.5" label={option.label} />
                  </div>
                );
              })}
            </div>
            <span className="border-t border-line pt-3 text-[13px] font-semibold text-muted">
              {total} nga {unitCount} njësi kanë votuar{poll.ownersOnly ? " · votojnë pronarët" : ""}
            </span>
          </Card>
        );
      })}
    </div>
  );
}
