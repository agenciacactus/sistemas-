"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui";
import { generateSummaryAction } from "./actions";
import type { Summary } from "@/lib/ai";

export function SummaryPanel({
  initial,
  aiEnabled,
}: {
  initial: Summary;
  aiEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(generateSummaryAction, initial);
  const summary = state ?? initial;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">Resumo executivo</h2>
          <Badge tone={summary.source === "ai" ? "purple" : "gray"}>
            {summary.source === "ai" ? "Gerado por IA" : "Template"}
          </Badge>
        </div>
        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Gerando…" : summary.source === "ai" ? "Regenerar com IA" : "Gerar com IA"}
          </button>
        </form>
      </div>

      <div className="space-y-3 text-sm leading-relaxed text-gray-700">
        {summary.text.split("\n\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {!aiEnabled && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          A geração por IA usa a API do Claude. Configure a variável{" "}
          <code>ANTHROPIC_API_KEY</code> para ativar — sem ela, o resumo é montado por template.
        </p>
      )}
    </div>
  );
}
