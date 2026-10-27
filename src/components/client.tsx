"use client";

import { Camera, Check, Copy, FileText, Printer, Upload } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { FormMessage } from "./ui";

export type FormState = { error?: string; success?: string };

/** Formular me mesazh gabimi/suksesi nga një Server Action që kthen FormState. */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Duke ruajtur…",
  className = "flex flex-col gap-4",
  submitClassName,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel: ReactNode;
  pendingLabel?: string;
  className?: string;
  submitClassName: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      <FormMessage error={state.error} success={state.success} />
      <button type="submit" disabled={pending} className={submitClassName}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}

/** Butoni i formularit që çaktivizohet gjatë dërgimit. */
export function SubmitButton({
  children,
  pendingText,
  className,
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: string;
  className: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={className}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "U kopjua" : label}
      className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-bold"
    >
      {copied ? (
        <>
          <Check className="size-4" strokeWidth={2.6} aria-hidden="true" />
          U kopjua
        </>
      ) : (
        <Copy className="size-[18px]" aria-hidden="true" />
      )}
    </button>
  );
}

const FILE_ICONS = { camera: Camera, upload: Upload, file: FileText };

/** Zgjedhja e skedarit me tekst në shqip, në vend të butonit "Choose File" të shfletuesit. */
export function FileField({
  id,
  name,
  accept,
  title,
  hint,
  icon = "upload",
  capture,
  required,
}: {
  id: string;
  name: string;
  accept: string;
  title: string;
  hint: string;
  icon?: keyof typeof FILE_ICONS;
  capture?: "environment" | "user";
  required?: boolean;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = FILE_ICONS[icon];

  // Kur formulari pastrohet pas dërgimit, pastrohet edhe emri i skedarit.
  useEffect(() => {
    const form = inputRef.current?.form;
    const clear = () => setFileName(null);
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  }, []);

  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer flex-col items-center gap-2 rounded-[18px] border-2 border-dashed border-mid bg-white px-4 py-5 text-center transition hover:bg-soft/40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-mid"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-soft">
        {fileName ? (
          <Check className="size-5" strokeWidth={2.4} aria-hidden="true" />
        ) : (
          <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
        )}
      </span>
      <span className="max-w-full truncate text-sm font-bold">{fileName ?? title}</span>
      <span className="text-xs text-muted">{fileName ? "Kliko për ta ndërruar" : hint}</span>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        capture={capture}
        required={required}
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
        className="sr-only"
      />
    </label>
  );
}

export function PrintButton({ label = "Printo", className }: { label?: string; className: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <Printer className="size-[18px]" aria-hidden="true" />
      {label}
    </button>
  );
}
