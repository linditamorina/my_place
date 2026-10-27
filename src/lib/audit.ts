import "server-only";
import { db } from "./db";

/** Regjistri i veprimeve: çdo ndryshim me para ose status lë gjurmë që nuk fshihet nga aplikacioni. */
export async function audit(buildingId: string, userId: string | null, action: string): Promise<void> {
  await db.auditLog.create({ data: { buildingId, userId, action } });
}
