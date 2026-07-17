import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { Card, PageHeader, Badge } from "@/components/ui";
import { meta, productionOrderStatus, billingMethod } from "@/lib/labels";
import { setProductionOrderStatus } from "../actions";

const STATUS_OPTIONS = ["OPEN", "IN_PRODUCTION", "DELIVERED", "INVOICED", "CANCELLED"];

export default async function ProducaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const order = await prisma.productionOrder.findFirst({
    where: { id, agencyId: user.agencyId },
    include: {
      client: true,
      createdBy: true,
      quotation: { include: { items: true } },
      supplierQuote: { include: { supplier: true, lines: true } },
    },
  });
  if (!order) notFound();

  const stt = meta(productionOrderStatus, order.status);
  const bm = meta(billingMethod, order.billingMethod);
  const supplier = order.supplierQuote.supplier;

  const priceByItem = new Map(order.supplierQuote.lines.map((l) => [l.itemId, l.unitCents]));

  const billingExplain =
    order.billingMethod === "SIGA"
      ? "Faturamento SIGA: o fornecedor emite a nota fiscal do valor líquido diretamente contra o cliente. A agência recebe o BV à parte, como bonificação de volume."
      : "Faturado líquido contra o cliente aos cuidados da agência: a agência emite a nota do valor total (custo + BV) contra o cliente e repassa o valor líquido ao fornecedor.";

  return (
    <div>
      <Link
        href={`/cotacoes/${order.quotationId}`}
        className="mb-3 inline-block text-sm text-brand-600 hover:underline"
      >
        ← Cotação {order.quotation.number}
      </Link>
      <PageHeader
        title={`Pedido de produção ${order.number}`}
        subtitle={`${order.quotation.title}${order.client ? ` · ${order.client.name}` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={bm.tone}>{bm.label}</Badge>
            <Badge tone={stt.tone}>{stt.label}</Badge>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Itens com preços do fornecedor escolhido */}
          <Card>
            <h2 className="mb-4 font-semibold text-gray-900">Itens do pedido</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 text-center font-medium">Qtd</th>
                  <th className="pb-2 text-right font-medium">Unitário</th>
                  <th className="pb-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.quotation.items.map((it) => {
                  const unit = priceByItem.get(it.id) ?? 0;
                  return (
                    <tr key={it.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 text-gray-800">
                        {it.description}
                        {it.spec && <span className="block text-xs text-gray-400">{it.spec}</span>}
                      </td>
                      <td className="py-2.5 text-center text-gray-500">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">{formatBRL(unit)}</td>
                      <td className="py-2.5 text-right font-medium text-gray-800">
                        {formatBRL(unit * it.quantity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 text-right text-sm font-medium text-gray-500">
                    Custo do fornecedor (líquido)
                  </td>
                  <td className="pt-3 text-right font-semibold text-gray-800">
                    {formatBRL(order.supplierCostCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
            {order.notes && (
              <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{order.notes}</p>
            )}
          </Card>

          {/* Resumo financeiro / faturamento */}
          <Card>
            <h2 className="mb-4 font-semibold text-gray-900">Faturamento</h2>
            <div className="space-y-2 text-sm">
              <Row label="Custo do fornecedor (líquido)" value={formatBRL(order.supplierCostCents)} />
              <Row
                label={`BV da agência (${order.bvPercent}%)`}
                value={formatBRL(order.bvCents)}
                accent
              />
              <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="font-semibold text-gray-800">Total faturado ao cliente</span>
                <span className="text-xl font-bold text-brand-700">
                  {formatBRL(order.clientTotalCents)}
                </span>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
              <p className="mb-1 font-medium text-gray-600">{bm.label}</p>
              {billingExplain}
            </div>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold text-gray-900">Fornecedor</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Nome" value={supplier.name} />
              <Row label="Contato" value={supplier.contact ?? "—"} />
              <Row label="E-mail" value={supplier.email ?? "—"} />
              <Row label="Telefone" value={supplier.phone ?? "—"} />
              {order.supplierQuote.leadTimeDays != null && (
                <Row label="Prazo do fornecedor" value={`${order.supplierQuote.leadTimeDays} dias`} />
              )}
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-gray-900">Dados do pedido</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Cliente" value={order.client?.name ?? "—"} />
              <Row label="Entrega" value={formatDate(order.deliveryDate)} />
              <Row label="Criado por" value={order.createdBy?.name ?? "—"} />
              <Row label="Criado em" value={formatDate(order.createdAt)} />
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-gray-900">Alterar status</h2>
            <form action={setProductionOrderStatus} className="flex gap-2">
              <input type="hidden" name="id" value={order.id} />
              <select
                name="status"
                defaultValue={order.status}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {meta(productionOrderStatus, s).label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Salvar
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={accent ? "font-medium text-brand-700" : "font-medium text-gray-700"}>
        {value}
      </span>
    </div>
  );
}
