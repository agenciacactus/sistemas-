"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { parseToCents } from "@/lib/format";

export async function createDeliverable(formData: FormData) {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "");
  if (!title || !clientId) return;

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: user.agencyId },
  });
  if (!client) return;

  const due = String(formData.get("dueDate") ?? "");

  await prisma.deliverable.create({
    data: {
      title,
      type: strOrNull(formData.get("type")),
      status: (String(formData.get("status") ?? "BRIEFING") || "BRIEFING") as never,
      priceCents: parseToCents(String(formData.get("price") ?? "")),
      dueDate: due ? new Date(due) : null,
      agencyId: user.agencyId,
      clientId,
    },
  });

  revalidatePath("/pecas");
}

export async function advanceDeliverable(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  const d = await prisma.deliverable.findFirst({
    where: { id, agencyId: user.agencyId },
  });
  if (!d) return;

  await prisma.deliverable.update({ where: { id }, data: { status: status as never } });
  revalidatePath("/pecas");
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
