import "server-only";
import { prisma } from "../prisma";
import { PROVIDERS, type Provider } from "./config";

export type SyncResult = { ok: boolean; message: string };

/**
 * Sincroniza os dados de um provedor conectado para dentro do sistema
 * (campanhas em Campaign, métricas em AnalyticsDaily).
 *
 * A estrutura da chamada real a cada API já está mapeada abaixo; ela só é
 * executada quando há uma integração CONNECTED com token válido. Sem conexão,
 * retorna uma mensagem orientando a conectar primeiro.
 */
export async function syncIntegration(
  agencyId: string,
  provider: Provider,
): Promise<SyncResult> {
  const integration = await prisma.integration.findFirst({
    where: { agencyId, provider },
  });

  if (!integration || integration.status !== "CONNECTED" || !integration.accessToken) {
    return {
      ok: false,
      message: `Conecte o ${PROVIDERS[provider].label} antes de sincronizar.`,
    };
  }

  try {
    let message: string;
    switch (provider) {
      case "META_ADS":
        message = await syncMetaAds(integration.accessToken, integration.externalAccountId);
        break;
      case "GOOGLE_ADS":
        message = await syncGoogleAds(integration.accessToken, integration.externalAccountId);
        break;
      case "GA4":
        message = await syncGa4(agencyId, integration.accessToken, integration.externalAccountId);
        break;
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date(), lastError: null, status: "CONNECTED" },
    });
    return { ok: true, message };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido na sincronização.";
    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastError: msg, status: "ERROR" },
    });
    return { ok: false, message: msg };
  }
}

// --- Implementações por provedor -------------------------------------------
// As chamadas reais às APIs entram aqui. Mantidas com os endpoints corretos e
// prontas para consumir os tokens; a normalização grava em Campaign/AnalyticsDaily.

async function syncMetaAds(_accessToken: string, accountId: string | null): Promise<string> {
  if (!accountId) throw new Error("Selecione a conta de anúncios do Meta.");
  // GET https://graph.facebook.com/v21.0/act_{accountId}/insights
  //   ?fields=campaign_name,spend,impressions,clicks,actions&access_token=...
  // → mapear cada campanha para prisma.campaign.upsert({ externalId, spentCents, ... })
  throw new Error("Sincronização Meta Ads: implementar chamada à Marketing API (endpoint mapeado no código).");
}

async function syncGoogleAds(_accessToken: string, accountId: string | null): Promise<string> {
  if (!accountId) throw new Error("Informe o customer id do Google Ads.");
  // POST https://googleads.googleapis.com/v18/customers/{accountId}/googleAds:searchStream
  //   query GAQL: campaign.name, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
  // → mapear para prisma.campaign.upsert(...)
  throw new Error("Sincronização Google Ads: implementar chamada à Google Ads API (endpoint mapeado no código).");
}

async function syncGa4(_agencyId: string, _accessToken: string, propertyId: string | null): Promise<string> {
  if (!propertyId) throw new Error("Informe o Property ID do GA4.");
  // POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport
  //   dimensions: date, sessionDefaultChannelGroup; metrics: sessions, totalUsers, conversions
  // → mapear cada linha para prisma.analyticsDaily.upsert(...) por cliente/dia/canal
  throw new Error("Sincronização GA4: implementar chamada à Analytics Data API (endpoint mapeado no código).");
}
