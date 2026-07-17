import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProvider } from "@/lib/integrations/config";
import { exchangeCodeForToken } from "@/lib/integrations/oauth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const origin = request.nextUrl.origin;
  const back = (q: string) => NextResponse.redirect(new URL(`/integracoes?${q}`, origin));

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));
  if (!isProvider(provider)) return back("erro=provider_invalido");

  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return back(`erro=${encodeURIComponent(oauthError)}`);
  if (!code) return back("erro=sem_code");

  // valida o state contra o cookie definido no /connect
  const cookieState = request.cookies.get(`oauth_state_${provider}`)?.value;
  if (!state || !cookieState || state !== cookieState) {
    return back("erro=state_invalido");
  }

  try {
    const token = await exchangeCodeForToken(provider, origin, code);

    // conexão em nível de agência (clientId nulo)
    const existing = await prisma.integration.findFirst({
      where: { agencyId: user.agencyId, provider, clientId: null },
    });

    const data = {
      status: "CONNECTED" as const,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      scope: token.scope,
      lastError: null,
    };

    if (existing) {
      await prisma.integration.update({ where: { id: existing.id }, data });
    } else {
      await prisma.integration.create({
        data: { ...data, provider, agencyId: user.agencyId },
      });
    }

    const res = back(`conectado=${provider}`);
    res.cookies.delete(`oauth_state_${provider}`);
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro_desconhecido";
    return back(`erro=${encodeURIComponent(msg)}`);
  }
}
