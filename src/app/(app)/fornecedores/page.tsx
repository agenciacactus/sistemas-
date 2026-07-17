import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { CollapsibleForm, Field, inputClass } from "@/components/collapsible-form";
import { meta, supplierCategory } from "@/lib/labels";
import { createSupplier, toggleSupplier } from "./actions";

const CATEGORY_OPTIONS = [
  "GRAFICA",
  "BRINDES",
  "AUDIOVISUAL",
  "FOTOGRAFIA",
  "EVENTOS",
  "IMPRESSAO_GRANDE",
  "WEB_TECH",
  "OUTRO",
];

export default async function FornecedoresPage() {
  const user = await requireUser();

  const suppliers = await prisma.supplier.findMany({
    where: { agencyId: user.agencyId },
    include: { _count: { select: { quotes: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const activeCount = suppliers.filter((s) => s.active).length;

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle={`${activeCount} ativos · ${suppliers.length} no total`}
        action={
          <CollapsibleForm
            buttonLabel="Novo fornecedor"
            title="Cadastrar fornecedor"
            action={createSupplier}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome / Razão social *">
                <input name="name" required className={inputClass} />
              </Field>
              <Field label="Categoria">
                <select name="category" className={inputClass} defaultValue="GRAFICA">
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {meta(supplierCategory, c).label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="CNPJ">
                <input name="cnpj" className={inputClass} placeholder="00.000.000/0001-00" />
              </Field>
              <Field label="Contato">
                <input name="contact" className={inputClass} placeholder="Pessoa responsável" />
              </Field>
              <Field label="E-mail">
                <input name="email" type="email" className={inputClass} />
              </Field>
              <Field label="Telefone / WhatsApp">
                <input name="phone" className={inputClass} placeholder="(11) 90000-0000" />
              </Field>
              <Field label="Cidade">
                <input name="city" className={inputClass} />
              </Field>
            </div>
            <Field label="Observações">
              <textarea name="notes" rows={2} className={inputClass} />
            </Field>
          </CollapsibleForm>
        }
      />

      {suppliers.length === 0 ? (
        <EmptyState message="Nenhum fornecedor cadastrado. Cadastre gráficas, produtoras e demais parceiros para disparar cotações." />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-5 py-3 font-medium">Fornecedor</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Contato</th>
                  <th className="px-5 py-3 font-medium">Cotações</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => {
                  const cat = meta(supplierCategory, s.category);
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${
                        s.active ? "" : "opacity-60"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{s.name}</p>
                        {s.city && <p className="text-xs text-gray-400">{s.city}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={cat.tone}>{cat.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {s.email ?? "—"}
                        {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{s._count.quotes}</td>
                      <td className="px-5 py-3">
                        <Badge tone={s.active ? "green" : "gray"}>
                          {s.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <form action={toggleSupplier} className="inline">
                          <input type="hidden" name="id" value={s.id} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-gray-500 hover:text-brand-700"
                          >
                            {s.active ? "Desativar" : "Reativar"}
                          </button>
                        </form>
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
