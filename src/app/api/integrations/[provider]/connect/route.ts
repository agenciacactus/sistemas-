import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isProvider, isConfigured, buildAuthorizeUrl } from "@/lib/integrations/config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const origin = request.nextUrl.origin;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  if (!isProvider(provider)) {
    return NextResponse.redirect(new URL("/integracoes?erro=provider_invalido", origin));
  }

  if (!isConfigured(provider)) {
    return NextResponse.redirect(new URL(`/integracoes?erro=nao_configurado`, origin));
  }

  // state protege contra CSRF; guardamos num cookie para validar no callback
  const state = randomBytes(16).toString("hex");
  const authorizeUrl = buildAuthorizeUrl(provider, origin, state);

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return res;
}
