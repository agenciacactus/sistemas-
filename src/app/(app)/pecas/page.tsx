import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { PageHeader, Badge } from "@/components/ui";
import { CollapsibleForm, Field, inputClass } from "@/components/collapsible-form";
import { meta, deliverableStatus, approvalStatus } from "@/lib/labels";
import { createDeliverable, advanceDeliverable } from "./actions";

const COLUMNS = ["BRIEFING", "IN_PRODUCTION", "REVIEW", "APPROVAL", "DELIVERED"];

export default async function PecasPage() {
  const user = await requireUser();

  const [deliverables, clients] = await Promise.all([
    prisma.deliverable.findMany({
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

  return (
    <div>
      <PageHeader
        title="Peças & Produção"
        subtitle="Fluxo de produção de peças avulsas e entregáveis"
        action={
          <CollapsibleForm buttonLabel="Nova peça" title="Cadastrar peça" action={createDeliverable}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título *">
                <input name="title" required className={inputClass} />
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
              <Field label="Tipo">
                <input name="type" className={inputClass} placeholder="post, vídeo, banner…" />
              </Field>
              <Field label="Valor">
                <input name="price" className={inputClass} placeholder="R$ 0,00" />
              </Field>
              <Field label="Prazo">
                <input name="dueDate" type="date" className={inputClass} />
              </Field>
              <Field label="Status inicial">
                <select name="status" className={inputClass} defaultValue="BRIEFING">
                  {COLUMNS.map((s) => (
                    <option key={s} value={s}>
                      {meta(deliverableStatus, s).label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </CollapsibleForm>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const cm = meta(deliverableStatus, col);
          const items = deliverables.filter((d) => d.status === col);
          return (
            <div key={col} className="rounded-xl bg-gray-100/60 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-gray-700">{cm.label}</span>
                <span className="text-xs text-gray-400">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((d) => (
                  <div key={d.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium text-gray-900">{d.title}</p>
                    <p className="text-xs text-gray-400">{d.client.name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      {d.type && <Badge tone="gray">{d.type}</Badge>}
                      {d.priceCents > 0 && (
                        <span className="text-xs font-medium text-gray-600">
                          {formatBRL(d.priceCents)}
                        </span>
                      )}
                    </div>
                    {d.approval !== "PENDING" && (
                      <div className="mt-2">
                        <Badge tone={meta(approvalStatus, d.approval).tone}>
                          {meta(approvalStatus, d.approval).label}
                        </Badge>
                        {d.approval === "CHANGES_REQUESTED" && d.clientNote && (
                          <p className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                            {d.clientNote}
                          </p>
                        )}
                      </div>
                    )}
                    {d.dueDate && (
                      <p className="mt-1 text-xs text-gray-400">Prazo: {formatDate(d.dueDate)}</p>
                    )}
                    <form action={advanceDeliverable} className="mt-2">
                      <input type="hidden" name="id" value={d.id} />
                      <select
                        name="status"
                        defaultValue={d.status}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 outline-none focus:border-brand-500"
                      >
                        {COLUMNS.map((s) => (
                          <option key={s} value={s}>
                            → {meta(deliverableStatus, s).label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="mt-1 w-full rounded bg-gray-100 py-1 text-xs font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-700"
                      >
                        Mover
                      </button>
                    </form>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-gray-300">Vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
