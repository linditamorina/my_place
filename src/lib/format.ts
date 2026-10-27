// Formatimi në mënyrën e Kosovës: 1.240,50 € dhe "27 tetor 2026".

export const MONTHS = [
  "janar",
  "shkurt",
  "mars",
  "prill",
  "maj",
  "qershor",
  "korrik",
  "gusht",
  "shtator",
  "tetor",
  "nëntor",
  "dhjetor",
];

const WEEKDAYS = ["E diel", "E hënë", "E martë", "E mërkurë", "E enjte", "E premte", "E shtunë"];

export function euro(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = (abs % 100).toString().padStart(2, "0");
  return `${sign}${whole},${decimals} €`;
}

/** Pranon "25", "25,50", "25.50" ose "1.240,50" dhe kthen centë; null kur s'është shumë e vlefshme. */
export function parseEuro(input: string): number | null {
  let value = input.replace(/[€\s]/g, "");
  if (value.includes(",")) {
    value = value.replace(/\./g, "").replace(",", ".");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const cents = Math.round(parseFloat(value) * 100);
  return cents > 0 ? cents : null;
}

export function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDay(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatWeekday(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${formatDay(date)}`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "sot, 09:14", "dje, 18:40", "3 ditë më parë" ose data e plotë. */
export function formatRelative(date: Date, now = new Date()): string {
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) return `sot, ${formatTime(date)}`;
  if (days === 1) return `dje, ${formatTime(date)}`;
  if (days < 7) return `${days} ditë më parë`;
  return formatDay(date);
}

// Periudhat e faturimit ruhen si "2026-10".

export function periodOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function shiftPeriod(period: string, months: number): string {
  const [year, month] = period.split("-").map(Number);
  return periodOf(new Date(year, month - 1 + months, 1));
}

export function periodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

export function periodMonth(period: string): string {
  return MONTHS[Number(period.split("-")[1]) - 1];
}

/** Trajta e gjinores: "e tetorit", "e korrikut". */
export function periodGenitive(period: string): string {
  const month = periodMonth(period);
  return month === "korrik" ? "korrikut" : `${month}it`;
}

export function monthlyInvoiceTitle(period: string): string {
  return `Fatura e ${periodGenitive(period)}`;
}

/** Afati i pagesës: data 10 e muajit pas periudhës. */
export function dueDateFor(period: string): Date {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month, 10, 23, 59);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function receiptNumber(no: number): string {
  return `#${no.toString().padStart(4, "0")}`;
}
