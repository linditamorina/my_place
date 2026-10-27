"use client";

import { useActionState } from "react";
import { btn, field, FormMessage } from "@/components/ui";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={field.label}>
          Email-i
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          placeholder="emri@shembull.com"
          className={field.input}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className={field.label}>
          Fjalëkalimi
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={field.input}
        />
      </div>
      <FormMessage error={state.error} />
      <button type="submit" disabled={pending} className={btn.primary}>
        {pending ? "Duke hyrë…" : "Hyr"}
      </button>
    </form>
  );
}
