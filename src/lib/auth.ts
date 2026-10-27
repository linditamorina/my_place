import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { db } from "./db";

const COOKIE_NAME = "myplace_session";
const SESSION_DAYS = 30;

// Cookie mban token-in; databaza ruan vetëm hash-in e tij.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await db.session.deleteMany({ where: { id: hashToken(token) } });
  }
  store.delete(COOKIE_NAME);
}

/** Përdoruesi i kyçur (pa hash-in e fjalëkalimit), ose null. Lexohet një herë për kërkesë. */
export const getCurrentUser = cache(async () => {
  // Sesioni dhe gjithçka pas tij (ora aktuale, të dhënat e përdoruesit) llogariten vetëm në kohën e kërkesës.
  await connection();
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: {
      user: { omit: { passwordHash: true }, include: { building: true, unit: true } },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/hyr");
  if (user.role !== "ADMIN") redirect("/banori");
  return user;
}

export async function requireResident() {
  const user = await getCurrentUser();
  if (!user) redirect("/hyr");
  if (user.role !== "RESIDENT" || !user.unit) redirect("/admin");
  return { ...user, unit: user.unit };
}

export type Resident = Awaited<ReturnType<typeof requireResident>>;
