import "server-only";

// Konfigurimi nga mjedisi lexohet vetëm këtu, që një vlerë që mungon të dalë menjëherë si gabim
// dhe jo në heshtje. Vlerat shembull dhe shpjegimet janë te .env.example.

const LOCAL_DATABASE_URL = "file:./prisma/dev.db";

/** Në prodhim DATABASE_URL është i detyrueshëm; pa të aplikacioni do të krijonte në heshtje një databazë të re bosh. */
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL mungon. Vendose në mjedisin e serverit (shih .env.example).");
  }
  return LOCAL_DATABASE_URL;
}

/** Hyrja me një klik pa fjalëkalim është e fikur, përveç kur DEMO_MODE="1" vendoset qartë. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE?.trim() === "1";
}
