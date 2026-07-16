"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { parseToCents } from "@/lib/format";

export async function createCampaign(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "");
  if (!name || !clientId) return;

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: user.agencyId },
  });
  if (!client) return;

  const start = String(formData.get("startDate") ?? "");

  await prisma.campaign.create({
    data: {
      name,
      platform: (String(formData.get("platform") ?? "META") || "META") as never,
      objective: (String(formData.get("objective") ?? "TRAFFIC") || "TRAFFIC") as never,
      status: (String(formData.get("status") ?? "DRAFT") || "DRAFT") as never,
      budgetCents: parseToCents(String(formData.get("budget") ?? "")),
      startDate: start ? new Date(start) : null,
      agencyId: user.agencyId,
      clientId,
    },
  });

  revalidatePath("/midia");
}

/**
 * Atualiza métricas da campanha (investido, impressões, cliques, conversões).
 * Em produção estes valores seriam sincronizados via API do Meta/Google Ads.
 */
export async function updateMetrics(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const campaign = await prisma.campaign.findFirst({
    where: { id, agencyId: user.agencyId },
  });
  if (!campaign) return;

  await prisma.campaign.update({
    where: { id },
    data: {
      status: (String(formData.get("status") ?? campaign.status)) as never,
      spentCents: parseToCents(String(formData.get("spent") ?? "")),
      impressions: Number(formData.get("impressions")) || 0,
      clicks: Number(formData.get("clicks")) || 0,
      conversions: Number(formData.get("conversions")) || 0,
    },
  });

  revalidatePath("/midia");
}
