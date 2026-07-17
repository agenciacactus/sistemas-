"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";

export async function setProductionOrderStatus(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  const order = await prisma.productionOrder.findFirst({
    where: { id, agencyId: user.agencyId },
  });
  if (!order) return;

  await prisma.productionOrder.update({
    where: { id },
    data: { status: status as never },
  });

  revalidatePath(`/producao/${id}`);
  revalidatePath("/producao");
}
