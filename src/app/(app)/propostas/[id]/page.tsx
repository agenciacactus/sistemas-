import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { Card, PageHeader, Badge } from "@/components/ui";
import { meta, proposalStatus, proposalType } from "@/lib/labels";
import { setProposalStatus } from "../actions";

const STATUS_OPTIONS = ["DRAFT", "SENT", "APPROVED", "REJECTED", "EXPIRED"];

export default async function PropostaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const proposal = await prisma.proposal.findFirst({
    where: { id, agencyId: user.agencyId },
    include: { client: true, items: true, createdBy: true },
  });
  if (!proposal) notFound();

  const st = meta(proposalStatus, proposal.status);
  const tp = meta(proposalType, proposal.type);

  return (
    <div>
      <Link href="/propostas" className="mb-3 inline-block text-sm text-brand-600 hover:underline">
        ← Propostas
      </Link>
      <PageHeader
        title={proposal.title}
        subtitle={`${proposal.number} · ${proposal.client.name}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={tp.tone}>{tp.label}</Badge>
            <Badge tone={st.tone}>{st.label}</Badge>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="mb-4 font-semibold text-gray-900">Itens da proposta</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="pb-2 font-medium">Descrição</th>
                  <th className="pb-2 text-center font-medium">Qtd</th>
                  <th className="pb-2 text-right font-medium">Unitário</th>
                  <th className="pb-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {proposal.items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 text-gray-800">{it.description}</td>
                    <td className="py-2.5 text-center text-gray-500">{it.quantity}</td>
                    <td className="py-2.5 text-right text-gray-500">{formatBRL(it.unitCents)}</td>
                    <td className="py-2.5 text-right font-medium text-gray-800">
                      {formatBRL(it.quantity * it.unitCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 text-right text-sm font-medium text-gray-500">
                    Total
                  </td>
                  <td className="pt-3 text-right text-lg font-bold text-brand-700">
                    {formatBRL(proposal.totalCents)}
                  </td>
                </tr>
                {proposal.type === "FEE_MENSAL" && proposal.months && (
                  <tr>
                    <td colSpan={3} className="text-right text-xs text-gray-400">
                      Contrato de {proposal.months} meses
                    </td>
                    <td className="text-right text-xs text-gray-400">
                      {formatBRL(proposal.totalCents * proposal.months)} total
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
            {proposal.notes && (
              <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{proposal.notes}</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-semibold text-gray-900">Informações</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Cliente" value={proposal.client.name} />
              <Row label="Validade" value={formatDate(proposal.validUntil)} />
              <Row label="Criada por" value={proposal.createdBy?.name ?? "—"} />
              <Row label="Criada em" value={formatDate(proposal.createdAt)} />
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-gray-900">Alterar status</h2>
            <form action={setProposalStatus} className="flex gap-2">
              <input type="hidden" name="id" value={proposal.id} />
              <select
                name="status"
                defaultValue={proposal.status}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {meta(proposalStatus, s).label}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-700">{value}</dd>
    </div>
  );
}
