import { prisma } from "./prisma";
import { getClientProfitability } from "./rentability";
import { formatBRL, formatPct } from "./format";

// Motor de insights por regras — roda sem depender de IA/chave externa.
// Varre os dados da agência e gera alertas acionáveis.

export type Severity = "critical" | "warning" | "info";

export type Insight = {
  severity: Severity;
  title: string;
  description: string;
  href: string;
};

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export async function getInsights(agencyId: string): Promise<Insight[]> {
  const now = new Date();
  const insights: Insight[] = [];

  const [profitability, activeClients, campaigns, overdue, staleProposals] =
    await Promise.all([
      getClientProfitability(agencyId),
      prisma.client.findMany({
        where: { agencyId, status: "ACTIVE" },
        include: {
          socialAccounts: { select: { id: true } },
          _count: {
            select: { socialAccounts: true },
          },
        },
      }),
      prisma.campaign.findMany({
        where: { agencyId, status: "ACTIVE" },
      }),
      prisma.financialEntry.findMany({
        where: {
          agencyId,
          type: "RECEIVABLE",
          status: "PENDING",
          dueDate: { lt: now },
        },
        include: { client: true },
      }),
      prisma.proposal.findMany({
        where: { agencyId, status: "SENT" },
        include: { client: true },
      }),
    ]);

  // 1) Contas no vermelho (crítico)
  for (const p of profitability) {
    if (p.marginCents < 0) {
      insights.push({
        severity: "critical",
        title: `${p.clientName} está no vermelho`,
        description: `Margem de ${formatBRL(p.marginCents)} (${formatPct(
          p.marginPct,
        )}). Reveja o fee, o escopo ou as horas alocadas.`,
        href: "/rentabilidade",
      });
    }
  }

  // 2) Orçamento de mídia estourando (aviso)
  for (const c of campaigns) {
    if (c.budgetCents > 0) {
      const used = (c.spentCents / c.budgetCents) * 100;
      if (used >= 85) {
        insights.push({
          severity: "warning",
          title: `Verba quase no limite: ${c.name}`,
          description: `${formatPct(used)} da verba (${formatBRL(
            c.spentCents,
          )} de ${formatBRL(c.budgetCents)}) já foi consumida.`,
          href: "/midia",
        });
      }
    }
  }

  // 3) Contas a receber vencidas (aviso)
  for (const e of overdue) {
    insights.push({
      severity: "warning",
      title: `Recebimento vencido: ${e.client?.name ?? "cliente"}`,
      description: `${e.description} — ${formatBRL(
        e.amountCents,
      )} venceu em ${e.dueDate.toLocaleDateString("pt-BR")}.`,
      href: "/financeiro",
    });
  }

  // 4) Cliente ativo sem post agendado (info)
  const clientIds = activeClients
    .filter((c) => c._count.socialAccounts > 0)
    .map((c) => c.id);
  if (clientIds.length > 0) {
    const scheduled = await prisma.socialPost.groupBy({
      by: ["accountId"],
      where: { agencyId, status: "SCHEDULED" },
      _count: true,
    });
    const accountsWithScheduled = new Set(scheduled.map((s) => s.accountId));
    for (const c of activeClients) {
      if (c._count.socialAccounts === 0) continue;
      const hasScheduled = c.socialAccounts.some((a) =>
        accountsWithScheduled.has(a.id),
      );
      if (!hasScheduled) {
        insights.push({
          severity: "info",
          title: `${c.name} sem conteúdo agendado`,
          description:
            "Nenhum post agendado nas redes deste cliente. Planeje o próximo conteúdo.",
          href: "/redes",
        });
      }
    }
  }

  // 5) Propostas enviadas há mais de 10 dias sem resposta (info)
  const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
  for (const p of staleProposals) {
    if (now.getTime() - p.createdAt.getTime() > tenDaysMs) {
      insights.push({
        severity: "info",
        title: `Proposta parada: ${p.title}`,
        description: `Enviada para ${p.client.name} há mais de 10 dias sem aprovação. Faça um follow-up.`,
        href: `/propostas/${p.id}`,
      });
    }
  }

  insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return insights;
}
