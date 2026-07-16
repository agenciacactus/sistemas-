import Link from "next/link";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatPct } from "@/lib/format";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { AreaChart, HBars } from "@/components/charts";
import { meta, channel as channelMeta, adPlatform } from "@/lib/labels";

type DailyTotal = { date: Date; sessions: number; users: number; conversions: number };

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const user = await requireUser();
  const agencyId = user.agencyId;
  const { cliente } = await searchParams;

  const clients = await prisma.client.findMany({
    where: { agencyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (clients.length === 0) {
    return (
      <div>
        <PageHeader title="Relatórios & Analytics" subtitle="Performance por cliente" />
        <EmptyState message="Cadastre um cliente para ver relatórios." />
      </div>
    );
  }

  // Cliente selecionado: o do parâmetro, ou o primeiro que tenha dados de analytics.
  let selected = clients.find((c) => c.id === cliente);
  if (!selected) {
    const withData = await prisma.analyticsDaily.findMany({
      where: { agencyId },
      select: { clientId: true },
      distinct: ["clientId"],
    });
    const ids = new Set(withData.map((w) => w.clientId));
    selected = clients.find((c) => ids.has(c.id)) ?? clients[0];
  }

  const [dailyGroups, campaigns] = await Promise.all([
    prisma.analyticsDaily.groupBy({
      by: ["date"],
      where: { agencyId, clientId: selected.id },
      _sum: { sessions: true, users: true, conversions: true },
      orderBy: { date: "asc" },
    }),
    prisma.campaign.findMany({
      where: { agencyId, clientId: selected.id },
      orderBy: { spentCents: "desc" },
    }),
  ]);

  const daily: DailyTotal[] = dailyGroups.map((g) => ({
    date: g.date,
    sessions: g._sum.sessions ?? 0,
    users: g._sum.users ?? 0,
    conversions: g._sum.conversions ?? 0,
  }));

  const last30 = daily.slice(-30);
  const prev30 = daily.slice(-60, -30);

  const sum = (rows: DailyTotal[], key: keyof DailyTotal) =>
    rows.reduce((s, r) => s + (r[key] as number), 0);

  const cur = {
    sessions: sum(last30, "sessions"),
    users: sum(last30, "users"),
    conversions: sum(last30, "conversions"),
  };
  const prev = {
    sessions: sum(prev30, "sessions"),
    users: sum(prev30, "users"),
    conversions: sum(prev30, "conversions"),
  };
  const convRate = cur.sessions > 0 ? (cur.conversions / cur.sessions) * 100 : 0;
  const prevConvRate = prev.sessions > 0 ? (prev.conversions / prev.sessions) * 100 : 0;

  const cutoff = last30[0]?.date;
  const channelGroups = cutoff
    ? await prisma.analyticsDaily.groupBy({
        by: ["channel"],
        where: { agencyId, clientId: selected.id, date: { gte: cutoff } },
        _sum: { sessions: true },
      })
    : [];

  const channelItems = channelGroups
    .map((g) => ({
      label: meta(channelMeta, g.channel).label,
      value: g._sum.sessions ?? 0,
    }))
    .sort((a, b) => b.value - a.value);

  const trend = last30.map((d) => ({
    label: d.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    value: d.sessions,
  }));

  return (
    <div>
      <PageHeader
        title="Relatórios & Analytics"
        subtitle="Performance de aquisição por cliente — últimos 30 dias"
      />

      {/* seletor de cliente */}
      <div className="mb-5 flex flex-wrap gap-2">
        {clients.map((c) => {
          const active = c.id === selected.id;
          return (
            <Link
              key={c.id}
              href={`/relatorios?cliente=${c.id}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-brand-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {c.name}
            </Link>
          );
        })}
      </div>

      {daily.length === 0 ? (
        <EmptyState message="Sem dados de analytics para este cliente." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Sessões" value={cur.sessions.toLocaleString("pt-BR")} delta={pctChange(cur.sessions, prev.sessions)} />
            <Kpi label="Usuários" value={cur.users.toLocaleString("pt-BR")} delta={pctChange(cur.users, prev.users)} />
            <Kpi label="Conversões" value={cur.conversions.toLocaleString("pt-BR")} delta={pctChange(cur.conversions, prev.conversions)} />
            <Kpi label="Taxa de conversão" value={formatPct(convRate)} delta={pctChange(convRate, prevConvRate)} />
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-brand-200 bg-brand-50/50 px-4 py-2 text-xs text-brand-700">
            💡 Dados de demonstração. O modelo já prevê a sincronização com o Google Analytics 4 e as
            plataformas de anúncios — os canais e a série temporal viriam direto do GA4.
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h2 className="mb-1 font-semibold text-gray-900">Sessões por dia</h2>
              <p className="mb-4 text-sm text-gray-500">Passe o mouse sobre o gráfico para ver cada dia.</p>
              <AreaChart data={trend} />
            </Card>

            <Card>
              <h2 className="mb-4 font-semibold text-gray-900">Sessões por canal</h2>
              {channelItems.length === 0 ? (
                <EmptyState message="Sem dados." />
              ) : (
                <HBars items={channelItems} />
              )}
            </Card>
          </div>

          <Card className="mt-6">
            <h2 className="mb-4 font-semibold text-gray-900">Performance de campanhas</h2>
            {campaigns.length === 0 ? (
              <EmptyState message="Nenhuma campanha para este cliente." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                      <th className="py-2 font-medium">Campanha</th>
                      <th className="py-2 font-medium">Plataforma</th>
                      <th className="py-2 text-right font-medium">Investido</th>
                      <th className="py-2 text-right font-medium">Cliques</th>
                      <th className="py-2 text-right font-medium">Conversões</th>
                      <th className="py-2 text-right font-medium">CPL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => {
                      const pl = meta(adPlatform, c.platform);
                      const cpl = c.conversions > 0 ? c.spentCents / c.conversions : 0;
                      return (
                        <tr key={c.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 font-medium text-gray-800">{c.name}</td>
                          <td className="py-2.5">
                            <Badge tone={pl.tone}>{pl.label}</Badge>
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-gray-600">{formatBRL(c.spentCents)}</td>
                          <td className="py-2.5 text-right tabular-nums text-gray-600">{c.clicks.toLocaleString("pt-BR")}</td>
                          <td className="py-2.5 text-right tabular-nums text-gray-600">{c.conversions}</td>
                          <td className="py-2.5 text-right tabular-nums text-gray-600">{formatBRL(Math.round(cpl))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function pctChange(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

function Kpi({ label, value, delta }: { label: string; value: string; delta: number | null }) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {delta === null ? (
        <p className="mt-1 text-xs text-gray-400">—</p>
      ) : (
        <p className={`mt-1 text-xs font-medium ${up ? "text-brand-700" : "text-red-600"}`}>
          {up ? "▲" : "▼"} {formatPct(Math.abs(delta))} vs. período anterior
        </p>
      )}
    </Card>
  );
}
