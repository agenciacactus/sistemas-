import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import { CollapsibleForm, Field, inputClass } from "@/components/collapsible-form";
import { createCampaign } from "./actions";
import { CampaignCard } from "./campaign-card";

export default async function MidiaPage() {
  const user = await requireUser();

  const [campaigns, clients] = await Promise.all([
    prisma.campaign.findMany({
      where: { agencyId: user.agencyId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalBudget = campaigns.reduce((s, c) => s + c.budgetCents, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spentCents, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const activeCount = campaigns.filter((c) => c.status === "ACTIVE").length;

  return (
    <div>
      <PageHeader
        title="Mídia & Tráfego Pago"
        subtitle="Gestão de campanhas Meta, Google e outras plataformas"
        action={
          <CollapsibleForm buttonLabel="Nova campanha" title="Criar campanha" action={createCampaign}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome *">
                <input name="name" required className={inputClass} />
              </Field>
              <Field label="Cliente *">
                <select name="clientId" required className={inputClass} defaultValue="">
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Plataforma">
                <select name="platform" className={inputClass} defaultValue="META">
                  <option value="META">Meta (Facebook/Instagram)</option>
                  <option value="GOOGLE">Google</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </Field>
              <Field label="Objetivo">
                <select name="objective" className={inputClass} defaultValue="TRAFFIC">
                  <option value="AWARENESS">Reconhecimento</option>
                  <option value="TRAFFIC">Tráfego</option>
                  <option value="ENGAGEMENT">Engajamento</option>
                  <option value="LEADS">Leads</option>
                  <option value="SALES">Vendas</option>
                </select>
              </Field>
              <Field label="Verba">
                <input name="budget" className={inputClass} placeholder="R$ 0,00" />
              </Field>
              <Field label="Início">
                <input name="startDate" type="date" className={inputClass} />
              </Field>
              <Field label="Status">
                <select name="status" className={inputClass} defaultValue="DRAFT">
                  <option value="DRAFT">Rascunho</option>
                  <option value="ACTIVE">Ativa</option>
                  <option value="PAUSED">Pausada</option>
                </select>
              </Field>
            </div>
          </CollapsibleForm>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Campanhas ativas" value={String(activeCount)} />
        <StatCard label="Verba total" value={formatBRL(totalBudget)} />
        <StatCard label="Investido" value={formatBRL(totalSpent)} tone="warning" />
        <StatCard label="Conversões" value={String(totalConversions)} tone="positive" />
      </div>

      <div className="mb-4 rounded-lg border border-dashed border-brand-200 bg-brand-50/50 px-4 py-2 text-xs text-brand-700">
        💡 Integração de Ads: as métricas são editáveis manualmente nesta versão. Os campos{" "}
        <code>externalId</code> e a sincronização automática com as APIs do Meta e Google Ads já
        estão previstos no modelo de dados.
      </div>

      {campaigns.length === 0 ? (
        <EmptyState message="Nenhuma campanha ainda. Crie a primeira campanha de tráfego pago." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              c={{
                id: c.id,
                name: c.name,
                clientName: c.client.name,
                platform: c.platform,
                objective: c.objective,
                status: c.status,
                budgetCents: c.budgetCents,
                spentCents: c.spentCents,
                impressions: c.impressions,
                clicks: c.clicks,
                conversions: c.conversions,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
