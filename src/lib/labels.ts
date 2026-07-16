// Rótulos em português e cores (tone dos Badges) para os enums do domínio.

type Meta = { label: string; tone: string };

export const clientStatus: Record<string, Meta> = {
  ACTIVE: { label: "Ativo", tone: "green" },
  PROSPECT: { label: "Prospect", tone: "blue" },
  PAUSED: { label: "Pausado", tone: "amber" },
  CHURNED: { label: "Encerrado", tone: "red" },
};

export const projectStatus: Record<string, Meta> = {
  PLANNING: { label: "Planejamento", tone: "blue" },
  ACTIVE: { label: "Em andamento", tone: "green" },
  ON_HOLD: { label: "Pausado", tone: "amber" },
  DONE: { label: "Concluído", tone: "gray" },
  CANCELLED: { label: "Cancelado", tone: "red" },
};

export const proposalType: Record<string, Meta> = {
  FEE_MENSAL: { label: "Fee mensal", tone: "purple" },
  PROJETO: { label: "Projeto", tone: "blue" },
  PECA_AVULSA: { label: "Peça avulsa", tone: "gray" },
};

export const proposalStatus: Record<string, Meta> = {
  DRAFT: { label: "Rascunho", tone: "gray" },
  SENT: { label: "Enviada", tone: "blue" },
  APPROVED: { label: "Aprovada", tone: "green" },
  REJECTED: { label: "Recusada", tone: "red" },
  EXPIRED: { label: "Expirada", tone: "amber" },
};

export const deliverableStatus: Record<string, Meta> = {
  BRIEFING: { label: "Briefing", tone: "gray" },
  IN_PRODUCTION: { label: "Em produção", tone: "blue" },
  REVIEW: { label: "Revisão", tone: "amber" },
  APPROVAL: { label: "Aprovação", tone: "purple" },
  DELIVERED: { label: "Entregue", tone: "green" },
};

export const entryType: Record<string, Meta> = {
  RECEIVABLE: { label: "A receber", tone: "green" },
  PAYABLE: { label: "A pagar", tone: "red" },
};

export const entryStatus: Record<string, Meta> = {
  PENDING: { label: "Pendente", tone: "amber" },
  PAID: { label: "Pago", tone: "green" },
  OVERDUE: { label: "Vencido", tone: "red" },
  CANCELLED: { label: "Cancelado", tone: "gray" },
};

export const campaignStatus: Record<string, Meta> = {
  DRAFT: { label: "Rascunho", tone: "gray" },
  ACTIVE: { label: "Ativa", tone: "green" },
  PAUSED: { label: "Pausada", tone: "amber" },
  ENDED: { label: "Encerrada", tone: "gray" },
};

export const adPlatform: Record<string, Meta> = {
  META: { label: "Meta", tone: "blue" },
  GOOGLE: { label: "Google", tone: "red" },
  TIKTOK: { label: "TikTok", tone: "gray" },
  LINKEDIN: { label: "LinkedIn", tone: "blue" },
  OUTRO: { label: "Outro", tone: "gray" },
};

export const campaignObjective: Record<string, Meta> = {
  AWARENESS: { label: "Reconhecimento", tone: "gray" },
  TRAFFIC: { label: "Tráfego", tone: "blue" },
  ENGAGEMENT: { label: "Engajamento", tone: "purple" },
  LEADS: { label: "Leads", tone: "green" },
  SALES: { label: "Vendas", tone: "green" },
};

export const socialPlatform: Record<string, Meta> = {
  INSTAGRAM: { label: "Instagram", tone: "purple" },
  FACEBOOK: { label: "Facebook", tone: "blue" },
  TIKTOK: { label: "TikTok", tone: "gray" },
  LINKEDIN: { label: "LinkedIn", tone: "blue" },
  YOUTUBE: { label: "YouTube", tone: "red" },
  X: { label: "X", tone: "gray" },
};

export const channel: Record<string, Meta> = {
  ORGANIC: { label: "Busca orgânica", tone: "green" },
  PAID: { label: "Mídia paga", tone: "blue" },
  SOCIAL: { label: "Redes sociais", tone: "purple" },
  DIRECT: { label: "Direto", tone: "gray" },
  REFERRAL: { label: "Referência", tone: "amber" },
};

export const postStatus: Record<string, Meta> = {
  IDEA: { label: "Ideia", tone: "gray" },
  DRAFT: { label: "Rascunho", tone: "gray" },
  SCHEDULED: { label: "Agendado", tone: "blue" },
  PUBLISHED: { label: "Publicado", tone: "green" },
  FAILED: { label: "Falhou", tone: "red" },
};

/** Helper: pega label/tone com fallback seguro. */
export function meta(map: Record<string, Meta>, key: string): Meta {
  return map[key] ?? { label: key, tone: "gray" };
}
