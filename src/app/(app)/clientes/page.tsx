import Link from "next/link";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { CollapsibleForm, Field, inputClass } from "@/components/collapsible-form";
import { meta, clientStatus } from "@/lib/labels";
import { createClient } from "./actions";

export default async function ClientesPage() {
  const user = await requireUser();

  const clients = await prisma.client.findMany({
    where: { agencyId: user.agencyId },
    include: {
      accountManager: true,
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Carteira de clientes da agência"
        action={
          <CollapsibleForm
            buttonLabel="Novo cliente"
            title="Cadastrar cliente"
            action={createClient}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome *">
                <input name="name" required className={inputClass} />
              </Field>
              <Field label="Segmento">
                <input name="segment" className={inputClass} placeholder="Ex.: Alimentação" />
              </Field>
              <Field label="Contato">
                <input name="contact" className={inputClass} />
              </Field>
              <Field label="E-mail">
                <input name="email" type="email" className={inputClass} />
              </Field>
              <Field label="Telefone">
                <input name="phone" className={inputClass} />
              </Field>
              <Field label="Status">
                <select name="status" className={inputClass} defaultValue="ACTIVE">
                  <option value="ACTIVE">Ativo</option>
                  <option value="PROSPECT">Prospect</option>
                  <option value="PAUSED">Pausado</option>
                  <option value="CHURNED">Encerrado</option>
                </select>
              </Field>
            </div>
          </CollapsibleForm>
        }
      />

      {clients.length === 0 ? (
        <EmptyState message="Nenhum cliente cadastrado ainda." />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Segmento</th>
                  <th className="px-5 py-3 font-medium">Responsável</th>
                  <th className="px-5 py-3 font-medium">Projetos</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const st = meta(clientStatus, c.status);
                  return (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <Link href={`/clientes/${c.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                          {c.name}
                        </Link>
                        {c.contact && <p className="text-xs text-gray-400">{c.contact}</p>}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{c.segment ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-500">{c.accountManager?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-500">{c._count.projects}</td>
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
