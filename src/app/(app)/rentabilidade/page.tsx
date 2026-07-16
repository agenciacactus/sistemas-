import Link from "next/link";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatPct } from "@/lib/format";
import { getClientProfitability, sumProfit } from "@/lib/rentability";
import { PageHeader, Card, Badge, StatCard, EmptyState } from "@/components/ui";
import { CollapsibleForm, Field, inputClass } from "@/components/collapsible-form";
import { meta, clientStatus } from "@/lib/labels";
import { logTime, setHourlyCost } from "./actions";

export default async function RentabilidadePage() {
  const user = await requireUser();
  const agencyId = user.agencyId;

  const [rows, users, clients, projects] = await Promise.all([
    getClientProfitability(agencyId),
    prisma.user.findMany({
      where: { agencyId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, hourlyCostCents: true },
    }),
    prisma.client.findMany({
      where: { agencyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { agencyId },
      orderBy: { name: "asc" },
      include: { client: { select: { name: true } } },
    }),
  ]);

  const totals = sumProfit(rows);
  const worst = rows.filter((r) => r.marginCents < 0);

  return (
    <div>
      <PageHeader
        title="Rentabilidade por conta"
        subtitle="Receita − custos de mídia/externos − custo das horas = margem real de cada cliente"
        action={
          <CollapsibleForm buttonLabel="Apontar horas" title="Apontar horas" action={logTime}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Colaborador *">
                <select name="userId" required className={inputClass} defaultValue="">
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({formatBRL(u.hourlyCostCents)}/h)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cliente *">
                <select name="clientId" required className={inputClass} defaultValue="">
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Projeto (opcional)">
                <select name="projectId" className={inputClass} defaultValue="">
                  <option value="">— nenhum —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.client.name} — {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Horas *">
                <input name="hours" type="number" step="0.5" min="0.5" required className={inputClass} placeholder="Ex.: 4" />
              </Field>
              <Field label="Data">
                <input name="date" type="date" className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Descrição">
                  <input name="description" className={inputClass} placeholder="O que foi feito" />
                </Field>
              </div>
            </div>
          </CollapsibleForm>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Receita" value={formatBRL(totals.revenueCents)} tone="positive" />
        <StatCard label="Custos (mídia + horas)" value={formatBRL(totals.costCents)} tone="negative" />
        <StatCard
          label="Margem"
          value={formatBRL(totals.marginCents)}
          tone={totals.marginCents >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Margem média"
          value={formatPct(totals.marginPct)}
          tone={(totals.marginPct ?? 0) >= 0 ? "positive" : "negative"}
        />
      </div>

      {worst.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          ⚠️ {worst.length} conta{worst.length > 1 ? "s" : ""} no vermelho:{" "}
          {worst.map((r) => r.clientName).join(", ")}. Reavalie fee ou escopo.
        </div>
      )}

      <Card className="mt-6 p-0">
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState message="Sem clientes para analisar ainda." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 text-right font-medium">Receita</th>
                  <th className="px-5 py-3 text-right font-medium">Mídia/Externo</th>
                  <th className="px-5 py-3 text-right font-medium">Horas</th>
                  <th className="px-5 py-3 text-right font-medium">Custo horas</th>
                  <th className="px-5 py-3 text-right font-medium">Margem</th>
                  <th className="px-5 py-3 text-right font-medium">Margem %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = meta(clientStatus, r.status);
                  const negative = r.marginCents < 0;
                  return (
                    <tr
                      key={r.clientId}
                      className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${
                        negative ? "bg-red-50/40" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/clientes/${r.clientId}`}
                          className="font-medium text-gray-900 hover:text-brand-700"
                        >
                          {r.clientName}
                        </Link>{" "}
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-700">
                        {formatBRL(r.revenueCents)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-500">
                        {formatBRL(r.externalCostCents)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-500">
                        {r.hours.toLocaleString("pt-BR")}h
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-gray-500">
                        {formatBRL(r.laborCostCents)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-semibold tabular-nums ${
                          negative ? "text-red-600" : "text-brand-700"
                        }`}
                      >
                        {formatBRL(r.marginCents)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right tabular-nums ${
                          negative ? "text-red-600" : "text-gray-700"
                        }`}
                      >
                        {formatPct(r.marginPct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <h2 className="mb-1 font-semibold text-gray-900">Custo/hora da equipe</h2>
        <p className="mb-4 text-sm text-gray-500">
          Base do cálculo de custo das horas. Ajuste conforme salário + encargos ÷ horas produtivas.
        </p>
        <div className="space-y-2">
          {users.map((u) => (
            <form
              key={u.id}
              action={setHourlyCost}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2"
            >
              <input type="hidden" name="userId" value={u.id} />
              <div>
                <p className="text-sm font-medium text-gray-800">{u.name}</p>
                <p className="text-xs text-gray-400">{u.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">R$</span>
                <input
                  name="hourlyCost"
                  defaultValue={(u.hourlyCostCents / 100).toFixed(2)}
                  className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-right text-sm tabular-nums outline-none focus:border-brand-500"
                />
                <span className="text-xs text-gray-400">/h</span>
                <button
                  type="submit"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Salvar
                </button>
              </div>
            </form>
          ))}
        </div>
      </Card>
    </div>
  );
}
