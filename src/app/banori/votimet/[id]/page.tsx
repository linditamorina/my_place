import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Check, Clock, House } from "lucide-react";
import { ActionForm } from "@/components/client";
import { Screen, TopBar } from "@/components/resident";
import { btn, Chip, Progress, Skeleton } from "@/components/ui";
import { requireResident } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDay } from "@/lib/format";
import { castVote } from "../../actions";

export const metadata: Metadata = { title: "Votimi" };

export default function PollPage({ params }: PageProps<"/banori/votimet/[id]">) {
  return (
    <Screen>
      <TopBar title="Votimi" back="/banori/votimet" />
      <Suspense fallback={<Skeleton rows={2} />}>
        <Poll params={params} />
      </Suspense>
    </Screen>
  );
}

async function Poll({ params }: { params: PageProps<"/banori/votimet/[id]">["params"] }) {
  const resident = await requireResident();
  const { id } = await params;
  const now = new Date();
  const [poll, unitCount] = await Promise.all([
    db.poll.findFirst({
      where: { id, buildingId: resident.buildingId },
      include: {
        options: { orderBy: { position: "asc" }, include: { _count: { select: { votes: true } } } },
        votes: { where: { unitId: resident.unit.id }, select: { optionId: true } },
      },
    }),
    db.unit.count({ where: { buildingId: resident.buildingId } }),
  ]);
  if (!poll) notFound();

  const open = poll.closesAt > now;
  const myVote = poll.votes[0]?.optionId;
  const canVote = open && !myVote && (!poll.ownersOnly || resident.isOwner);
  const total = poll.options.reduce((s, o) => s + o._count.votes, 0);

  return (
    <>
      <section className="flex flex-col gap-3.5 rounded-3xl bg-white p-[22px]">
        <div className="flex items-center justify-between gap-2.5">
          {open ? <Chip tone="solid">Votim aktiv</Chip> : <Chip>Mbyllur</Chip>}
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
            <Clock className="size-[15px]" strokeWidth={1.8} aria-hidden="true" />
            {open ? "Mbyllet" : "U mbyll"} më {formatDay(poll.closesAt)}
          </span>
        </div>
        <h2 className="text-[22px] font-extrabold leading-tight tracking-tight">{poll.question}</h2>
        {poll.description ? <p className="text-[15px] leading-relaxed text-muted">{poll.description}</p> : null}
        <span className="flex items-center gap-2 rounded-xl bg-soft px-3 py-2.5 text-[13px] font-semibold">
          <House className="size-4" strokeWidth={1.8} aria-hidden="true" />1 votë për njësi
          {poll.ownersOnly ? " · votojnë pronarët" : ""}
        </span>

        {canVote ? (
          <ActionForm
            action={castVote.bind(null, poll.id)}
            submitLabel="Voto"
            pendingLabel="Duke votuar…"
            submitClassName={`${btn.primary} h-[52px] text-base`}
          >
            <fieldset className="flex flex-col gap-2.5">
              <legend className="sr-only">Përgjigjja jote</legend>
              {poll.options.map((option) => (
                <label
                  key={option.id}
                  className="flex h-[60px] cursor-pointer items-center gap-3 rounded-2xl border-2 border-line bg-white px-4 text-base font-bold transition has-[:checked]:border-deep has-[:checked]:bg-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-mid"
                >
                  <input type="radio" name="optionId" value={option.id} required className="size-5 accent-deep" />
                  {option.label}
                </label>
              ))}
            </fieldset>
          </ActionForm>
        ) : null}

        {!open || myVote ? (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            {myVote ? (
              <span className="flex items-center gap-2 text-sm font-bold">
                <Check className="size-4" strokeWidth={2.4} aria-hidden="true" />
                Vota jote: {poll.options.find((o) => o.id === myVote)?.label}
              </span>
            ) : null}
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
        ) : null}

        {open && !myVote && poll.ownersOnly && !resident.isOwner ? (
          <p className="text-sm text-muted">Në këtë votim votojnë vetëm pronarët. Rezultatet i sheh kur të mbyllet.</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-2.5 rounded-[20px] bg-white p-[18px]">
        <div className="flex justify-between gap-2.5 text-sm">
          <span className="font-bold">Kanë votuar</span>
          <span className="font-semibold text-muted">
            {total} nga {unitCount} njësi
          </span>
        </div>
        <Progress value={unitCount ? (total / unitCount) * 100 : 0} label="Pjesëmarrja" />
        {open && !myVote ? <span className="text-[13px] text-muted">Rezultatet shfaqen pasi të votosh.</span> : null}
      </section>
    </>
  );
}
