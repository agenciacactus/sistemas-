"use client";

import { useMemo, useState } from "react";
import { inputClass, Field } from "@/components/collapsible-form";
import { formatBRL, parseToCents } from "@/lib/format";
import { createProposal } from "./actions";

type ClientOption = { id: string; name: string };
type Item = { description: string; quantity: string; price: string };

const emptyItem: Item = { description: "", quantity: "1", price: "" };

export function ProposalForm({ clients }: { clients: ClientOption[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([{ ...emptyItem }]);

  const total = useMemo(
    () =>
      items.reduce(
        (s, it) => s + (Number(it.quantity) || 0) * parseToCents(it.price),
        0,
      ),
    [items],
  );

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { ...emptyItem }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        + Nova proposta
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Nova proposta</h3>
        <button onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-gray-600">
          Cancelar
        </button>
      </div>

      <form action={createProposal} className="space-y-4">
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
            <select name="type" className={inputClass} defaultValue="FEE_MENSAL">
              <option value="FEE_MENSAL">Fee mensal</option>
              <option value="PROJETO">Projeto</option>
              <option value="PECA_AVULSA">Peça avulsa</option>
            </select>
          </Field>
          <Field label="Recorrência (meses)">
            <input name="months" type="number" min={1} className={inputClass} placeholder="Ex.: 12" />
          </Field>
          <Field label="Válida até">
            <input name="validUntil" type="date" className={inputClass} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Itens</span>
            <button type="button" onClick={addItem} className="text-sm text-brand-600 hover:underline">
              + Adicionar item
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  name="itemDesc"
                  value={it.description}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  placeholder="Descrição do serviço"
                  className={inputClass + " flex-1"}
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
                  name="itemPrice"
                  value={it.price}
                  onChange={(e) => updateItem(idx, { price: e.target.value })}
                  placeholder="R$ 0,00"
                  className={inputClass + " w-32"}
                  aria-label="Valor unitário"
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

        <Field label="Observações">
          <textarea name="notes" rows={2} className={inputClass} />
        </Field>

        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="text-sm text-gray-500">
            Total: <strong className="text-gray-900">{formatBRL(total)}</strong>
          </span>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Criar proposta
          </button>
        </div>
      </form>
    </div>
  );
}
