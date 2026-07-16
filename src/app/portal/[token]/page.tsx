import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { meta, approvalStatus } from "@/lib/labels";
import { approve, requestChanges } from "./actions";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const client = await prisma.client.findUnique({
    where: { portalToken: token },
    include: { agency: true },
  });
  if (!client) notFound();

  const deliverables = await prisma.deliverable.findMany({
    where: { clientId: client.id },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const pending = deliverables.filter((d) => d.status === "APPROVAL");
  const history = deliverables.filter(
    (d) => d.approval === "APPROVED" || d.approval === "CHANGES_REQUESTED",
  );

  const approveWithToken = approve.bind(null, token);
  const requestChangesWithToken = requestChanges.bind(null, token);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      {/* cabeçalho */}
      <header className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-xl">
          🌵
        </span>
        <div>
          <p className="text-sm text-gray-400">{client.agency.name}</p>
          <h1 className="text-xl font-bold text-gray-900">
            Aprovação de peças · {client.name}
          </h1>
        </div>
      </header>

      {/* aguardando aprovação */}
      <section className="mb-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Aguardando sua aprovação ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-400">
            Tudo em dia! Nenhuma peça aguardando aprovação no momento.
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((d) => (
              <article key={d.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {d.previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.previewUrl}
                    alt={d.title}
                    className="max-h-72 w-full bg-gray-50 object-contain"
                  />
                )}
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{d.title}</h3>
                      <p className="text-xs text-gray-400">
                        {d.type ?? "peça"}
                        {d.dueDate ? ` · prazo ${formatDate(d.dueDate)}` : ""}
                      </p>
                    </div>
                  </div>

                  {d.clientNote && (
                    <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      Ajuste anterior: {d.clientNote}
                    </p>
                  )}

                  <form className="space-y-3">
                    <input type="hidden" name="deliverableId" value={d.id} />
                    <textarea
                      name="note"
                      rows={2}
                      placeholder="Comentário (opcional, obrigatório ao pedir ajustes)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        formAction={approveWithToken}
                        className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                      >
                        ✓ Aprovar
                      </button>
                      <button
                        type="submit"
                        formAction={requestChangesWithToken}
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        Pedir ajustes
                      </button>
                    </div>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* histórico */}
      {history.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Histórico
          </h2>
          <div className="space-y-2">
            {history.map((d) => {
              const ap = meta(approvalStatus, d.approval);
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.title}</p>
                    <p className="text-xs text-gray-400">
                      revisado em {formatDate(d.reviewedAt)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      d.approval === "APPROVED"
                        ? "bg-brand-50 text-brand-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {ap.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <footer className="mt-12 text-center text-xs text-gray-300">
        Portal de aprovação · {client.agency.name}
      </footer>
    </main>
  );
}
