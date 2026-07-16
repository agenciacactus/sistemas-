import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate, formatPct } from "@/lib/format";
import { getClientProfit } from "@/lib/rentability";
import { Card, PageHeader, Badge, StatCard, EmptyState } from "@/components/ui";
import {
  meta,
  clientStatus,
  projectStatus,
  proposalStatus,
  entryType,
  socialPlatform,
} from "@/lib/labels";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const client = await prisma.client.findFirst({
    where: { id, agencyId: user.agencyId },
    include: {
      accountManager: true,
      projects: { orderBy: { createdAt: "desc" } },
      proposals: { orderBy: { createdAt: "desc" } },
      socialAccounts: true,
      financialEntries: { orderBy: { dueDate: "asc" } },
    },
  });

  if (!client) notFound();

  const st = meta(clientStatus, client.status);
  const profit = await getClientProfit(user.agencyId, client.id);

  return (
    <div>
      <Link href="/clientes" className="mb-3 inline-block text-sm text-brand-600 hover:underline">
        ← Clientes
      </Link>
      <PageHeader
        title={client.name}
        subtitle={[client.segment, client.contact, client.email, client.phone]
          .filter(Boolean)
          .join(" · ")}
        action={<Badge tone={st.tone}>{st.label}</Badge>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Projetos" value={String(client.projects.length)} />
        <StatCard label="Receita" value={formatBRL(profit?.revenueCents ?? 0)} tone="positive" />
        <StatCard
          label="Margem"
          value={formatBRL(profit?.marginCents ?? 0)}
          tone={(profit?.marginCents ?? 0) >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Margem %"
          value={formatPct(profit?.marginPct ?? null)}
          hint={`${(profit?.hours ?? 0).toLocaleString("pt-BR")}h apontadas`}
          tone={(profit?.marginCents ?? 0) >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-gray-900">Projetos</h2>
          {client.projects.length === 0 ? (
            <EmptyState message="Sem projetos." />
          ) : (
            <div className="space-y-2">
              {client.projects.map((p) => {
                const ps = meta(projectStatus, p.status);
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <span className="text-sm font-medium text-gray-800">{p.name}</span>
                    <Badge tone={ps.tone}>{ps.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-gray-900">Propostas</h2>
          {client.proposals.length === 0 ? (
            <EmptyState message="Sem propostas." />
          ) : (
            <div className="space-y-2">
              {client.proposals.map((p) => {
                const pst = meta(proposalStatus, p.status);
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.title}</p>
                      <p className="text-xs text-gray-400">{formatBRL(p.totalCents)}</p>
                    </div>
                    <Badge tone={pst.tone}>{pst.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-gray-900">Contas sociais</h2>
          {client.socialAccounts.length === 0 ? (
            <EmptyState message="Nenhuma conta conectada." />
          ) : (
            <div className="space-y-2">
              {client.socialAccounts.map((a) => {
                const sp = meta(socialPlatform, a.platform);
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={sp.tone}>{sp.label}</Badge>
                      <span className="text-sm text-gray-700">{a.handle}</span>
                    </div>
                    <Badge tone={a.connected ? "green" : "gray"}>
                      {a.connected ? "Conectada" : "Desconectada"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-gray-900">Financeiro</h2>
          {client.financialEntries.length === 0 ? (
            <EmptyState message="Sem lançamentos." />
          ) : (
            <div className="space-y-2">
              {client.financialEntries.slice(0, 6).map((e) => {
                const t = meta(entryType, e.type);
                return (
                  <div key={e.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{e.description}</p>
                      <p className="text-xs text-gray-400">vence {formatDate(e.dueDate)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">{formatBRL(e.amountCents)}</span>
                      <Badge tone={t.tone}>{t.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
