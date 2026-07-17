"use client";

import { useMemo, useState } from "react";
import { inputClass, Field } from "@/components/collapsible-form";
import { formatBRL } from "@/lib/format";
import { computeBV } from "@/lib/quotation";
import { generateProductionOrder } from "./actions";

type QuoteOption = { id: string; supplierName: string; totalCents: number };

export function ProductionOrderForm({ quotes }: { quotes: QuoteOption[] }) {
  const [open, setOpen] = useState(false);
  const [quoteId, setQuoteId] = useState(quotes[0]?.id ?? "");
  const [bv, setBv] = useState("0");
  const [billing, setBilling] = useState("FATURADO_LIQUIDO");

  const selected = quotes.find((q) => q.id === quoteId);
  const bvPercent = Number(bv.replace(",", ".")) || 0;

  const preview = useMemo(() => {
    const cost = selected?.totalCents ?? 0;
    return { cost, ...computeBV(cost, bvPercent) };
  }, [selected, bvPercent]);

  if (quotes.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
        Lance o orçamento de ao menos um fornecedor para gerar o pedido de produção.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Gerar pedido de produção
      </button>
    );
  }

  return (
    <form action={generateProductionOrder} className="space-y-4">
      <input type="hidden" name="supplierQuoteId" value={quoteId} />

      <Field label="Fornecedor escolhido *">
        <select
          value={quoteId}
          onChange={(e) => setQuoteId(e.target.value)}
          className={inputClass}
        >
          {quotes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.supplierName} — {formatBRL(q.totalCents)}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="BV da agência (%)">
          <input
            name="bvPercent"
            value={bv}
            onChange={(e) => setBv(e.target.value)}
            inputMode="decimal"
            className={inputClass}
            placeholder="Ex.: 15"
          />
        </Field>
        <Field label="Prazo de entrega">
          <input name="deliveryDate" type="date" className={inputClass} />
        </Field>
      </div>

      <Field label="Forma de faturamento">
        <select
          name="billingMethod"
          value={billing}
          onChange={(e) => setBilling(e.target.value)}
          className={inputClass}
        >
          <option value="FATURADO_LIQUIDO">
            Faturado líquido contra o cliente aos cuidados da agência
          </option>
          <option value="SIGA">Faturamento SIGA (fornecedor fatura o cliente)</option>
        </select>
      </Field>

      <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
        {billing === "SIGA"
          ? "SIGA: o fornecedor fatura o valor líquido direto contra o cliente e a agência recebe o BV à parte."
          : "Faturado líquido a/c da agência: a agência fatura o total (custo + BV) contra o cliente e paga o líquido ao fornecedor."}
      </p>

      {/* Prévia do cálculo */}
      <div className="space-y-1.5 rounded-lg border border-gray-200 p-4 text-sm">
        <Row label="Custo do fornecedor (líquido)" value={formatBRL(preview.cost)} />
        <Row label={`BV da agência (${bvPercent || 0}%)`} value={formatBRL(preview.bvCents)} accent />
        <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-2">
          <span className="font-medium text-gray-700">Total faturado ao cliente</span>
          <span className="text-lg font-bold text-brand-700">
            {formatBRL(preview.clientTotalCents)}
          </span>
        </div>
      </div>

      <Field label="Observações do pedido">
        <textarea name="notes" rows={2} className={inputClass} />
      </Field>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Confirmar e gerar pedido
        </button>
      </div>
    </form>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={accent ? "font-medium text-brand-700" : "text-gray-700"}>{value}</span>
    </div>
  );
}
