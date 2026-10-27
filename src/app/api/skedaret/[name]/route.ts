import { readFile } from "node:fs/promises";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CONTENT_TYPES, isStoredFileName, uploadPath } from "@/lib/files";

/**
 * Kush e sheh çfarë:
 * - dëshminë e pagesës: admini i hyrjes dhe banorët e asaj njësie;
 * - foton e prishjes: admini dhe kush e raportoi (ose njësia e tij);
 * - faturën e shpenzimit: të gjithë në hyrje (transparenca e arkës).
 */
async function canAccess(user: CurrentUser, name: string): Promise<boolean> {
  const isAdmin = user.role === "ADMIN";
  const [payment, ticket, expense] = await Promise.all([
    db.payment.findFirst({ where: { proofFile: name, buildingId: user.buildingId } }),
    db.ticket.findFirst({ where: { photoFile: name, buildingId: user.buildingId } }),
    db.expense.findFirst({ where: { receiptFile: name, buildingId: user.buildingId } }),
  ]);
  if (expense) return true;
  if (payment) return isAdmin || payment.unitId === user.unitId;
  if (ticket) return isAdmin || ticket.reporterId === user.id || (!!user.unitId && ticket.unitId === user.unitId);
  return false;
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Duhet të hysh në llogari.", { status: 401 });
  if (!isStoredFileName(name) || !(await canAccess(user, name))) {
    return new Response("Skedari nuk u gjet.", { status: 404 });
  }
  try {
    const data = await readFile(uploadPath(name));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[name.split(".").pop()!],
        // Pa cache: në një pajisje të përbashkët, skedari nuk duhet të mbetet pas daljes nga llogaria.
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response("Skedari nuk u gjet.", { status: 404 });
  }
}
