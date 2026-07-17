import Link from "next/link";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { meta, quotationStatus } from "@/lib/labels";
import { QuotationForm } from "./quotation-form";

export default async function CotacoesPage() {
  const user = await requireUser();

  const [quotations, clients, projects, suppliers] = await Promise.all([
    prisma.quotation.findMany({
      where: { agencyId: user.agencyId },
      include: {
        client: { select: { name: true } },
        _count: { select: { items: true, supplierQuotes: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      where: { agencyId: user.agencyId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true },
    }),
  ]);

  const open = quotations.filter(
    (q) => q.status !== "ORDERED" && q.status !== "CANCELLED",
  ).length;

  return (
    <div>
      <PageHeader
        title="Cotações"
        subtitle={`${quotations.length} pedidos de cotação · ${open} em aberto`}
        action={<QuotationForm clients={clients} projects={projects} suppliers={suppliers} />}
      />

      {quotations.length === 0 ? (
        <EmptyState message="Nenhum pedido de cotação ainda. Crie um pedido, convide fornecedores e dispare por e-mail/WhatsApp." />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-3 font-medium">Número</th>
                  <th className="px-5 py-3 font-medium">Objeto</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 text-center font-medium">Itens</th>
                  <th className="px-5 py-3 text-center font-medium">Fornecedores</th>
                  <th className="px-5 py-3 font-medium">Prazo</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => {
                  const st = meta(quotationStatus, q.status);
                  return (
                    <tr key={q.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-400">{q.number}</td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/cotacoes/${q.id}`}
                          className="font-medium text-gray-900 hover:text-brand-700"
                        >
                          {q.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{q.client?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-center text-gray-500">{q._count.items}</td>
                      <td className="px-5 py-3 text-center text-gray-500">
                        {q._count.supplierQuotes}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(q.deadline)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={st.tone}>{st.label}</Badge>
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
