"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { isKey } from "@/lib/constants";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { verifyPassword } from "@/lib/password";

export type LoginState = { error?: string; email?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Shkruaj email-in dhe fjalëkalimin.", email };
  }
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Email-i ose fjalëkalimi nuk janë të saktë.", email };
  }
  await createSession(user.id);
  redirect(user.role === "ADMIN" ? "/admin" : "/banori");
}

// Hyrja me një klik ekziston vetëm kur DEMO_MODE="1" (për prezantim të projektit). Parazgjedhja është e fikur.
const DEMO_ACCOUNTS = {
  admin: "admin@myplace.test",
  banor: "drita@myplace.test",
} as const;

export async function demoLogin(formData: FormData): Promise<void> {
  const account = formData.get("account");
  // Kontrolli bëhet edhe këtu, në server: fshehja e butonave nuk mjafton.
  if (!isDemoMode() || !isKey(DEMO_ACCOUNTS, account)) redirect("/hyr");
  const user = await db.user.findUnique({ where: { email: DEMO_ACCOUNTS[account] } });
  if (!user) redirect("/hyr");
  await createSession(user.id);
  redirect(user.role === "ADMIN" ? "/admin" : "/banori");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/hyr");
}
