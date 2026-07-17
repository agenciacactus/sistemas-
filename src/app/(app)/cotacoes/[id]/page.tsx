import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import {
  meta,
  quotationStatus,
  supplierQuoteStatus,
  supplierCategory,
  dispatchChannel,
} from "@/lib/labels";
import {
  buildDispatchMessage,
  whatsappLink,
  mailtoLink,
} from "@/lib/quotation";
import { QuoteEditor } from "../quote-editor";
import { DispatchPanel } from "../dispatch-panel";
import { ProductionOrderForm } from "../production-order-form";
import { addSuppliers, dispatchAll, rejectSupplierQuote, cancelQuotation } from "../actions";

export default async function CotacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const quotation = await prisma.quotation.findFirst({
    where: { id, agencyId: user.agencyId },
    include: {
      client: true,
      project: true,
      createdBy: true,
      items: { orderBy: { description: "asc" } },
      supplierQuotes: {
        include: { supplier: true, lines: true },
        orderBy: { createdAt: "asc" },
      },
      productionOrders: {
        include: { supplierQuote: { include: { supplier: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!quotation) notFound();

  const st = meta(quotationStatus, quotation.status);

  // fornecedores ainda não convidados (para o card "adicionar")
  const invitedIds = quotation.supplierQuotes.map((sq) => sq.supplierId);
  const availableSuppliers = await prisma.supplier.findMany({
    where: { agencyId: user.agencyId, active: true, id: { notIn: invitedIds } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const itemsForMsg = quotation.items.map((it) => ({
    description: it.description,
    quantity: it.quantity,
    unit: it.unit,
    spec: it.spec,
  }));

  const subject = `Cotação ${quotation.number} — ${quotation.title}`;

  // menor total entre os orçamentos recebidos (destaque de melhor preço)
  const receivedTotals = quotation.supplierQuotes
    .filter((sq) => sq.totalCents > 0 && sq.status !== "REJECTED")
    .map((sq) => sq.totalCents);
  const bestTotal = receivedTotals.length ? Math.min(...receivedTotals) : null;

  // orçamentos elegíveis para virar pedido de produção
  const eligibleQuotes = quotation.supplierQuotes
    .filter((sq) => sq.totalCents > 0 && sq.status !== "REJECTED")
    .map((sq) => ({
      id: sq.id,
      supplierName: sq.supplier.name,
      totalCents: sq.totalCents,
    }));

  const canOrder = quotation.status !== "CANCELLED";

  return (
    <div>
      <Link href="/cotacoes" className="mb-3 inline-block text-sm text-brand-600 hover:underline">
        ← Cotações
      </Link>
      <PageHeader
        title={quotation.title}
        subtitle={`${quotation.number}${quotation.client ? ` · ${quotation.client.name}` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={st.tone}>{st.label}</Badge>
            {quotation.supplierQuotes.some((sq) => sq.status === "INVITED") && (
              <form action={dispatchAll}>
                <input type="hidden" name="quotationId" value={quotation.id} />
                <input type="hidden" name="channel" value="BOTH" />
                <button
                  type="submit"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Marcar todos como enviados
                </button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Itens */}
          <Card>
            <h2 className="mb-4 font-semibold text-gray-900">Itens da cotação</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 text-center font-medium">Qtd</th>
                  <th className="pb-2 text-center font-medium">Un.</th>
                  <th className="pb-2 font-medium">Especificação</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 text-gray-800">{it.description}</td>
                    <td className="py-2.5 text-center text-gray-500">{it.quantity}</td>
                    <td className="py-2.5 text-center text-gray-500">{it.unit}</td>
                    <td className="py-2.5 text-gray-500">{it.spec ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {quotation.notes && (
              <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{quotation.notes}</p>
            )}
          </Card>

          {/* Fornecedores / orçamentos */}
          <Card>
            <h2 className="mb-1 font-semibold text-gray-900">
              Fornecedores &amp; orçamentos
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              Dispare o pedido por e-mail/WhatsApp e lance os orçamentos recebidos.
            </p>

            {quotation.supplierQuotes.length === 0 ? (
              <EmptyState message="Nenhum fornecedor convidado. Use o card ao lado para adicionar." />
            ) : (
              <div className="space-y-3">
                {quotation.supplierQuotes.map((sq) => {
                  const sqSt = meta(supplierQuoteStatus, sq.status);
                  const cat = meta(supplierCategory, sq.supplier.category);
                  const ch = meta(dispatchChannel, sq.channel);
                  const isBest = bestTotal !== null && sq.totalCents === bestTotal && sq.totalCents > 0;

                  const message = buildDispatchMessage({
                    agencyName: user.agencyName,
                    supplierName: sq.supplier.name,
                    supplierContact: sq.supplier.contact,
                    quotationNumber: quotation.number,
                    quotationTitle: quotation.title,
                    items: itemsForMsg,
                    deadline: quotation.deadline,
                    responderName: user.name,
                    responderEmail: user.email,
                  });
                  const mailtoHref = mailtoLink(sq.supplier.email, subject, message);
                  const whatsappHref = whatsappLink(sq.supplier.phone, message);

                  const priceByItem = new Map(sq.lines.map((l) => [l.itemId, l.unitCents]));
                  const editorItems = quotation.items.map((it) => ({
                    id: it.id,
                    description: it.description,
                    quantity: it.quantity,
                    unit: it.unit,
                    price:
                      priceByItem.get(it.id) !== undefined
                        ? String((priceByItem.get(it.id)! / 100).toFixed(2)).replace(".", ",")
                        : "",
                  }));

                  return (
                    <div
                      key={sq.id}
                      className={`rounded-lg border p-4 ${
                        isBest ? "border-brand-300 bg-brand-50/40" : "border-gray-200"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{sq.supplier.name}</p>
                            <Badge tone={cat.tone}>{cat.label}</Badge>
                            {isBest && <Badge tone="green">Melhor preço</Badge>}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {sq.supplier.email ?? "sem e-mail"} · {sq.supplier.phone ?? "sem telefone"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {sq.totalCents > 0 ? formatBRL(sq.totalCents) : "—"}
                          </p>
                          {sq.leadTimeDays != null && (
                            <p className="text-xs text-gray-400">entrega em {sq.leadTimeDays} dias</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge tone={sqSt.tone}>{sqSt.label}</Badge>
                        <Badge tone={ch.tone}>{ch.label}</Badge>
                        {sq.sentAt && (
                          <span className="text-xs text-gray-400">enviado em {formatDate(sq.sentAt)}</span>
                        )}
                        <span className="flex-1" />
                        <DispatchPanel
                          supplierQuoteId={sq.id}
                          mailtoHref={mailtoHref}
                          whatsappHref={whatsappHref}
                        />
                      </div>

                      {sq.notes && (
                        <p className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-500">{sq.notes}</p>
                      )}

                      {sq.status !== "SELECTED" && quotation.status !== "ORDERED" && (
                        <div className="mt-3 flex items-center gap-3">
                          <QuoteEditor
                            supplierQuoteId={sq.id}
                            supplierName={sq.supplier.name}
                            items={editorItems}
                            leadTimeDays={sq.leadTimeDays != null ? String(sq.leadTimeDays) : ""}
                            notes={sq.notes ?? ""}
                            received={sq.totalCents > 0}
                          />
                          <form action={rejectSupplierQuote}>
                            <input type="hidden" name="supplierQuoteId" value={sq.id} />
                            <button
                              type="submit"
                              className="text-xs font-medium text-gray-400 hover:text-red-600"
                            >
                              {sq.status === "REJECTED" ? "Reincluir" : "Descartar"}
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold text-gray-900">Informações</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Cliente" value={quotation.client?.name ?? "—"} />
              <Row label="Projeto" value={quotation.project?.name ?? "—"} />
              <Row label="Prazo de retorno" value={formatDate(quotation.deadline)} />
              <Row label="Criada por" value={quotation.createdBy?.name ?? "—"} />
              <Row label="Criada em" value={formatDate(quotation.createdAt)} />
            </dl>
            <form action={cancelQuotation} className="mt-4">
              <input type="hidden" name="id" value={quotation.id} />
              <button
                type="submit"
                className="text-xs font-medium text-gray-400 hover:text-red-600"
              >
                {quotation.status === "CANCELLED" ? "Reabrir cotação" : "Cancelar cotação"}
              </button>
            </form>
          </Card>

          {canOrder && (
            <Card>
              <h2 className="mb-3 font-semibold text-gray-900">Pedido de produção</h2>
              <ProductionOrderForm quotes={eligibleQuotes} />
            </Card>
          )}

          {quotation.productionOrders.length > 0 && (
            <Card>
              <h2 className="mb-3 font-semibold text-gray-900">Pedidos gerados</h2>
              <div className="space-y-2">
                {quotation.productionOrders.map((po) => (
                  <Link
                    key={po.id}
                    href={`/producao/${po.id}`}
                    className="block rounded-lg border border-gray-100 p-3 text-sm hover:border-brand-200 hover:bg-brand-50/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{po.number}</span>
                      <span className="font-semibold text-brand-700">
                        {formatBRL(po.clientTotalCents)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{po.supplierQuote.supplier.name}</p>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {availableSuppliers.length > 0 && quotation.status !== "ORDERED" && (
            <Card>
              <h2 className="mb-3 font-semibold text-gray-900">Adicionar fornecedores</h2>
              <form action={addSuppliers} className="space-y-3">
                <input type="hidden" name="quotationId" value={quotation.id} />
                <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                  {availableSuppliers.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        name="supplierIds"
                        value={s.id}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-gray-700">{s.name}</span>
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Convidar selecionados
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-700">{value}</dd>
    </div>
  );
}
