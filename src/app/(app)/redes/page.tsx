import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { PageHeader, Card, Badge, StatCard, EmptyState } from "@/components/ui";
import { CollapsibleForm, Field, inputClass } from "@/components/collapsible-form";
import { meta, socialPlatform, postStatus } from "@/lib/labels";
import { createAccount, createPost, setPostStatus } from "./actions";

const POST_FLOW = ["IDEA", "DRAFT", "SCHEDULED", "PUBLISHED"];

export default async function RedesPage() {
  const user = await requireUser();

  const [accounts, posts, clients] = await Promise.all([
    prisma.socialAccount.findMany({
      where: { agencyId: user.agencyId },
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.socialPost.findMany({
      where: { agencyId: user.agencyId },
      include: { account: { include: { client: true } } },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    }),
    prisma.client.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const scheduled = posts.filter((p) => p.status === "SCHEDULED").length;
  const published = posts.filter((p) => p.status === "PUBLISHED").length;

  return (
    <div>
      <PageHeader
        title="Redes Sociais"
        subtitle="Planejamento e agendamento de conteúdo (estilo mLabs)"
        action={
          <CollapsibleForm buttonLabel="Novo post" title="Agendar post" action={createPost}>
            <div className="grid gap-4">
              <Field label="Conta *">
                <select name="accountId" required className={inputClass} defaultValue="">
                  <option value="" disabled>
                    Selecione a conta…
                  </option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {meta(socialPlatform, a.platform).label} · {a.handle} ({a.client.name})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Legenda *">
                <textarea name="caption" required rows={3} className={inputClass} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="URL da mídia">
                  <input name="mediaUrl" className={inputClass} placeholder="https://…" />
                </Field>
                <Field label="Agendar para">
                  <input name="scheduledAt" type="datetime-local" className={inputClass} />
                </Field>
              </div>
              <p className="text-xs text-gray-400">
                Deixe a data em branco para salvar como rascunho.
              </p>
            </div>
          </CollapsibleForm>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Contas conectadas" value={String(accounts.filter((a) => a.connected).length)} />
        <StatCard label="Total de posts" value={String(posts.length)} />
        <StatCard label="Agendados" value={String(scheduled)} tone="positive" />
        <StatCard label="Publicados" value={String(published)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contas sociais */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Contas</h2>
            <CollapsibleForm buttonLabel="Conta" title="Conectar conta" action={createAccount}>
              <div className="grid gap-4">
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
                <Field label="Plataforma">
                  <select name="platform" className={inputClass} defaultValue="INSTAGRAM">
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="TIKTOK">TikTok</option>
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="YOUTUBE">YouTube</option>
                    <option value="X">X</option>
                  </select>
                </Field>
                <Field label="Perfil / @">
                  <input name="handle" required className={inputClass} placeholder="@perfil" />
                </Field>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" name="connected" /> Marcar como conectada
                </label>
              </div>
            </CollapsibleForm>
          </div>
          <div className="space-y-2">
            {accounts.length === 0 && <EmptyState message="Nenhuma conta." />}
            {accounts.map((a) => {
              const sp = meta(socialPlatform, a.platform);
              return (
                <Card key={a.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone={sp.tone}>{sp.label}</Badge>
                        <span className="text-sm font-medium text-gray-800">{a.handle}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{a.client.name}</p>
                    </div>
                    <Badge tone={a.connected ? "green" : "gray"}>
                      {a.connected ? "Conectada" : "Off"}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Calendário / fila de posts */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-semibold text-gray-900">Planejamento de conteúdo</h2>
          {posts.length === 0 ? (
            <EmptyState message="Nenhum post planejado ainda." />
          ) : (
            <div className="space-y-3">
              {posts.map((p) => {
                const ps = meta(postStatus, p.status);
                const sp = meta(socialPlatform, p.account.platform);
                return (
                  <Card key={p.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge tone={sp.tone}>{sp.label}</Badge>
                          <span className="text-xs text-gray-500">{p.account.handle}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{p.account.client.name}</span>
                        </div>
                        <p className="text-sm text-gray-800">{p.caption}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {p.status === "PUBLISHED"
                            ? `Publicado em ${formatDateTime(p.publishedAt)}`
                            : p.scheduledAt
                              ? `Agendado para ${formatDateTime(p.scheduledAt)}`
                              : "Sem agendamento"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge tone={ps.tone}>{ps.label}</Badge>
                        <form action={setPostStatus} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={p.id} />
                          <select
                            name="status"
                            defaultValue={p.status}
                            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 outline-none focus:border-brand-500"
                          >
                            {POST_FLOW.map((s) => (
                              <option key={s} value={s}>
                                {meta(postStatus, s).label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-700"
                          >
                            OK
                          </button>
                        </form>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
