import { requireUser } from "@/lib/session-guard";
import { Sidebar } from "@/components/sidebar";
import { logout } from "../login/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.agencyName}</p>
            <p className="text-xs text-gray-400">Painel de gestão</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">{user.name}</p>
              <p className="text-xs text-gray-400">{roleLabel(user.role)}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
              >
                Sair
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    OWNER: "Administrador",
    MANAGER: "Atendimento",
    TRAFFIC: "Gestor de Tráfego",
    SOCIAL: "Social Media",
    PRODUCTION: "Produção",
    FINANCE: "Financeiro",
  };
  return map[role] ?? role;
}
