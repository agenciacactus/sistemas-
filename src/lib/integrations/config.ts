// Configuração de OAuth por provedor de integração.
// As credenciais (client id/secret) vêm de variáveis de ambiente — enquanto não
// estiverem definidas, o provedor aparece como "não configurado" na tela.

export type Provider = "META_ADS" | "GOOGLE_ADS" | "GA4";

export type ProviderConfig = {
  label: string;
  description: string;
  icon: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  docsUrl: string;
};

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  META_ADS: {
    label: "Meta Ads",
    description: "Facebook e Instagram Ads — importa campanhas, investimento e conversões.",
    icon: "📘",
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: "ads_read",
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
    docsUrl: "https://developers.facebook.com/docs/marketing-apis",
  },
  GOOGLE_ADS: {
    label: "Google Ads",
    description: "Campanhas de tráfego pago do Google — métricas e custos.",
    icon: "🔍",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/adwords",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    docsUrl: "https://developers.google.com/google-ads/api/docs/start",
  },
  GA4: {
    label: "Google Analytics 4",
    description: "Sessões, usuários e conversões do site por canal.",
    icon: "📊",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1",
  },
};

export const PROVIDER_ORDER: Provider[] = ["META_ADS", "GOOGLE_ADS", "GA4"];

export function isProvider(v: string): v is Provider {
  return v === "META_ADS" || v === "GOOGLE_ADS" || v === "GA4";
}

/** O provedor tem client id/secret configurados no ambiente? */
export function isConfigured(provider: Provider): boolean {
  const cfg = PROVIDERS[provider];
  return Boolean(process.env[cfg.clientIdEnv] && process.env[cfg.clientSecretEnv]);
}

export function callbackPath(provider: Provider): string {
  return `/api/integrations/${provider}/callback`;
}

/** Monta a URL de consentimento OAuth para redirecionar o usuário. */
export function buildAuthorizeUrl(
  provider: Provider,
  origin: string,
  state: string,
): string {
  const cfg = PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: process.env[cfg.clientIdEnv] ?? "",
    redirect_uri: `${origin}${callbackPath(provider)}`,
    response_type: "code",
    scope: cfg.scope,
    state,
    access_type: "offline", // Google: retorna refresh_token
    prompt: "consent",
  });
  return `${cfg.authorizeUrl}?${params.toString()}`;
}
