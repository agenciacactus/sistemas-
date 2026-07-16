// Utilitários de formatação para o padrão brasileiro.

/** Formata centavos (Int) como moeda BRL. Ex.: 150000 -> "R$ 1.500,00" */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Converte uma string "1.500,00" ou "1500.00" para centavos (Int). */
export function parseToCents(value: string): number {
  if (!value) return 0;
  const normalized = value
    .trim()
    .replace(/[R$\s.]/g, "")
    .replace(",", ".");
  const num = Number(normalized);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
