import "server-only";
import { PROVIDERS, callbackPath, type Provider } from "./config";

export type TokenResult = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
};

/** Troca o `code` do callback OAuth por tokens de acesso. */
export async function exchangeCodeForToken(
  provider: Provider,
  origin: string,
  code: string,
): Promise<TokenResult> {
  const cfg = PROVIDERS[provider];
  const clientId = process.env[cfg.clientIdEnv];
  const clientSecret = process.env[cfg.clientSecretEnv];
  if (!clientId || !clientSecret) {
    throw new Error(`Credenciais de ${cfg.label} não configuradas no servidor.`);
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: `${origin}${callbackPath(provider)}`,
  });

  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha na troca de token (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!json.access_token) {
    throw new Error("Resposta de token sem access_token.");
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    scope: json.scope ?? null,
  };
}
