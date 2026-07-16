"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";

export async function createClient(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.client.create({
    data: {
      name,
      segment: strOrNull(formData.get("segment")),
      contact: strOrNull(formData.get("contact")),
      email: strOrNull(formData.get("email")),
      phone: strOrNull(formData.get("phone")),
      status: (String(formData.get("status") ?? "ACTIVE") || "ACTIVE") as never,
      agencyId: user.agencyId,
    },
  });

  revalidatePath("/clientes");
}

export async function generatePortalToken(formData: FormData) {
  const user = await requireUser();
  const clientId = String(formData.get("clientId") ?? "");

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: user.agencyId },
  });
  if (!client) return;

  await prisma.client.update({
    where: { id: clientId },
    data: { portalToken: randomBytes(12).toString("hex") },
  });

  revalidatePath(`/clientes/${clientId}`);
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
