"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session-guard";
import { prisma } from "@/lib/prisma";
import { parseToCents } from "@/lib/format";
import { computeBV } from "@/lib/quotation";

// ---------------------------------------------------------------------------
// Criar pedido de cotação (itens + fornecedores convidados)
// ---------------------------------------------------------------------------
export async function createQuotation(formData: FormData) {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const clientId = strOrNull(formData.get("clientId"));
  const projectId = strOrNull(formData.get("projectId"));

  // valida cliente/projeto pertencem à agência
  if (clientId) {
    const c = await prisma.client.findFirst({
      where: { id: clientId, agencyId: user.agencyId },
    });
    if (!c) return;
  }

  // Itens: arrays paralelos
  const descs = formData.getAll("itemDesc").map((v) => String(v).trim());
  const qtys = formData.getAll("itemQty").map((v) => Number(v) || 1);
  const units = formData.getAll("itemUnit").map((v) => String(v).trim() || "un");
  const specs = formData.getAll("itemSpec").map((v) => String(v).trim());

  const items = descs
    .map((description, i) => ({
      description,
      quantity: qtys[i] ?? 1,
      unit: units[i] ?? "un",
      spec: specs[i] || null,
    }))
    .filter((it) => it.description !== "");

  if (items.length === 0) return;

  // Fornecedores convidados
  const supplierIds = formData
    .getAll("supplierIds")
    .map((v) => String(v))
    .filter(Boolean);

  const validSuppliers = await prisma.supplier.findMany({
    where: { id: { in: supplierIds }, agencyId: user.agencyId },
    select: { id: true },
  });

  const count = await prisma.quotation.count({ where: { agencyId: user.agencyId } });
  const number = `COT-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  const deadlineRaw = String(formData.get("deadline") ?? "");

  const quotation = await prisma.quotation.create({
    data: {
      number,
      title,
      status: "DRAFT",
      deadline: deadlineRaw ? new Date(deadlineRaw) : null,
      notes: strOrNull(formData.get("notes")),
      agencyId: user.agencyId,
      clientId,
      projectId,
      createdById: user.id,
      items: { create: items },
      supplierQuotes: {
        create: validSuppliers.map((s) => ({
          supplierId: s.id,
          status: "INVITED",
        })),
      },
    },
  });

  redirect(`/cotacoes/${quotation.id}`);
}

// ---------------------------------------------------------------------------
// Convidar mais fornecedores para uma cotação existente
// ---------------------------------------------------------------------------
export async function addSuppliers(formData: FormData) {
  const user = await requireUser();
  const quotationId = String(formData.get("quotationId") ?? "");

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, agencyId: user.agencyId },
    include: { supplierQuotes: { select: { supplierId: true } } },
  });
  if (!quotation) return;

  const already = new Set(quotation.supplierQuotes.map((q) => q.supplierId));
  const supplierIds = formData
    .getAll("supplierIds")
    .map((v) => String(v))
    .filter((id) => id && !already.has(id));

  const valid = await prisma.supplier.findMany({
    where: { id: { in: supplierIds }, agencyId: user.agencyId },
    select: { id: true },
  });

  if (valid.length > 0) {
    await prisma.supplierQuote.createMany({
      data: valid.map((s) => ({
        quotationId,
        supplierId: s.id,
        status: "INVITED",
      })),
    });
  }

  revalidatePath(`/cotacoes/${quotationId}`);
}

// ---------------------------------------------------------------------------
// Marcar o disparo (e-mail/WhatsApp) como enviado a um fornecedor
// ---------------------------------------------------------------------------
export async function markDispatched(formData: FormData) {
  const user = await requireUser();
  const supplierQuoteId = String(formData.get("supplierQuoteId") ?? "");
  const channel = String(formData.get("channel") ?? "EMAIL");

  const sq = await prisma.supplierQuote.findFirst({
    where: { id: supplierQuoteId, quotation: { agencyId: user.agencyId } },
    include: { quotation: true },
  });
  if (!sq) return;

  await prisma.supplierQuote.update({
    where: { id: supplierQuoteId },
    data: { channel: channel as never, sentAt: sq.sentAt ?? new Date() },
  });

  // ao primeiro disparo, a cotação passa de rascunho para "enviada"
  if (sq.quotation.status === "DRAFT") {
    await prisma.quotation.update({
      where: { id: sq.quotationId },
      data: { status: "SENT" },
    });
  }

  revalidatePath(`/cotacoes/${sq.quotationId}`);
}

// Disparar para todos os fornecedores convidados de uma vez
export async function dispatchAll(formData: FormData) {
  const user = await requireUser();
  const quotationId = String(formData.get("quotationId") ?? "");
  const channel = String(formData.get("channel") ?? "BOTH");

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, agencyId: user.agencyId },
    include: { supplierQuotes: true },
  });
  if (!quotation) return;

  const now = new Date();
  await Promise.all(
    quotation.supplierQuotes
      .filter((sq) => sq.status === "INVITED")
      .map((sq) =>
        prisma.supplierQuote.update({
          where: { id: sq.id },
          data: { channel: channel as never, sentAt: sq.sentAt ?? now },
        }),
      ),
  );

  if (quotation.status === "DRAFT") {
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: "SENT" },
    });
  }

  revalidatePath(`/cotacoes/${quotationId}`);
}

// ---------------------------------------------------------------------------
// Lançar / atualizar o orçamento recebido de um fornecedor
// ---------------------------------------------------------------------------
export async function saveSupplierQuote(formData: FormData) {
  const user = await requireUser();
  const supplierQuoteId = String(formData.get("supplierQuoteId") ?? "");

  const sq = await prisma.supplierQuote.findFirst({
    where: { id: supplierQuoteId, quotation: { agencyId: user.agencyId } },
    include: { quotation: { include: { items: true } } },
  });
  if (!sq) return;

  const itemById = new Map(sq.quotation.items.map((it) => [it.id, it]));

  // linhas: arrays paralelos lineItemId[] + linePrice[]
  const itemIds = formData.getAll("lineItemId").map((v) => String(v));
  const prices = formData.getAll("linePrice").map((v) => parseToCents(String(v)));

  let totalCents = 0;
  const lines: { itemId: string; unitCents: number }[] = [];
  itemIds.forEach((itemId, i) => {
    const item = itemById.get(itemId);
    if (!item) return;
    const unitCents = prices[i] ?? 0;
    totalCents += unitCents * item.quantity;
    lines.push({ itemId, unitCents });
  });

  const leadTimeRaw = String(formData.get("leadTimeDays") ?? "");

  // regrava as linhas (apaga e recria) e marca como recebido
  await prisma.$transaction([
    prisma.supplierQuoteLine.deleteMany({ where: { supplierQuoteId } }),
    prisma.supplierQuoteLine.createMany({
      data: lines.map((l) => ({ supplierQuoteId, itemId: l.itemId, unitCents: l.unitCents })),
    }),
    prisma.supplierQuote.update({
      where: { id: supplierQuoteId },
      data: {
        totalCents,
        leadTimeDays: leadTimeRaw ? Number(leadTimeRaw) : null,
        notes: strOrNull(formData.get("notes")),
        status: sq.status === "SELECTED" ? "SELECTED" : "RECEIVED",
        respondedAt: sq.respondedAt ?? new Date(),
      },
    }),
  ]);

  // cotação passa a "orçada" quando há ao menos um retorno
  if (sq.quotation.status === "DRAFT" || sq.quotation.status === "SENT") {
    await prisma.quotation.update({
      where: { id: sq.quotationId },
      data: { status: "QUOTED" },
    });
  }

  revalidatePath(`/cotacoes/${sq.quotationId}`);
}

export async function rejectSupplierQuote(formData: FormData) {
  const user = await requireUser();
  const supplierQuoteId = String(formData.get("supplierQuoteId") ?? "");

  const sq = await prisma.supplierQuote.findFirst({
    where: { id: supplierQuoteId, quotation: { agencyId: user.agencyId } },
  });
  if (!sq) return;

  const next = sq.status === "REJECTED" ? (sq.totalCents > 0 ? "RECEIVED" : "INVITED") : "REJECTED";
  await prisma.supplierQuote.update({
    where: { id: supplierQuoteId },
    data: { status: next as never },
  });

  revalidatePath(`/cotacoes/${sq.quotationId}`);
}

// ---------------------------------------------------------------------------
// Gerar o pedido de produção a partir do fornecedor escolhido
// ---------------------------------------------------------------------------
export async function generateProductionOrder(formData: FormData) {
  const user = await requireUser();
  const supplierQuoteId = String(formData.get("supplierQuoteId") ?? "");

  const sq = await prisma.supplierQuote.findFirst({
    where: { id: supplierQuoteId, quotation: { agencyId: user.agencyId } },
    include: { quotation: true },
  });
  if (!sq) return;
  if (sq.totalCents <= 0) return; // precisa ter orçamento lançado

  const bvPercent = Number(String(formData.get("bvPercent") ?? "0").replace(",", ".")) || 0;
  const billingMethod = String(formData.get("billingMethod") ?? "FATURADO_LIQUIDO");
  const deliveryRaw = String(formData.get("deliveryDate") ?? "");

  const { bvCents, clientTotalCents } = computeBV(sq.totalCents, bvPercent);

  const count = await prisma.productionOrder.count({ where: { agencyId: user.agencyId } });
  const number = `PROD-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  const order = await prisma.productionOrder.create({
    data: {
      number,
      status: "OPEN",
      billingMethod: billingMethod as never,
      bvPercent,
      supplierCostCents: sq.totalCents,
      bvCents,
      clientTotalCents,
      deliveryDate: deliveryRaw ? new Date(deliveryRaw) : null,
      notes: strOrNull(formData.get("notes")),
      agencyId: user.agencyId,
      clientId: sq.quotation.clientId,
      quotationId: sq.quotationId,
      supplierQuoteId: sq.id,
      createdById: user.id,
    },
  });

  await prisma.$transaction([
    prisma.supplierQuote.update({
      where: { id: sq.id },
      data: { status: "SELECTED" },
    }),
    prisma.quotation.update({
      where: { id: sq.quotationId },
      data: { status: "ORDERED" },
    }),
  ]);

  redirect(`/producao/${order.id}`);
}

export async function cancelQuotation(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const quotation = await prisma.quotation.findFirst({
    where: { id, agencyId: user.agencyId },
  });
  if (!quotation) return;

  await prisma.quotation.update({
    where: { id },
    data: { status: quotation.status === "CANCELLED" ? "DRAFT" : "CANCELLED" },
  });

  revalidatePath(`/cotacoes/${id}`);
  revalidatePath("/cotacoes");
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
