// Vlerat e lejuara për fushat tekstuale të databazës dhe emrat e tyre në shqip.

export const ROLE = { ADMIN: "ADMIN", RESIDENT: "RESIDENT" } as const;

export const UNIT_KIND = {
  BANESE: "Banesa",
  LOKAL: "Lokali",
} as const;
export type UnitKind = keyof typeof UNIT_KIND;

export const INVOICE_KIND = {
  MUJORE: "Mujore",
  JASHTEZAKONSHME: "E jashtëzakonshme",
} as const;

// Statusi i faturës llogaritet nga pagesat (src/lib/finance.ts), nuk ruhet në databazë.
export type InvoiceStatus = "PAGUAR" | "NE_PRITJE" | "PAPAGUAR";

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  PAGUAR: "E paguar",
  NE_PRITJE: "Në pritje",
  PAPAGUAR: "E papaguar",
};

export const PAYMENT_METHOD = {
  KESH: "Kesh",
  BANKE: "Transfer bankar",
} as const;

export const PAYMENT_STATUS = {
  NE_PRITJE: "Në pritje",
  APROVUAR: "Aprovuar",
  REFUZUAR: "Refuzuar",
} as const;

export const TICKET_CATEGORY = {
  ASHENSORI: "Ashensori",
  DRITA: "Drita",
  UJI: "Uji",
  PASTRIMI: "Pastrimi",
  DERA: "Dera",
  TJETER: "Tjetër",
} as const;
export type TicketCategory = keyof typeof TICKET_CATEGORY;

export const TICKET_STATUS = {
  E_RE: "E re",
  PARE: "Parë",
  NE_PROCES: "Në proces",
  KRYER: "E kryer",
} as const;
export type TicketStatus = keyof typeof TICKET_STATUS;
export const TICKET_FLOW: TicketStatus[] = ["E_RE", "PARE", "NE_PROCES", "KRYER"];

export const EXPENSE_CATEGORY = {
  PASTRIMI: "Pastrimi",
  RRYMA: "Rryma e përbashkët",
  ASHENSORI: "Ashensori",
  RIPARIME: "Riparime",
  TJETER: "Tjetër",
} as const;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORY;

export function isKey<T extends object>(map: T, key: unknown): key is keyof T {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(map, key);
}

export function unitLabel(unit: { kind: string; number: string }): string {
  return `${isKey(UNIT_KIND, unit.kind) ? UNIT_KIND[unit.kind] : "Njësia"} ${unit.number}`;
}

/** Përshkrimi i pagesës për m-banking, p.sh. "HA-B12-2610". */
export function paymentReference(
  prefix: string,
  unit: { kind: string; number: string },
  period: string,
  kind: string,
): string {
  const [year, month] = period.split("-");
  const unitCode = `${unit.kind === "LOKAL" ? "L" : "B"}${unit.number}`;
  const suffix = kind === "JASHTEZAKONSHME" ? "J" : "";
  return `${prefix}-${unitCode}-${year.slice(2)}${month}${suffix}`;
}
