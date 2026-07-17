"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/clientes", label: "Clientes", icon: "🏢" },
  { href: "/projetos", label: "Projetos", icon: "📁" },
  { href: "/propostas", label: "Propostas / Fee", icon: "📝" },
  { href: "/pecas", label: "Peças & Produção", icon: "🎨" },
  { href: "/fornecedores", label: "Fornecedores", icon: "🏭" },
  { href: "/cotacoes", label: "Cotações", icon: "🧾" },
  { href: "/producao", label: "Pedidos de Produção", icon: "📦" },
  { href: "/midia", label: "Mídia & Tráfego", icon: "🚀" },
  { href: "/redes", label: "Redes Sociais", icon: "📱" },
  { href: "/financeiro", label: "Financeiro", icon: "💰" },
  { href: "/rentabilidade", label: "Rentabilidade", icon: "💹" },
  { href: "/relatorios", label: "Relatórios", icon: "📈" },
  { href: "/ia", label: "IA & Insights", icon: "🤖" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg">
          🌵
        </span>
        <div>
          <p className="text-sm font-bold leading-tight text-gray-900">Cactus</p>
          <p className="text-xs leading-tight text-gray-400">Gestão de Agência</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
