"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { parseToCents } from "@/lib/format";

export async function logTime(formData: FormData) {
  const user = await requireUser();

  const userId = String(formData.get("userId") ?? "");
  const clientId = String(formData.get("clientId") ?? "");
  const hours = Number(String(formData.get("hours") ?? "").replace(",", "."));
  if (!userId || !clientId || !hours || hours <= 0) return;

  // valida colaborador e cliente na agência do usuário
  const [collaborator, client] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId, agencyId: user.agencyId } }),
    prisma.client.findFirst({ where: { id: clientId, agencyId: user.agencyId } }),
  ]);
  if (!collaborator || !client) return;

  const projectId = String(formData.get("projectId") ?? "");
  let validProjectId: string | null = null;
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, agencyId: user.agencyId, clientId },
    });
    validProjectId = project?.id ?? null;
  }

  const dateRaw = String(formData.get("date") ?? "");

  await prisma.timeEntry.create({
    data: {
      date: dateRaw ? new Date(dateRaw) : new Date(),
      hours,
      description: strOrNull(formData.get("description")),
      // congela o custo no momento do apontamento
      costCents: Math.round(hours * collaborator.hourlyCostCents),
      agencyId: user.agencyId,
      userId,
      clientId,
      projectId: validProjectId,
    },
  });

  revalidatePath("/rentabilidade");
}

export async function setHourlyCost(formData: FormData) {
  const user = await requireUser();
  const userId = String(formData.get("userId") ?? "");

  const collaborator = await prisma.user.findFirst({
    where: { id: userId, agencyId: user.agencyId },
  });
  if (!collaborator) return;

  await prisma.user.update({
    where: { id: userId },
    data: { hourlyCostCents: parseToCents(String(formData.get("hourlyCost") ?? "")) },
  });

  revalidatePath("/rentabilidade");
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
