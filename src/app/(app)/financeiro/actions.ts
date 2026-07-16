"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { parseToCents } from "@/lib/format";

export async function createEntry(formData: FormData) {
  const user = await requireUser();

  const description = String(formData.get("description") ?? "").trim();
  const amount = parseToCents(String(formData.get("amount") ?? ""));
  const dueDate = String(formData.get("dueDate") ?? "");
  if (!description || amount <= 0 || !dueDate) return;

  const clientId = String(formData.get("clientId") ?? "");
  let validClientId: string | null = null;
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, agencyId: user.agencyId },
    });
    validClientId = client?.id ?? null;
  }

  await prisma.financialEntry.create({
    data: {
      description,
      type: (String(formData.get("type") ?? "RECEIVABLE") || "RECEIVABLE") as never,
      status: "PENDING",
      amountCents: amount,
      category: strOrNull(formData.get("category")),
      dueDate: new Date(dueDate),
      agencyId: user.agencyId,
      clientId: validClientId,
    },
  });

  revalidatePath("/financeiro");
}

export async function togglePaid(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const entry = await prisma.financialEntry.findFirst({
    where: { id, agencyId: user.agencyId },
  });
  if (!entry) return;

  const paying = entry.status !== "PAID";
  await prisma.financialEntry.update({
    where: { id },
    data: {
      status: paying ? "PAID" : "PENDING",
      paidAt: paying ? new Date() : null,
    },
  });

  revalidatePath("/financeiro");
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
