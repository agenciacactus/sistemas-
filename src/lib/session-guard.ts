import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./auth";

/** Exige um usuário autenticado; redireciona para /login caso contrário. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
