import Link from "next/link";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { CollapsibleForm, Field, inputClass } from "@/components/collapsible-form";
import { meta, projectStatus } from "@/lib/labels";
import { createProject } from "./actions";

export default async function ProjetosPage() {
  const user = await requireUser();

  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
      where: { agencyId: user.agencyId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Projetos"
        subtitle="Trabalhos e contas em andamento"
        action={
          <CollapsibleForm buttonLabel="Novo projeto" title="Cadastrar projeto" action={createProject}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome *">
                <input name="name" required className={inputClass} />
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
              <Field label="Início">
                <input name="startDate" type="date" className={inputClass} />
              </Field>
              <Field label="Status">
                <select name="status" className={inputClass} defaultValue="ACTIVE">
                  <option value="PLANNING">Planejamento</option>
                  <option value="ACTIVE">Em andamento</option>
                  <option value="ON_HOLD">Pausado</option>
                  <option value="DONE">Concluído</option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Descrição">
                  <textarea name="description" rows={2} className={inputClass} />
                </Field>
              </div>
            </div>
          </CollapsibleForm>
        }
      />

      {projects.length === 0 ? (
        <EmptyState message="Nenhum projeto cadastrado. Crie o primeiro para começar." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const st = meta(projectStatus, p.status);
            return (
              <Card key={p.id}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <Link
                  href={`/clientes/${p.clientId}`}
                  className="text-sm text-brand-600 hover:underline"
                >
                  {p.client.name}
                </Link>
                {p.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">{p.description}</p>
                )}
                <p className="mt-3 text-xs text-gray-400">
                  Início: {formatDate(p.startDate)}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
