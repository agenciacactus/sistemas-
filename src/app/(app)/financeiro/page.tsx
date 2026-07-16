import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, StatCard, EmptyState } from "@/components/ui";
import { CollapsibleForm, Field, inputClass } from "@/components/collapsible-form";
import { meta, entryType, entryStatus } from "@/lib/labels";
import { createEntry, togglePaid } from "./actions";

export default async function FinanceiroPage() {
  const user = await requireUser();

  const [entries, clients] = await Promise.all([
    prisma.financialEntry.findMany({
      where: { agencyId: user.agencyId },
      include: { client: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.client.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const sum = (t: string, paid: boolean) =>
    entries
      .filter((e) => e.type === t && (paid ? e.status === "PAID" : e.status === "PENDING"))
      .reduce((s, e) => s + e.amountCents, 0);

  const receivablePending = sum("RECEIVABLE", false);
  const payablePending = sum("PAYABLE", false);
  const receivedPaid = sum("RECEIVABLE", true);
  const paidOut = sum("PAYABLE", true);

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Contas a pagar e a receber"
        action={
          <CollapsibleForm buttonLabel="Novo lançamento" title="Novo lançamento" action={createEntry}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Descrição *">
                <input name="description" required className={inputClass} />
              </Field>
              <Field label="Tipo *">
                <select name="type" className={inputClass} defaultValue="RECEIVABLE">
                  <option value="RECEIVABLE">A receber</option>
                  <option value="PAYABLE">A pagar</option>
                </select>
              </Field>
              <Field label="Valor *">
                <input name="amount" required className={inputClass} placeholder="R$ 0,00" />
              </Field>
              <Field label="Vencimento *">
                <input name="dueDate" type="date" required className={inputClass} />
              </Field>
              <Field label="Categoria">
                <input name="category" className={inputClass} placeholder="fee, mídia, produção…" />
              </Field>
              <Field label="Cliente">
                <select name="clientId" className={inputClass} defaultValue="">
                  <option value="">— nenhum —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </CollapsibleForm>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="A receber (pendente)" value={formatBRL(receivablePending)} tone="positive" />
        <StatCard label="A pagar (pendente)" value={formatBRL(payablePending)} tone="negative" />
        <StatCard label="Recebido" value={formatBRL(receivedPaid)} />
        <StatCard label="Pago" value={formatBRL(paidOut)} />
      </div>

      <Card className="mt-6 p-0">
        {entries.length === 0 ? (
          <div className="p-5">
            <EmptyState message="Nenhum lançamento financeiro ainda." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Vencimento</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 text-right font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const t = meta(entryType, e.type);
                  const st = meta(entryStatus, e.status);
                  return (
                    <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{e.description}</td>
                      <td className="px-5 py-3 text-gray-500">{e.client?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-500">{e.category ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(e.dueDate)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={t.tone}>{t.label}</Badge>
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-semibold ${
                          e.type === "RECEIVABLE" ? "text-brand-700" : "text-red-600"
                        }`}
                      >
                        {formatBRL(e.amountCents)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <form action={togglePaid}>
                          <input type="hidden" name="id" value={e.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            {e.status === "PAID" ? "Reabrir" : "Baixar"}
                          </button>
                        </form>
                      </td>
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
