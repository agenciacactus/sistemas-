import Link from "next/link";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate, formatPct } from "@/lib/format";
import { getClientProfitability, sumProfit } from "@/lib/rentability";
import { Card, PageHeader, StatCard, Badge } from "@/components/ui";
import { meta, proposalStatus, entryType, campaignStatus } from "@/lib/labels";

export default async function DashboardPage() {
  const user = await requireUser();
  const agencyId = user.agencyId;

  const [
    activeClients,
    activeProjects,
    feeProposals,
    receivablePending,
    payablePending,
    activeCampaigns,
    scheduledPosts,
    recentProposals,
    upcomingEntries,
  ] = await Promise.all([
    prisma.client.count({ where: { agencyId, status: "ACTIVE" } }),
    prisma.project.count({ where: { agencyId, status: "ACTIVE" } }),
    prisma.proposal.aggregate({
      where: { agencyId, type: "FEE_MENSAL", status: "APPROVED" },
      _sum: { totalCents: true },
    }),
    prisma.financialEntry.aggregate({
      where: { agencyId, type: "RECEIVABLE", status: "PENDING" },
      _sum: { amountCents: true },
    }),
    prisma.financialEntry.aggregate({
      where: { agencyId, type: "PAYABLE", status: "PENDING" },
      _sum: { amountCents: true },
    }),
    prisma.campaign.findMany({
      where: { agencyId, status: "ACTIVE" },
      include: { client: true },
    }),
    prisma.socialPost.count({ where: { agencyId, status: "SCHEDULED" } }),
    prisma.proposal.findMany({
      where: { agencyId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.financialEntry.findMany({
      where: { agencyId, status: "PENDING" },
      include: { client: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);

  const profitTotals = sumProfit(await getClientProfitability(agencyId));

  const mrr = feeProposals._sum.totalCents ?? 0;
  const receivable = receivablePending._sum.amountCents ?? 0;
  const payable = payablePending._sum.amountCents ?? 0;
  const totalSpend = activeCampaigns.reduce((s, c) => s + c.spentCents, 0);

  return (
    <div>
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]} 👋`}
        subtitle="Visão geral da agência"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Clientes ativos" value={String(activeClients)} />
        <StatCard label="Projetos ativos" value={String(activeProjects)} />
        <StatCard
          label="Receita recorrente (MRR)"
          value={formatBRL(mrr)}
          tone="positive"
          hint="Fees mensais aprovados"
        />
        <StatCard
          label="Investimento em mídia"
          value={formatBRL(totalSpend)}
          hint={`${activeCampaigns.length} campanhas ativas`}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="A receber (pendente)" value={formatBRL(receivable)} tone="positive" />
        <StatCard label="A pagar (pendente)" value={formatBRL(payable)} tone="negative" />
        <StatCard
          label="Margem das contas"
          value={formatBRL(profitTotals.marginCents)}
          hint={`Margem média ${formatPct(profitTotals.marginPct)}`}
          tone={profitTotals.marginCents >= 0 ? "positive" : "negative"}
        />
        <StatCard label="Posts agendados" value={String(scheduledPosts)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Propostas recentes</h2>
            <Link href="/propostas" className="text-sm text-brand-600 hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {recentProposals.length === 0 && (
              <p className="text-sm text-gray-400">Nenhuma proposta ainda.</p>
            )}
            {recentProposals.map((p) => {
              const st = meta(proposalStatus, p.status);
              return (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.title}</p>
                    <p className="text-xs text-gray-400">
                      {p.client.name} · {p.number}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {formatBRL(p.totalCents)}
                    </span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Próximos vencimentos</h2>
            <Link href="/financeiro" className="text-sm text-brand-600 hover:underline">
              Ver financeiro
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingEntries.length === 0 && (
              <p className="text-sm text-gray-400">Nada pendente.</p>
            )}
            {upcomingEntries.map((e) => {
              const t = meta(entryType, e.type);
              return (
                <div key={e.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{e.description}</p>
                    <p className="text-xs text-gray-400">
                      {e.client?.name ?? "—"} · vence {formatDate(e.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        e.type === "RECEIVABLE" ? "text-brand-700" : "text-red-600"
                      }`}
                    >
                      {formatBRL(e.amountCents)}
                    </span>
                    <Badge tone={t.tone}>{t.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Campanhas ativas</h2>
          <Link href="/midia" className="text-sm text-brand-600 hover:underline">
            Ver mídia
          </Link>
        </div>
        {activeCampaigns.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma campanha ativa.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="pb-2 font-medium">Campanha</th>
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Investido</th>
                  <th className="pb-2 text-right font-medium">Conversões</th>
                </tr>
              </thead>
              <tbody>
                {activeCampaigns.map((c) => {
                  const st = meta(campaignStatus, c.status);
                  return (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 font-medium text-gray-800">{c.name}</td>
                      <td className="py-2.5 text-gray-500">{c.client.name}</td>
                      <td className="py-2.5">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="py-2.5 text-right text-gray-700">
                        {formatBRL(c.spentCents)}
                      </td>
                      <td className="py-2.5 text-right text-gray-700">{c.conversions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
