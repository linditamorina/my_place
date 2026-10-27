import {
  ArrowUpDown,
  DoorOpen,
  Droplet,
  Hammer,
  Lightbulb,
  Receipt,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

const TICKET_ICONS: Record<string, LucideIcon> = {
  ASHENSORI: ArrowUpDown,
  DRITA: Lightbulb,
  UJI: Droplet,
  PASTRIMI: Sparkles,
  DERA: DoorOpen,
  TJETER: Wrench,
};

const EXPENSE_ICONS: Record<string, LucideIcon> = {
  PASTRIMI: Sparkles,
  RRYMA: Zap,
  ASHENSORI: ArrowUpDown,
  RIPARIME: Hammer,
  TJETER: Receipt,
};

export function TicketIcon({ category, className = "size-5" }: { category: string; className?: string }) {
  const Icon = TICKET_ICONS[category] ?? Wrench;
  return <Icon className={className} strokeWidth={1.8} aria-hidden="true" />;
}

export function ExpenseIcon({ category, className = "size-5" }: { category: string; className?: string }) {
  const Icon = EXPENSE_ICONS[category] ?? Receipt;
  return <Icon className={className} strokeWidth={1.8} aria-hidden="true" />;
}
