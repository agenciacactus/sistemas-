"use server";

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

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
