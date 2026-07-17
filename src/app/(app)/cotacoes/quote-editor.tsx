"use client";

import { useMemo, useState } from "react";
import { inputClass } from "@/components/collapsible-form";
import { formatBRL, parseToCents } from "@/lib/format";
import { saveSupplierQuote } from "./actions";

type ItemRow = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  price: string; // valor unitário pré-preenchido (string editável)
};

export function QuoteEditor({
  supplierQuoteId,
  supplierName,
  items,
  leadTimeDays,
  notes,
  received,
}: {
  supplierQuoteId: string;
  supplierName: string;
  items: ItemRow[];
  leadTimeDays: string;
  notes: string;
  received: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ItemRow[]>(items);

  const total = useMemo(
    () => rows.reduce((s, r) => s + r.quantity * parseToCents(r.price), 0),
    [rows],
  );

  function updatePrice(id: string, price: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, price } : r)));
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
      >
        {received ? "Editar orçamento" : "Lançar orçamento"}
      </button>
    );
  }

  return (
    <form
      action={saveSupplierQuote}
      className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
    >
      <input type="hidden" name="supplierQuoteId" value={supplierQuoteId} />
      <p className="text-sm font-medium text-gray-700">
        Orçamento de <span className="text-gray-900">{supplierName}</span>
      </p>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <input type="hidden" name="lineItemId" value={r.id} />
            <span className="flex-1 text-sm text-gray-700">
              {r.quantity} {r.unit} · {r.description}
            </span>
            <input
              name="linePrice"
              value={r.price}
              onChange={(e) => updatePrice(r.id, e.target.value)}
              placeholder="R$ 0,00"
              className={inputClass + " w-32"}
              aria-label={`Valor unitário — ${r.description}`}
            />
            <span className="w-28 text-right text-sm text-gray-500">
              {formatBRL(r.quantity * parseToCents(r.price))}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Prazo de entrega (dias)</span>
          <input
            name="leadTimeDays"
            type="number"
            min={0}
            defaultValue={leadTimeDays}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Observações do fornecedor</span>
          <input name="notes" defaultValue={notes} className={inputClass} />
        </label>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 pt-3">
        <span className="text-sm text-gray-500">
          Total: <strong className="text-gray-900">{formatBRL(total)}</strong>
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Salvar orçamento
          </button>
        </div>
      </div>
    </form>
  );
}
