import Link from "next/link";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { meta, proposalStatus, proposalType } from "@/lib/labels";
import { ProposalForm } from "./proposal-form";

export default async function PropostasPage() {
  const user = await requireUser();

  const [proposals, clients] = await Promise.all([
    prisma.proposal.findMany({
      where: { agencyId: user.agencyId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const approvedTotal = proposals
    .filter((p) => p.status === "APPROVED")
    .reduce((s, p) => s + p.totalCents, 0);

  return (
    <div>
      <PageHeader
        title="Propostas & Fee"
        subtitle={`${proposals.length} propostas · ${formatBRL(approvedTotal)} aprovado`}
        action={<ProposalForm clients={clients} />}
      />

      {proposals.length === 0 ? (
        <EmptyState message="Nenhuma proposta ainda. Crie uma proposta de fee ou peça avulsa." />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-3 font-medium">Número</th>
                  <th className="px-5 py-3 font-medium">Título</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Validade</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((p) => {
                  const st = meta(proposalStatus, p.status);
                  const tp = meta(proposalType, p.type);
                  return (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-400">{p.number}</td>
                      <td className="px-5 py-3">
                        <Link href={`/propostas/${p.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                          {p.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{p.client.name}</td>
                      <td className="px-5 py-3">
                        <Badge tone={tp.tone}>{tp.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(p.validUntil)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-800">
                        {formatBRL(p.totalCents)}
                      </td>
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
