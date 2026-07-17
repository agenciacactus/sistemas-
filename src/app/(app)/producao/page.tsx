import Link from "next/link";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, EmptyState, StatCard } from "@/components/ui";
import { meta, productionOrderStatus, billingMethod } from "@/lib/labels";

export default async function ProducaoPage() {
  const user = await requireUser();

  const orders = await prisma.productionOrder.findMany({
    where: { agencyId: user.agencyId },
    include: {
      client: { select: { name: true } },
      supplierQuote: { include: { supplier: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalBv = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => s + o.bvCents, 0);
  const totalFaturado = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => s + o.clientTotalCents, 0);

  return (
    <div>
      <PageHeader
        title="Pedidos de Produção"
        subtitle={`${orders.length} pedidos gerados a partir das cotações`}
      />

      {orders.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Pedidos" value={String(orders.length)} />
          <StatCard label="BV da agência" value={formatBRL(totalBv)} tone="positive" />
          <StatCard label="Faturado ao cliente" value={formatBRL(totalFaturado)} />
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState message="Nenhum pedido de produção ainda. Gere um pedido a partir de uma cotação com orçamento escolhido." />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-3 font-medium">Número</th>
                  <th className="px-5 py-3 font-medium">Fornecedor</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Faturamento</th>
                  <th className="px-5 py-3 text-right font-medium">Custo</th>
                  <th className="px-5 py-3 text-right font-medium">BV</th>
                  <th className="px-5 py-3 text-right font-medium">Total cliente</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const stt = meta(productionOrderStatus, o.status);
                  const bm = meta(billingMethod, o.billingMethod);
                  return (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/producao/${o.id}`}
                          className="font-medium text-gray-900 hover:text-brand-700"
                        >
                          {o.number}
                        </Link>
                        <p className="text-xs text-gray-400">{formatDate(o.createdAt)}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{o.supplierQuote.supplier.name}</td>
                      <td className="px-5 py-3 text-gray-500">{o.client?.name ?? "—"}</td>
                      <td className="px-5 py-3">
                        <Badge tone={bm.tone}>{bm.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500">
                        {formatBRL(o.supplierCostCents)}
                      </td>
                      <td className="px-5 py-3 text-right text-brand-700">
                        {formatBRL(o.bvCents)}
                        <span className="text-xs text-gray-400"> ({o.bvPercent}%)</span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-800">
                        {formatBRL(o.clientTotalCents)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={stt.tone}>{stt.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
