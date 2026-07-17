"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";

export async function createSupplier(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.supplier.create({
    data: {
      name,
      cnpj: strOrNull(formData.get("cnpj")),
      category: (String(formData.get("category") ?? "OUTRO") || "OUTRO") as never,
      contact: strOrNull(formData.get("contact")),
      email: strOrNull(formData.get("email")),
      phone: strOrNull(formData.get("phone")),
      city: strOrNull(formData.get("city")),
      notes: strOrNull(formData.get("notes")),
      agencyId: user.agencyId,
    },
  });

  revalidatePath("/fornecedores");
}

export async function toggleSupplier(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const supplier = await prisma.supplier.findFirst({
    where: { id, agencyId: user.agencyId },
  });
  if (!supplier) return;

  await prisma.supplier.update({
    where: { id },
    data: { active: !supplier.active },
  });

  revalidatePath("/fornecedores");
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
