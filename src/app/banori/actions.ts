"use server";

import { refresh } from "next/cache";
import type { FormState } from "@/components/client";
import { audit } from "@/lib/audit";
import { requireResident } from "@/lib/auth";
import { TICKET_CATEGORY, isKey, unitLabel } from "@/lib/constants";
import { db } from "@/lib/db";
import { saveUpload } from "@/lib/files";
import { invoiceState } from "@/lib/finance";
import { euro } from "@/lib/format";

export async function uploadProof(invoiceId: string, _: FormState, formData: FormData): Promise<FormState> {
  const resident = await requireResident();
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, unitId: resident.unit.id },
    include: { payments: true },
  });
  if (!invoice) return { error: "Fatura nuk u gjet." };
  const state = invoiceState(invoice);
  if (state.status === "PAGUAR") return { error: "Kjo faturë është paguar tashmë." };
  if (state.status === "NE_PRITJE") return { error: "Dëshmia për këtë faturë është në pritje të aprovimit." };

  const upload = await saveUpload(formData.get("proof"));
  if (!upload.ok) return { error: upload.error };
  if (!upload.name) return { error: "Zgjidh foton ose screenshot-in e pagesës." };

  await db.payment.create({
    data: {
      buildingId: resident.buildingId,
      unitId: resident.unit.id,
      invoiceId: invoice.id,
      amountCents: state.remainingCents,
      method: "BANKE",
      status: "NE_PRITJE",
      proofFile: upload.name,
    },
  });
  await audit(
    resident.buildingId,
    resident.id,
    `${resident.name} ngarkoi dëshminë e pagesës ${euro(state.remainingCents)} për ${unitLabel(resident.unit)}.`,
  );
  refresh();
  return { success: "Dëshmia u dërgua. Do ta shohësh dëftesën sapo admini ta aprovojë." };
}

export async function reportTicket(_: FormState, formData: FormData): Promise<FormState> {
  const resident = await requireResident();
  const category = String(formData.get("category") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  if (!isKey(TICKET_CATEGORY, category)) return { error: "Zgjidh çka është prishur." };
  if (description.length < 5) return { error: "Përshkruaje shkurt problemin." };

  const upload = await saveUpload(formData.get("photo"));
  if (!upload.ok) return { error: upload.error };

  await db.ticket.create({
    data: {
      buildingId: resident.buildingId,
      unitId: resident.unit.id,
      reporterId: resident.id,
      category,
      description,
      photoFile: upload.name,
      status: "E_RE",
    },
  });
  await audit(
    resident.buildingId,
    resident.id,
    `${resident.name} raportoi prishje: ${TICKET_CATEGORY[category].toLowerCase()}.`,
  );
  refresh();
  return { success: "Raporti u dërgua te admini. Statusin e ndjek këtu poshtë." };
}

export async function markNoticeRead(formData: FormData): Promise<void> {
  const resident = await requireResident();
  const notice = await db.notice.findFirst({
    where: {
      id: String(formData.get("noticeId") ?? ""),
      buildingId: resident.buildingId,
      OR: [{ unitId: null }, { unitId: resident.unit.id }],
    },
  });
  if (!notice) return;
  await db.noticeRead.upsert({
    where: { noticeId_userId: { noticeId: notice.id, userId: resident.id } },
    create: { noticeId: notice.id, userId: resident.id },
    update: {},
  });
  refresh();
}

export async function castVote(pollId: string, _: FormState, formData: FormData): Promise<FormState> {
  const resident = await requireResident();
  const poll = await db.poll.findFirst({
    where: { id: pollId, buildingId: resident.buildingId },
    include: { options: true },
  });
  if (!poll) return { error: "Votimi nuk u gjet." };
  if (poll.closesAt <= new Date()) return { error: "Ky votim është mbyllur." };
  if (poll.ownersOnly && !resident.isOwner) return { error: "Në këtë votim votojnë vetëm pronarët." };
  const option = poll.options.find((o) => o.id === formData.get("optionId"));
  if (!option) return { error: "Zgjidh një përgjigje." };

  // Një votë për njësi: kufizimi unik në databazë e garanton edhe kur dy banorë votojnë njëkohësisht.
  const existing = await db.vote.findUnique({ where: { pollId_unitId: { pollId, unitId: resident.unit.id } } });
  if (existing) return { error: "Njësia jote ka votuar tashmë në këtë votim." };
  try {
    await db.vote.create({
      data: { pollId, optionId: option.id, unitId: resident.unit.id, userId: resident.id },
    });
  } catch {
    return { error: "Njësia jote ka votuar tashmë në këtë votim." };
  }
  refresh();
  return { success: "Vota jote u regjistrua." };
}
