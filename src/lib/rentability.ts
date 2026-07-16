import { prisma } from "./prisma";

// Cálculo de rentabilidade por cliente:
//   Receita  = lançamentos financeiros A RECEBER (exceto cancelados)
//   Custos   = lançamentos A PAGAR (mídia/produção externa) + custo das horas apontadas
//   Margem   = Receita − Custos
// Valores em centavos (Int) para evitar erro de ponto flutuante.

export type ClientProfit = {
  clientId: string;
  clientName: string;
  status: string;
  revenueCents: number;
  externalCostCents: number;
  laborCostCents: number;
  hours: number;
  costCents: number;
  marginCents: number;
  marginPct: number | null; // null quando não há receita
};

export async function getClientProfitability(
  agencyId: string,
): Promise<ClientProfit[]> {
  const [clients, financeGroups, laborGroups] = await Promise.all([
    prisma.client.findMany({
      where: { agencyId },
      select: { id: true, name: true, status: true },
    }),
    prisma.financialEntry.groupBy({
      by: ["clientId", "type"],
      where: { agencyId, status: { not: "CANCELLED" }, clientId: { not: null } },
      _sum: { amountCents: true },
    }),
    prisma.timeEntry.groupBy({
      by: ["clientId"],
      where: { agencyId },
      _sum: { costCents: true, hours: true },
    }),
  ]);

  const revenue = new Map<string, number>();
  const external = new Map<string, number>();
  for (const g of financeGroups) {
    if (!g.clientId) continue;
    const amount = g._sum.amountCents ?? 0;
    if (g.type === "RECEIVABLE") {
      revenue.set(g.clientId, (revenue.get(g.clientId) ?? 0) + amount);
    } else if (g.type === "PAYABLE") {
      external.set(g.clientId, (external.get(g.clientId) ?? 0) + amount);
    }
  }

  const labor = new Map<string, number>();
  const hoursMap = new Map<string, number>();
  for (const g of laborGroups) {
    labor.set(g.clientId, g._sum.costCents ?? 0);
    hoursMap.set(g.clientId, g._sum.hours ?? 0);
  }

  const rows: ClientProfit[] = clients.map((c) => {
    const revenueCents = revenue.get(c.id) ?? 0;
    const externalCostCents = external.get(c.id) ?? 0;
    const laborCostCents = labor.get(c.id) ?? 0;
    const costCents = externalCostCents + laborCostCents;
    const marginCents = revenueCents - costCents;
    return {
      clientId: c.id,
      clientName: c.name,
      status: c.status,
      revenueCents,
      externalCostCents,
      laborCostCents,
      hours: hoursMap.get(c.id) ?? 0,
      costCents,
      marginCents,
      marginPct: revenueCents > 0 ? (marginCents / revenueCents) * 100 : null,
    };
  });

  // Ordena da maior para a menor margem
  rows.sort((a, b) => b.marginCents - a.marginCents);
  return rows;
}

export type ProfitTotals = {
  revenueCents: number;
  costCents: number;
  marginCents: number;
  marginPct: number | null;
};

export function sumProfit(rows: ClientProfit[]): ProfitTotals {
  const revenueCents = rows.reduce((s, r) => s + r.revenueCents, 0);
  const costCents = rows.reduce((s, r) => s + r.costCents, 0);
  const marginCents = revenueCents - costCents;
  return {
    revenueCents,
    costCents,
    marginCents,
    marginPct: revenueCents > 0 ? (marginCents / revenueCents) * 100 : null,
  };
}

/** Rentabilidade de um único cliente (para a visão 360°). */
export async function getClientProfit(
  agencyId: string,
  clientId: string,
): Promise<ClientProfit | null> {
  const rows = await getClientProfitability(agencyId);
  return rows.find((r) => r.clientId === clientId) ?? null;
}
