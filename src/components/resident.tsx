import { Check, ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { TICKET_FLOW, TICKET_STATUS } from "@/lib/constants";

/** Shiriti i sipërm i nënfaqeve: kthehu, titulli. */
export function TopBar({ title, back }: { title: string; back: string }) {
  return (
    <div className="flex items-center justify-between gap-3 print:hidden">
      <Link
        href={back}
        aria-label="Kthehu"
        className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-white"
      >
        <ChevronLeft className="size-5" strokeWidth={2} aria-hidden="true" />
      </Link>
      <h1 className="truncate text-[17px] font-extrabold">{title}</h1>
      <span className="size-11 shrink-0" aria-hidden="true" />
    </div>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 px-5 pt-6">{children}</div>;
}

/** Ecuria e një prishjeje: Dërguar → Parë → Në proces → Kryer. */
export function TicketTracker({ status }: { status: string }) {
  const current = Math.max(0, TICKET_FLOW.indexOf(status as (typeof TICKET_FLOW)[number]));
  const labels = ["Dërguar", "Parë", TICKET_STATUS.NE_PROCES, "Kryer"];
  return (
    <ol className="relative grid grid-cols-4" aria-label={`Statusi: ${labels[current]}`}>
      <span aria-hidden="true" className="absolute top-3 left-[12.5%] h-[3px] w-3/4 rounded-full bg-soft" />
      <span
        aria-hidden="true"
        className="absolute top-3 left-[12.5%] h-[3px] rounded-full bg-deep"
        style={{ width: `${(current / 3) * 75}%` }}
      />
      {labels.map((label, i) => {
        // "Në proces" është i vetmi hap që zgjat; të tjerët shënohen të kryer sapo arrihen.
        const isCurrent = i === current && current === 2;
        const done = i <= current && !isCurrent;
        return (
          <li key={label} className="relative flex flex-col items-center gap-1.5" aria-current={isCurrent ? "step" : undefined}>
            {done ? (
              <span className="flex size-[26px] items-center justify-center rounded-full bg-deep text-white">
                <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
              </span>
            ) : isCurrent ? (
              <span className="flex size-[26px] items-center justify-center rounded-full border-[3px] border-deep bg-white">
                <span className="size-2 rounded-full bg-mid" />
              </span>
            ) : (
              <span className="size-[26px] rounded-full bg-soft" />
            )}
            <span className={`text-xs ${i <= current ? "font-bold" : "font-semibold text-muted"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
