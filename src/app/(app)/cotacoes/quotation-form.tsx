"use client";

import { useState } from "react";
import { inputClass, Field } from "@/components/collapsible-form";
import { createQuotation } from "./actions";

type Option = { id: string; name: string };
type SupplierOption = { id: string; name: string; category: string };
type Item = { description: string; quantity: string; unit: string; spec: string };

const emptyItem: Item = { description: "", quantity: "1", unit: "un", spec: "" };

export function QuotationForm({
  clients,
  projects,
  suppliers,
}: {
  clients: Option[];
  projects: Option[];
  suppliers: SupplierOption[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([{ ...emptyItem }]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }
  function toggleSupplier(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        + Novo pedido de cotação
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Novo pedido de cotação</h3>
        <button onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-600">
          Cancelar
        </button>
      </div>

      <form action={createQuotation} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título / objeto *">
            <input name="title" required className={inputClass} placeholder="Ex.: Impressão de folder institucional" />
          </Field>
          <Field label="Prazo para retorno">
            <input name="deadline" type="date" className={inputClass} />
          </Field>
          <Field label="Cliente">
            <select name="clientId" className={inputClass} defaultValue="">
              <option value="">— sem cliente —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Projeto">
            <select name="projectId" className={inputClass} defaultValue="">
              <option value="">— sem projeto —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Itens */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Itens a cotar</span>
            <button type="button" onClick={addItem} className="text-sm text-brand-600 hover:underline">
              + Adicionar item
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <input
                  name="itemDesc"
                  value={it.description}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  placeholder="Descrição do item"
                  className={inputClass + " min-w-[180px] flex-1"}
                />
                <input
                  name="itemQty"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                  type="number"
                  min={1}
                  className={inputClass + " w-20"}
                  aria-label="Quantidade"
                />
                <input
                  name="itemUnit"
                  value={it.unit}
                  onChange={(e) => updateItem(idx, { unit: e.target.value })}
                  placeholder="un"
                  className={inputClass + " w-20"}
                  aria-label="Unidade"
                />
                <input
                  name="itemSpec"
                  value={it.spec}
                  onChange={(e) => updateItem(idx, { spec: e.target.value })}
                  placeholder="Especificação (opcional)"
                  className={inputClass + " min-w-[160px] flex-1"}
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="px-2 text-gray-400 hover:text-red-600"
                  aria-label="Remover item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Fornecedores convidados */}
        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">
            Fornecedores para cotar {selected.size > 0 && `(${selected.size})`}
          </span>
          {suppliers.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              Nenhum fornecedor ativo. Cadastre fornecedores antes de disparar cotações.
            </p>
          ) : (
            <div className="grid max-h-48 gap-1 overflow-y-auto rounded-lg border border-gray-200 p-2 sm:grid-cols-2">
              {suppliers.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    name="supplierIds"
                    value={s.id}
                    checked={selected.has(s.id)}
                    onChange={() => toggleSupplier(s.id)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-gray-700">{s.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <Field label="Observações">
          <textarea name="notes" rows={2} className={inputClass} />
        </Field>

        <div className="flex justify-end border-t border-gray-100 pt-4">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Criar cotação
          </button>
        </div>
      </form>
    </div>
  );
}
