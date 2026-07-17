import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { PageHeader, Card, Badge } from "@/components/ui";
import {
  PROVIDERS,
  PROVIDER_ORDER,
  isConfigured,
  type Provider,
} from "@/lib/integrations/config";
import { syncAction, disconnectAction } from "./actions";

export default async function IntegracoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const rows = await prisma.integration.findMany({
    where: { agencyId: user.agencyId, clientId: null },
  });
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return (
    <div>
      <PageHeader
        title="Integrações"
        subtitle="Conecte Meta Ads, Google Ads e GA4 para sincronizar métricas automaticamente"
      />

      {sp.conectado && (
        <Banner tone="green">
          {PROVIDERS[sp.conectado as Provider]?.label ?? sp.conectado} conectado com sucesso.
        </Banner>
      )}
      {sp.desconectado && (
        <Banner tone="gray">
          {PROVIDERS[sp.desconectado as Provider]?.label ?? sp.desconectado} desconectado.
        </Banner>
      )}
      {sp.sync && (
        <Banner tone={sp.ok === "1" ? "green" : "amber"}>{sp.msg ?? "Sincronização concluída."}</Banner>
      )}
      {sp.erro && (
        <Banner tone="red">
          {sp.erro === "nao_configurado"
            ? "Este provedor ainda não tem credenciais configuradas no servidor (veja abaixo)."
            : `Não foi possível conectar: ${decodeURIComponent(sp.erro)}`}
        </Banner>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PROVIDER_ORDER.map((provider) => {
          const cfg = PROVIDERS[provider];
          const configured = isConfigured(provider);
          const row = byProvider.get(provider);
          const connected = row?.status === "CONNECTED";
          const errored = row?.status === "ERROR";

          return (
            <Card key={provider}>
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{cfg.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{cfg.label}</h3>
                    {connected ? (
                      <Badge tone="green">Conectado</Badge>
                    ) : errored ? (
                      <Badge tone="red">Erro</Badge>
                    ) : configured ? (
                      <Badge tone="gray">Desconectado</Badge>
                    ) : (
                      <Badge tone="amber">Não configurado</Badge>
                    )}
                  </div>
                </div>
              </div>

              <p className="mb-4 text-sm text-gray-500">{cfg.description}</p>

              {row?.lastSyncAt && (
                <p className="mb-1 text-xs text-gray-400">
                  Última sincronização: {formatDateTime(row.lastSyncAt)}
                </p>
              )}
              {errored && row?.lastError && (
                <p className="mb-3 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{row.lastError}</p>
              )}

              {!configured ? (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Defina <code>{cfg.clientIdEnv}</code> e <code>{cfg.clientSecretEnv}</code> no
                  ambiente para habilitar a conexão.{" "}
                  <a href={cfg.docsUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    Documentação
                  </a>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {connected ? (
                    <>
                      <form action={syncAction}>
                        <input type="hidden" name="provider" value={provider} />
                        <button
                          type="submit"
                          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                        >
                          Sincronizar agora
                        </button>
                      </form>
                      <form action={disconnectAction}>
                        <input type="hidden" name="provider" value={provider} />
                        <button
                          type="submit"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          Desconectar
                        </button>
                      </form>
                    </>
                  ) : (
                    <a
                      href={`/api/integrations/${provider}/connect`}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      Conectar
                    </a>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <h2 className="mb-2 font-semibold text-gray-900">Como funciona</h2>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-gray-600">
          <li>Configure as credenciais de cada plataforma nas variáveis de ambiente (veja o <code>.env.example</code>).</li>
          <li>Clique em <strong>Conectar</strong> — você é levado ao consentimento OAuth da plataforma.</li>
          <li>De volta ao sistema, use <strong>Sincronizar agora</strong> para importar campanhas (Mídia) e métricas (Relatórios).</li>
        </ol>
        <p className="mt-3 text-xs text-gray-400">
          Enquanto as credenciais não estiverem configuradas, os módulos de Mídia e Relatórios
          seguem funcionando com os dados de demonstração.
        </p>
      </Card>
    </div>
  );
}

function Banner({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "red" | "amber" | "gray";
}) {
  const cls = {
    green: "border-brand-200 bg-brand-50 text-brand-700",
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    gray: "border-gray-200 bg-gray-50 text-gray-600",
  }[tone];
  return <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${cls}`}>{children}</div>;
}
