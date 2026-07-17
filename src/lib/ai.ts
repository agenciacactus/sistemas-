import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import { getClientProfitability, sumProfit } from "./rentability";
import { formatBRL, formatPct } from "./format";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type Summary = { text: string; source: "ai" | "template" };

type Metrics = {
  agencyName: string;
  activeClients: number;
  mrrCents: number;
  revenueCents: number;
  costCents: number;
  marginCents: number;
  marginPct: number | null;
  activeCampaigns: number;
  spentCents: number;
  redAccounts: string[];
};

async function gatherMetrics(agencyId: string, agencyName: string): Promise<Metrics> {
  const [activeClients, feeAgg, rows, campaigns] = await Promise.all([
    prisma.client.count({ where: { agencyId, status: "ACTIVE" } }),
    prisma.proposal.aggregate({
      where: { agencyId, type: "FEE_MENSAL", status: "APPROVED" },
      _sum: { totalCents: true },
    }),
    getClientProfitability(agencyId),
    prisma.campaign.findMany({ where: { agencyId, status: "ACTIVE" } }),
  ]);

  const totals = sumProfit(rows);
  return {
    agencyName,
    activeClients,
    mrrCents: feeAgg._sum.totalCents ?? 0,
    revenueCents: totals.revenueCents,
    costCents: totals.costCents,
    marginCents: totals.marginCents,
    marginPct: totals.marginPct,
    activeCampaigns: campaigns.length,
    spentCents: campaigns.reduce((s, c) => s + c.spentCents, 0),
    redAccounts: rows.filter((r) => r.marginCents < 0).map((r) => r.clientName),
  };
}

/**
 * Gera um resumo executivo da agência. Usa a API do Claude quando a
 * ANTHROPIC_API_KEY está configurada; caso contrário, retorna um resumo
 * determinístico por template (funciona 100% offline).
 */
export async function templateExecutiveSummary(
  agencyId: string,
  agencyName: string,
): Promise<Summary> {
  const metrics = await gatherMetrics(agencyId, agencyName);
  return { text: templateSummary(metrics), source: "template" };
}

export async function generateExecutiveSummary(
  agencyId: string,
  agencyName: string,
): Promise<Summary> {
  const metrics = await gatherMetrics(agencyId, agencyName);

  if (!aiConfigured()) {
    return { text: templateSummary(metrics), source: "template" };
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system:
        "Você é um analista de negócios de uma agência de publicidade. " +
        "Escreva em português do Brasil, de forma objetiva e direta, para o dono da agência. " +
        "Produza um resumo executivo em 2 ou 3 parágrafos curtos, destacando a saúde financeira, " +
        "a rentabilidade das contas e recomendações práticas. Não invente números além dos fornecidos.",
      messages: [
        {
          role: "user",
          content: `Dados da agência ${metrics.agencyName}:
- Clientes ativos: ${metrics.activeClients}
- Receita recorrente (MRR): ${formatBRL(metrics.mrrCents)}
- Receita total considerada: ${formatBRL(metrics.revenueCents)}
- Custos (mídia + horas): ${formatBRL(metrics.costCents)}
- Margem: ${formatBRL(metrics.marginCents)} (${formatPct(metrics.marginPct)})
- Campanhas ativas: ${metrics.activeCampaigns} (investido ${formatBRL(metrics.spentCents)})
- Contas no vermelho: ${metrics.redAccounts.length > 0 ? metrics.redAccounts.join(", ") : "nenhuma"}

Escreva o resumo executivo.`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return { text: text || templateSummary(metrics), source: "ai" };
  } catch {
    // Falha de rede/credencial — cai no template para não quebrar a tela.
    return { text: templateSummary(metrics), source: "template" };
  }
}

function templateSummary(m: Metrics): string {
  const margemSaudavel = (m.marginPct ?? 0) >= 15;
  const linhas: string[] = [];

  linhas.push(
    `A ${m.agencyName} tem ${m.activeClients} cliente(s) ativo(s) e uma receita recorrente ` +
      `(MRR) de ${formatBRL(m.mrrCents)}. Considerando fees, mídia e horas, a margem atual é de ` +
      `${formatBRL(m.marginCents)} (${formatPct(m.marginPct)}).`,
  );

  if (m.redAccounts.length > 0) {
    linhas.push(
      `Atenção: ${m.redAccounts.length} conta(s) estão operando no prejuízo ` +
        `(${m.redAccounts.join(", ")}). Reavalie o fee, o escopo contratado ou as horas alocadas ` +
        `nessas contas antes da próxima renovação.`,
    );
  } else if (margemSaudavel) {
    linhas.push(
      "A operação está saudável: nenhuma conta no vermelho e a margem está em patamar confortável. " +
        "É um bom momento para investir em novos serviços ou aumentar a captação.",
    );
  } else {
    linhas.push(
      "Nenhuma conta está no vermelho, mas a margem geral está apertada. " +
        "Vale revisar custos de produção e a alocação de horas por cliente.",
    );
  }

  linhas.push(
    `Há ${m.activeCampaigns} campanha(s) de tráfego ativa(s), com ${formatBRL(m.spentCents)} ` +
      `investidos. Acompanhe o pacing da verba e os alertas ao lado para agir antes que virem problema.`,
  );

  return linhas.join("\n\n");
}
