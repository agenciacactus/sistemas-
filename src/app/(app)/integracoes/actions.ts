"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session-guard";
import { isProvider } from "@/lib/integrations/config";
import { syncIntegration } from "@/lib/integrations/sync";

export async function syncAction(formData: FormData) {
  const user = await requireUser();
  const provider = String(formData.get("provider") ?? "");
  if (!isProvider(provider)) return;

  const result = await syncIntegration(user.agencyId, provider);
  const q = new URLSearchParams({
    sync: provider,
    ok: result.ok ? "1" : "0",
    msg: result.message,
  });
  redirect(`/integracoes?${q.toString()}`);
}

export async function disconnectAction(formData: FormData) {
  const user = await requireUser();
  const provider = String(formData.get("provider") ?? "");
  if (!isProvider(provider)) return;

  const { prisma } = await import("@/lib/prisma");
  await prisma.integration.updateMany({
    where: { agencyId: user.agencyId, provider },
    data: {
      status: "DISCONNECTED",
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      lastError: null,
    },
  });
  redirect(`/integracoes?desconectado=${provider}`);
}
