import "server-only";
import { prisma } from "../prisma";
import { parseToCents } from "../format";
import { PROVIDERS, type Provider } from "./config";

export type SyncResult = { ok: boolean; message: string };

/**
 * Sincroniza os dados de um provedor conectado para dentro do sistema
 * (campanhas em Campaign, métricas em AnalyticsDaily).
 *
 * As chamadas às APIs estão implementadas com os endpoints e o parsing reais.
 * A validação de ponta a ponta depende de credenciais válidas — sem conexão,
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
    const clientId = await resolveTargetClient(agencyId, integration.clientId);
    let message: string;
    switch (provider) {
      case "META_ADS":
        message = await syncMetaAds(agencyId, clientId, integration.accessToken, integration.externalAccountId);
        break;
      case "GOOGLE_ADS":
        message = await syncGoogleAds(agencyId, clientId, integration.accessToken, integration.externalAccountId);
        break;
      case "GA4":
        message = await syncGa4(agencyId, clientId, integration.accessToken, integration.externalAccountId);
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

/** Cliente-alvo dos dados: o vinculado à integração, ou o primeiro cliente ativo. */
async function resolveTargetClient(
  agencyId: string,
  clientId: string | null,
): Promise<string> {
  if (clientId) return clientId;
  const client = await prisma.client.findFirst({
    where: { agencyId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (!client) throw new Error("Nenhum cliente ativo para associar os dados. Cadastre um cliente primeiro.");
  return client.id;
}

// ---------------------------------------------------------------------------
// META ADS — Marketing API (insights por campanha) → Campaign
// ---------------------------------------------------------------------------

type MetaInsight = {
  campaign_id: string;
  campaign_name: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
};

async function syncMetaAds(
  agencyId: string,
  clientId: string,
  accessToken: string,
  accountId: string | null,
): Promise<string> {
  if (!accountId) throw new Error("Selecione a conta de anúncios do Meta (ad account id).");

  const url = new URL(`https://graph.facebook.com/v21.0/act_${accountId}/insights`);
  url.searchParams.set("level", "campaign");
  url.searchParams.set("fields", "campaign_id,campaign_name,spend,impressions,clicks,actions");
  url.searchParams.set("date_preset", "last_30d");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Meta Ads respondeu ${res.status}: ${(await res.text()).slice(0, 180)}`);
  const json = (await res.json()) as { data?: MetaInsight[] };

  let count = 0;
  for (const it of json.data ?? []) {
    const conversions = (it.actions ?? [])
      .filter((a) => a.action_type.includes("conversion") || a.action_type.includes("lead"))
      .reduce((s, a) => s + (Number(a.value) || 0), 0);

    await upsertCampaign(agencyId, clientId, {
      externalId: it.campaign_id,
      name: it.campaign_name,
      platform: "META",
      spentCents: parseToCents(it.spend ?? "0"),
      impressions: Number(it.impressions) || 0,
      clicks: Number(it.clicks) || 0,
      conversions,
    });
    count++;
  }
  return `${count} campanha(s) sincronizada(s) do Meta Ads.`;
}

// ---------------------------------------------------------------------------
// GOOGLE ADS — searchStream (GAQL) → Campaign
// ---------------------------------------------------------------------------

type GoogleAdsRow = {
  campaign?: { id?: string; name?: string };
  metrics?: {
    costMicros?: string;
    impressions?: string;
    clicks?: string;
    conversions?: number;
  };
};

async function syncGoogleAds(
  agencyId: string,
  clientId: string,
  accessToken: string,
  accountId: string | null,
): Promise<string> {
  if (!accountId) throw new Error("Informe o customer id do Google Ads.");
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) throw new Error("Defina GOOGLE_ADS_DEVELOPER_TOKEN no ambiente.");

  const query = `SELECT campaign.id, campaign.name, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS`;

  const res = await fetch(
    `https://googleads.googleapis.com/v18/customers/${accountId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  if (!res.ok) throw new Error(`Google Ads respondeu ${res.status}: ${(await res.text()).slice(0, 180)}`);

  const batches = (await res.json()) as { results?: GoogleAdsRow[] }[];
  let count = 0;
  for (const batch of batches ?? []) {
    for (const row of batch.results ?? []) {
      if (!row.campaign?.id) continue;
      await upsertCampaign(agencyId, clientId, {
        externalId: row.campaign.id,
        name: row.campaign.name ?? "Campanha Google",
        platform: "GOOGLE",
        // cost_micros: 1 unidade = 1_000_000 micros → centavos = micros / 10_000
        spentCents: Math.round((Number(row.metrics?.costMicros) || 0) / 10000),
        impressions: Number(row.metrics?.impressions) || 0,
        clicks: Number(row.metrics?.clicks) || 0,
        conversions: Math.round(row.metrics?.conversions ?? 0),
      });
      count++;
    }
  }
  return `${count} campanha(s) sincronizada(s) do Google Ads.`;
}

// ---------------------------------------------------------------------------
// GA4 — Analytics Data API runReport → AnalyticsDaily
// ---------------------------------------------------------------------------

type Ga4Row = {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
};

const GA4_CHANNEL: Record<string, string> = {
  "Organic Search": "ORGANIC",
  "Paid Search": "PAID",
  "Paid Social": "PAID",
  "Paid Shopping": "PAID",
  "Paid Video": "PAID",
  Display: "PAID",
  "Cross-network": "PAID",
  "Organic Social": "SOCIAL",
  Direct: "DIRECT",
  Referral: "REFERRAL",
};

async function syncGa4(
  agencyId: string,
  clientId: string,
  accessToken: string,
  propertyId: string | null,
): Promise<string> {
  if (!propertyId) throw new Error("Informe o Property ID do GA4.");

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }],
      }),
    },
  );
  if (!res.ok) throw new Error(`GA4 respondeu ${res.status}: ${(await res.text()).slice(0, 180)}`);

  const json = (await res.json()) as { rows?: Ga4Row[] };
  const rows = json.rows ?? [];
  if (rows.length === 0) return "GA4 não retornou dados no período.";

  const parsed = rows
    .map((r) => {
      const raw = r.dimensionValues?.[0]?.value ?? ""; // "YYYYMMDD"
      const channelName = r.dimensionValues?.[1]?.value ?? "Direct";
      const date = new Date(
        `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00`,
      );
      return {
        date,
        channel: GA4_CHANNEL[channelName] ?? "DIRECT",
        sessions: Number(r.metricValues?.[0]?.value) || 0,
        users: Number(r.metricValues?.[1]?.value) || 0,
        conversions: Math.round(Number(r.metricValues?.[2]?.value) || 0),
        agencyId,
        clientId,
      };
    })
    .filter((r) => !Number.isNaN(r.date.getTime()));

  // Substitui a janela sincronizada para este cliente
  const min = new Date(Math.min(...parsed.map((r) => r.date.getTime())));
  await prisma.analyticsDaily.deleteMany({
    where: { agencyId, clientId, date: { gte: min } },
  });
  await prisma.analyticsDaily.createMany({ data: parsed as never });

  return `${parsed.length} linha(s) de métricas sincronizada(s) do GA4.`;
}

// ---------------------------------------------------------------------------

async function upsertCampaign(
  agencyId: string,
  clientId: string,
  data: {
    externalId: string;
    name: string;
    platform: "META" | "GOOGLE";
    spentCents: number;
    impressions: number;
    clicks: number;
    conversions: number;
  },
) {
  const existing = await prisma.campaign.findFirst({
    where: { agencyId, externalId: data.externalId },
  });
  const metrics = {
    spentCents: data.spentCents,
    impressions: data.impressions,
    clicks: data.clicks,
    conversions: data.conversions,
  };
  if (existing) {
    await prisma.campaign.update({ where: { id: existing.id }, data: metrics });
  } else {
    await prisma.campaign.create({
      data: {
        name: data.name,
        platform: data.platform,
        status: "ACTIVE",
        externalId: data.externalId,
        agencyId,
        clientId,
        ...metrics,
      },
    });
  }
}
