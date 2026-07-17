import Link from "next/link";
import { requireUser } from "@/lib/session-guard";
import { getInsights, type Severity } from "@/lib/insights";
import { templateExecutiveSummary, aiConfigured } from "@/lib/ai";
import { PageHeader, Card, StatCard, EmptyState } from "@/components/ui";
import { SummaryPanel } from "./summary-panel";

const SEVERITY_META: Record<Severity, { label: string; badge: string; dot: string }> = {
  critical: { label: "Crítico", badge: "bg-red-50 text-red-700", dot: "bg-red-500" },
  warning: { label: "Atenção", badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  info: { label: "Info", badge: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
};

export default async function IAPage() {
  const user = await requireUser();

  const [insights, summary] = await Promise.all([
    getInsights(user.agencyId),
    templateExecutiveSummary(user.agencyId, user.agencyName),
  ]);

  const counts = {
    critical: insights.filter((i) => i.severity === "critical").length,
    warning: insights.filter((i) => i.severity === "warning").length,
    info: insights.filter((i) => i.severity === "info").length,
  };

  return (
    <div>
      <PageHeader
        title="IA & Insights"
        subtitle="Alertas inteligentes e resumo executivo da agência"
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Críticos" value={String(counts.critical)} tone={counts.critical > 0 ? "negative" : "default"} />
        <StatCard label="Atenção" value={String(counts.warning)} tone={counts.warning > 0 ? "warning" : "default"} />
        <StatCard label="Informações" value={String(counts.info)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold text-gray-900">Alertas</h2>
          {insights.length === 0 ? (
            <EmptyState message="Tudo sob controle. Nenhum alerta no momento." />
          ) : (
            <div className="space-y-2">
              {insights.map((ins, i) => {
                const meta = SEVERITY_META[ins.severity];
                return (
                  <Link
                    key={i}
                    href={ins.href}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition hover:bg-gray-50"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{ins.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">{ins.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <SummaryPanel initial={summary} aiEnabled={aiConfigured()} />
        </Card>
      </div>
    </div>
  );
}
