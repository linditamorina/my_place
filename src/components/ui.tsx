import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { INVOICE_STATUS_LABEL, TICKET_STATUS, isKey, type InvoiceStatus } from "@/lib/constants";

// Klasat e përbashkëta. Butoni kryesor është gjithmonë i thellë; i dyti i çelët ose i bardhë.
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-[14px] font-bold transition disabled:cursor-not-allowed disabled:opacity-60";

export const btn = {
  primary: `${btnBase} h-12 px-5 text-[15px] bg-deep text-white hover:bg-deep/90`,
  soft: `${btnBase} h-12 px-5 text-[15px] bg-soft text-deep hover:bg-soft/70`,
  white: `${btnBase} h-12 px-5 text-[15px] bg-white text-deep hover:bg-white/80`,
  smallPrimary: `${btnBase} h-10 px-4 text-sm rounded-xl bg-deep text-white hover:bg-deep/90`,
  smallSoft: `${btnBase} h-10 px-4 text-sm rounded-xl bg-soft text-deep hover:bg-soft/70`,
  smallOutline: `${btnBase} h-10 px-4 text-sm rounded-xl border-[1.5px] border-line bg-white text-deep hover:border-mid`,
  icon: `${btnBase} size-11 rounded-xl border border-line bg-white text-deep hover:border-mid`,
};

export const field = {
  label: "text-sm font-bold",
  input:
    "h-12 w-full rounded-[14px] border-[1.5px] border-line bg-white px-4 text-[15px] text-deep outline-none transition focus:border-mid",
  textarea:
    "w-full resize-none rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-[15px] leading-relaxed text-deep outline-none transition focus:border-mid",
  hint: "text-[13px] text-muted",
};

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[20px] bg-white p-5 ${className}`}>{children}</section>;
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 pb-3">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {action}
    </div>
  );
}

type ChipTone = "outline" | "soft" | "white" | "solid";

const chipTone: Record<ChipTone, string> = {
  outline: "border-[1.5px] border-mid px-[9px] py-[3px]",
  soft: "bg-soft px-2.5 py-1",
  white: "bg-white px-2.5 py-1",
  solid: "bg-deep px-2.5 py-1 text-white",
};

export function Chip({ tone = "soft", children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full text-xs font-bold ${chipTone[tone]}`}
    >
      {children}
    </span>
  );
}

export function InvoiceStatusChip({ status, onSoft = false }: { status: InvoiceStatus; onSoft?: boolean }) {
  if (status === "PAGUAR") {
    return (
      <Chip tone="solid">
        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
        {INVOICE_STATUS_LABEL.PAGUAR}
      </Chip>
    );
  }
  if (status === "NE_PRITJE") return <Chip tone={onSoft ? "white" : "soft"}>{INVOICE_STATUS_LABEL.NE_PRITJE}</Chip>;
  return <Chip tone="outline">{INVOICE_STATUS_LABEL.PAPAGUAR}</Chip>;
}

export function TicketStatusChip({ status, onSoft = false }: { status: string; onSoft?: boolean }) {
  const label = isKey(TICKET_STATUS, status) ? TICKET_STATUS[status] : status;
  if (status === "E_RE") return <Chip tone="outline">{label}</Chip>;
  if (status === "KRYER") {
    return (
      <Chip tone="solid">
        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
        {label}
      </Chip>
    );
  }
  return <Chip tone={onSoft ? "white" : "soft"}>{label}</Chip>;
}

export function Progress({
  value,
  tone = "mid",
  track = "soft",
  className = "h-2",
  label,
}: {
  value: number;
  tone?: "mid" | "deep";
  track?: "soft" | "white" | "dark";
  className?: string;
  label: string;
}) {
  const percent = Math.max(0, Math.min(100, value));
  const trackClass = track === "soft" ? "bg-soft" : track === "white" ? "bg-white" : "bg-white/15";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`overflow-hidden rounded-full ${trackClass} ${className}`}
    >
      <div
        className={`h-full rounded-full ${tone === "mid" ? "bg-mid" : "bg-deep"}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function IconTile({ children, tone = "soft" }: { children: ReactNode; tone?: "soft" | "white" }) {
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone === "soft" ? "bg-soft" : "bg-white"}`}
    >
      {children}
    </span>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        {subtitle ? <span className="text-sm font-semibold text-muted">{subtitle}</span> : null}
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-soft px-4 py-6 text-center text-sm font-semibold text-muted">{children}</p>;
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl border-[1.5px] border-deep px-3 py-2 text-sm font-semibold">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-xl bg-soft px-3 py-2 text-sm font-semibold">
        <Check className="size-4" strokeWidth={2.6} aria-hidden="true" />
        {success}
      </p>
    );
  }
  return null;
}

/** Skeleti që shfaqet sa të vijnë të dhënat. */
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-28 rounded-[20px] bg-white/70" />
      ))}
    </div>
  );
}
