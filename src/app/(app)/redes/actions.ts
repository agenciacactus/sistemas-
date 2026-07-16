"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";

export async function createAccount(formData: FormData) {
  const user = await requireUser();

  const handle = String(formData.get("handle") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "");
  if (!handle || !clientId) return;

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: user.agencyId },
  });
  if (!client) return;

  await prisma.socialAccount.create({
    data: {
      platform: (String(formData.get("platform") ?? "INSTAGRAM") || "INSTAGRAM") as never,
      handle: handle.startsWith("@") ? handle : `@${handle}`,
      // Numa integração real, aqui inicia o fluxo OAuth com a plataforma.
      connected: formData.get("connected") === "on",
      agencyId: user.agencyId,
      clientId,
    },
  });

  revalidatePath("/redes");
}

export async function createPost(formData: FormData) {
  const user = await requireUser();

  const caption = String(formData.get("caption") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "");
  if (!caption || !accountId) return;

  const account = await prisma.socialAccount.findFirst({
    where: { id: accountId, agencyId: user.agencyId },
  });
  if (!account) return;

  const scheduledAt = String(formData.get("scheduledAt") ?? "");
  const hasSchedule = scheduledAt !== "";

  await prisma.socialPost.create({
    data: {
      caption,
      mediaUrl: strOrNull(formData.get("mediaUrl")),
      status: hasSchedule ? "SCHEDULED" : "DRAFT",
      scheduledAt: hasSchedule ? new Date(scheduledAt) : null,
      agencyId: user.agencyId,
      accountId,
    },
  });

  revalidatePath("/redes");
}

export async function setPostStatus(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  const post = await prisma.socialPost.findFirst({
    where: { id, agencyId: user.agencyId },
  });
  if (!post) return;

  // Em produção, "PUBLISHED" dispararia a chamada à API da rede social.
  await prisma.socialPost.update({
    where: { id },
    data: {
      status: status as never,
      publishedAt: status === "PUBLISHED" ? new Date() : post.publishedAt,
    },
  });

  revalidatePath("/redes");
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
