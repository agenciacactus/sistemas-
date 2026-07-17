// Regras de negócio da cotação com fornecedores e do pedido de produção.

import { formatBRL, formatDate } from "./format";

/**
 * Calcula o BV (Bonificação de Volume) da agência sobre o custo do fornecedor.
 * O BV é um markup percentual sobre o custo líquido; o total faturado contra
 * o cliente é custo + BV.
 */
export function computeBV(supplierCostCents: number, bvPercent: number) {
  const pct = Number.isFinite(bvPercent) ? Math.max(0, bvPercent) : 0;
  const bvCents = Math.round((supplierCostCents * pct) / 100);
  const clientTotalCents = supplierCostCents + bvCents;
  return { bvCents, clientTotalCents };
}

/**
 * Deriva os títulos financeiros de um pedido de produção conforme a forma
 * de faturamento contra o cliente.
 *
 * - FATURADO_LIQUIDO: a agência paga o líquido ao fornecedor (a pagar) e
 *   fatura o total (custo + BV) contra o cliente (a receber).
 * - SIGA: o fornecedor fatura o cliente direto; a agência só recebe o BV.
 */
export function deriveFinancialEntries(opts: {
  billingMethod: "SIGA" | "FATURADO_LIQUIDO";
  orderNumber: string;
  supplierName: string;
  supplierCostCents: number;
  bvCents: number;
  clientTotalCents: number;
}): { description: string; type: "PAYABLE" | "RECEIVABLE"; amountCents: number }[] {
  const entries: {
    description: string;
    type: "PAYABLE" | "RECEIVABLE";
    amountCents: number;
  }[] = [];

  if (opts.billingMethod === "SIGA") {
    entries.push({
      description: `BV da agência — ${opts.orderNumber} (${opts.supplierName})`,
      type: "RECEIVABLE",
      amountCents: opts.bvCents,
    });
  } else {
    entries.push({
      description: `Pagamento fornecedor — ${opts.orderNumber} (${opts.supplierName})`,
      type: "PAYABLE",
      amountCents: opts.supplierCostCents,
    });
    entries.push({
      description: `Faturamento produção — ${opts.orderNumber}`,
      type: "RECEIVABLE",
      amountCents: opts.clientTotalCents,
    });
  }

  return entries.filter((e) => e.amountCents > 0);
}

type DispatchItem = {
  description: string;
  quantity: number;
  unit: string;
  spec?: string | null;
};

/**
 * Monta a mensagem do pedido de cotação enviada ao fornecedor (e-mail/WhatsApp).
 */
export function buildDispatchMessage(opts: {
  agencyName: string;
  supplierContact?: string | null;
  supplierName: string;
  quotationNumber: string;
  quotationTitle: string;
  items: DispatchItem[];
  deadline?: Date | string | null;
  responderName?: string | null;
  responderEmail?: string | null;
}): string {
  const greetingName = opts.supplierContact?.trim() || opts.supplierName;
  const lines: string[] = [];

  lines.push(`Olá, ${greetingName}!`);
  lines.push("");
  lines.push(
    `Somos da ${opts.agencyName} e gostaríamos de solicitar um orçamento para o pedido de cotação ${opts.quotationNumber} — ${opts.quotationTitle}.`,
  );
  lines.push("");
  lines.push("Itens para cotação:");
  opts.items.forEach((it, i) => {
    const spec = it.spec ? ` (${it.spec})` : "";
    lines.push(`${i + 1}. ${it.quantity} ${it.unit} — ${it.description}${spec}`);
  });
  lines.push("");
  if (opts.deadline) {
    lines.push(`Prazo para retorno do orçamento: ${formatDate(opts.deadline)}.`);
  }
  lines.push(
    "Por favor, responda com o valor unitário de cada item, prazo de entrega e condições de pagamento.",
  );
  lines.push("");
  lines.push("Desde já agradecemos.");
  const signOff = opts.responderName
    ? `${opts.responderName} — ${opts.agencyName}`
    : opts.agencyName;
  lines.push(signOff);
  if (opts.responderEmail) lines.push(opts.responderEmail);

  return lines.join("\n");
}

/** Normaliza um telefone brasileiro para o formato aceito pelo wa.me (só dígitos, com DDI 55). */
export function normalizeWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  // se já vier com DDI 55, mantém; senão prefixa
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/** Link wa.me com a mensagem pré-preenchida. */
export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const wa = normalizeWhatsApp(phone);
  if (!wa) return null;
  return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
}

/** Link mailto com assunto e corpo pré-preenchidos. */
export function mailtoLink(
  email: string | null | undefined,
  subject: string,
  body: string,
): string | null {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Resumo curto de uma linha de item para exibição. */
export function itemLabel(it: DispatchItem): string {
  return `${it.quantity} ${it.unit} · ${it.description}`;
}

export { formatBRL };
