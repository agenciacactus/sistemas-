import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-2xl">
            🌵
          </div>
          <h1 className="text-xl font-bold text-gray-900">Cactus</h1>
          <p className="text-sm text-gray-500">Gestão de Agência</p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-gray-400">
          Demo: atendimento@agenciacactus.com.br / cactus123
        </p>
      </div>
    </main>
  );
}
