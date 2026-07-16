"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import { meta, campaignStatus, adPlatform, campaignObjective } from "@/lib/labels";
import { updateMetrics } from "./actions";

type Campaign = {
  id: string;
  name: string;
  clientName: string;
  platform: string;
  objective: string;
  status: string;
  budgetCents: number;
  spentCents: number;
  impressions: number;
  clicks: number;
  conversions: number;
};

const inputCls =
  "w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500";

export function CampaignCard({ c }: { c: Campaign }) {
  const [editing, setEditing] = useState(false);

  const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
  const cpc = c.clicks > 0 ? c.spentCents / c.clicks : 0;
  const cpl = c.conversions > 0 ? c.spentCents / c.conversions : 0;
  const budgetUsed = c.budgetCents > 0 ? (c.spentCents / c.budgetCents) * 100 : 0;

  const st = meta(campaignStatus, c.status);
  const pl = meta(adPlatform, c.platform);
  const ob = meta(campaignObjective, c.objective);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">{c.name}</h3>
          <p className="text-xs text-gray-400">{c.clientName}</p>
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>

      <div className="mb-3 flex gap-2">
        <Badge tone={pl.tone}>{pl.label}</Badge>
        <Badge tone={ob.tone}>{ob.label}</Badge>
      </div>

      <div className="mb-1 flex justify-between text-xs text-gray-500">
        <span>Investido {formatBRL(c.spentCents)}</span>
        <span>Verba {formatBRL(c.budgetCents)}</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${Math.min(budgetUsed, 100)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Impressões" value={c.impressions.toLocaleString("pt-BR")} />
        <Metric label="Cliques" value={c.clicks.toLocaleString("pt-BR")} />
        <Metric label="Conversões" value={String(c.conversions)} />
        <Metric label="CTR" value={`${ctr.toFixed(2)}%`} />
        <Metric label="CPC" value={formatBRL(Math.round(cpc))} />
        <Metric label="CPL" value={formatBRL(Math.round(cpl))} />
      </div>

      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="mt-4 w-full rounded-lg bg-gray-100 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
        >
          Atualizar métricas
        </button>
      ) : (
        <form
          action={updateMetrics}
          className="mt-4 space-y-2 border-t border-gray-100 pt-3"
          onSubmit={() => setEditing(false)}
        >
          <input type="hidden" name="id" value={c.id} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-500">
              Investido
              <input
                name="spent"
                defaultValue={(c.spentCents / 100).toFixed(2)}
                className={inputCls}
              />
            </label>
            <label className="text-xs text-gray-500">
              Status
              <select name="status" defaultValue={c.status} className={inputCls}>
                <option value="DRAFT">Rascunho</option>
                <option value="ACTIVE">Ativa</option>
                <option value="PAUSED">Pausada</option>
                <option value="ENDED">Encerrada</option>
              </select>
            </label>
            <label className="text-xs text-gray-500">
              Impressões
              <input name="impressions" type="number" defaultValue={c.impressions} className={inputCls} />
            </label>
            <label className="text-xs text-gray-500">
              Cliques
              <input name="clicks" type="number" defaultValue={c.clicks} className={inputCls} />
            </label>
            <label className="text-xs text-gray-500">
              Conversões
              <input name="conversions" type="number" defaultValue={c.conversions} className={inputCls} />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-brand-600 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 py-2">
      <p className="text-sm font-semibold text-gray-800">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
    </div>
  );
}
