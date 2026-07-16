"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";

export async function createProject(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "");
  if (!name || !clientId) return;

  // Garante que o cliente é da agência do usuário
  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: user.agencyId },
  });
  if (!client) return;

  const start = String(formData.get("startDate") ?? "");

  await prisma.project.create({
    data: {
      name,
      description: strOrNull(formData.get("description")),
      status: (String(formData.get("status") ?? "ACTIVE") || "ACTIVE") as never,
      startDate: start ? new Date(start) : null,
      agencyId: user.agencyId,
      clientId,
    },
  });

  revalidatePath("/projetos");
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
