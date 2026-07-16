"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { parseToCents } from "@/lib/format";

export async function createProposal(formData: FormData) {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "");
  if (!title || !clientId) return;

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: user.agencyId },
  });
  if (!client) return;

  // Itens vêm como arrays paralelos: itemDesc[], itemQty[], itemPrice[]
  const descs = formData.getAll("itemDesc").map((v) => String(v).trim());
  const qtys = formData.getAll("itemQty").map((v) => Number(v) || 1);
  const prices = formData.getAll("itemPrice").map((v) => parseToCents(String(v)));

  const items = descs
    .map((description, i) => ({
      description,
      quantity: qtys[i] ?? 1,
      unitCents: prices[i] ?? 0,
    }))
    .filter((it) => it.description !== "");

  const totalCents = items.reduce((s, it) => s + it.quantity * it.unitCents, 0);

  const count = await prisma.proposal.count({ where: { agencyId: user.agencyId } });
  const number = `PROP-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  const validUntilRaw = String(formData.get("validUntil") ?? "");
  const monthsRaw = String(formData.get("months") ?? "");

  const proposal = await prisma.proposal.create({
    data: {
      number,
      title,
      type: (String(formData.get("type") ?? "FEE_MENSAL") || "FEE_MENSAL") as never,
      status: "DRAFT",
      totalCents,
      months: monthsRaw ? Number(monthsRaw) : null,
      validUntil: validUntilRaw ? new Date(validUntilRaw) : null,
      notes: strOrNull(formData.get("notes")),
      agencyId: user.agencyId,
      clientId,
      createdById: user.id,
      items: { create: items },
    },
  });

  redirect(`/propostas/${proposal.id}`);
}

export async function setProposalStatus(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  const proposal = await prisma.proposal.findFirst({
    where: { id, agencyId: user.agencyId },
  });
  if (!proposal) return;

  await prisma.proposal.update({
    where: { id },
    data: { status: status as never },
  });

  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
