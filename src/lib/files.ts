import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Skedarët ruhen jashtë /public dhe shërbehen vetëm përmes /api/skedaret me kontroll qasjeje.
// UPLOAD_DIR lejon një dosje tjetër, p.sh. për testet end-to-end.
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "storage", "uploads");

const MAX_BYTES = 5 * 1024 * 1024;

// SVG nuk pranohet nga përdoruesit (mund të përmbajë skripte); vetëm seed-i krijon SVG.
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  svg: "image/svg+xml",
};

export function isStoredFileName(name: string): boolean {
  return /^[a-f0-9]{32}\.(jpg|png|webp|pdf|svg)$/.test(name);
}

/** Shtegu i skedarit në disk. Dosja vendoset në kohë ekzekutimi, prandaj bundler-i nuk duhet ta gjurmojë. */
export function uploadPath(name: string): string {
  return path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name);
}

export function fileUrl(name: string): string {
  return `/api/skedaret/${name}`;
}

type SaveResult = { ok: true; name: string | null } | { ok: false; error: string };

/** Ruan skedarin e ngarkuar; një fushë bosh kthen name: null. */
export async function saveUpload(value: FormDataEntryValue | null): Promise<SaveResult> {
  if (!(value instanceof File) || value.size === 0) return { ok: true, name: null };
  const ext = ALLOWED[value.type];
  if (!ext) return { ok: false, error: "Lejohen vetëm foto (JPG, PNG, WebP) ose PDF." };
  if (value.size > MAX_BYTES) return { ok: false, error: "Skedari është më i madh se 5 MB." };
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(uploadPath(name), Buffer.from(await value.arrayBuffer()));
  return { ok: true, name };
}
