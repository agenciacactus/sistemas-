"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Ações do portal público. A autorização é feita pelo token do cliente:
// o entregável precisa pertencer ao cliente dono daquele token.

async function loadDeliverable(token: string, deliverableId: string) {
  const client = await prisma.client.findUnique({ where: { portalToken: token } });
  if (!client) return null;
  const deliverable = await prisma.deliverable.findFirst({
    where: { id: deliverableId, clientId: client.id },
  });
  return deliverable;
}

export async function approve(token: string, formData: FormData) {
  const deliverableId = String(formData.get("deliverableId") ?? "");
  const deliverable = await loadDeliverable(token, deliverableId);
  if (!deliverable) return;

  await prisma.deliverable.update({
    where: { id: deliverable.id },
    data: {
      approval: "APPROVED",
      status: "DELIVERED",
      reviewedAt: new Date(),
      clientNote: null,
    },
  });

  revalidatePath(`/portal/${token}`);
}

export async function requestChanges(token: string, formData: FormData) {
  const deliverableId = String(formData.get("deliverableId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const deliverable = await loadDeliverable(token, deliverableId);
  if (!deliverable) return;

  await prisma.deliverable.update({
    where: { id: deliverable.id },
    data: {
      approval: "CHANGES_REQUESTED",
      // volta para produção para o time ajustar
      status: "IN_PRODUCTION",
      reviewedAt: new Date(),
      clientNote: note || "Ajustes solicitados.",
    },
  });

  revalidatePath(`/portal/${token}`);
}
