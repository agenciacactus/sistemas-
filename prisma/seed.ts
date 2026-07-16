import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Limpa dados (ordem respeita as FKs)
  await prisma.socialPost.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.mediaPlan.deleteMany();
  await prisma.financialEntry.deleteMany();
  await prisma.deliverable.deleteMany();
  await prisma.proposalItem.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agency.deleteMany();

  const agency = await prisma.agency.create({
    data: {
      name: "Agência Cactus",
      cnpj: "00.000.000/0001-00",
      email: "atendimento@agenciacactus.com.br",
      phone: "(11) 90000-0000",
    },
  });

  const passwordHash = await bcrypt.hash("cactus123", 10);
  const owner = await prisma.user.create({
    data: {
      name: "Administrador",
      email: "atendimento@agenciacactus.com.br",
      passwordHash,
      role: "OWNER",
      agencyId: agency.id,
    },
  });

  await prisma.user.createMany({
    data: [
      {
        name: "Gestor de Tráfego",
        email: "trafego@agenciacactus.com.br",
        passwordHash,
        role: "TRAFFIC",
        agencyId: agency.id,
      },
      {
        name: "Social Media",
        email: "social@agenciacactus.com.br",
        passwordHash,
        role: "SOCIAL",
        agencyId: agency.id,
      },
    ],
  });

  // Clientes
  const nomad = await prisma.client.create({
    data: {
      name: "Nomad Café",
      segment: "Alimentação",
      contact: "Marina",
      email: "marina@nomadcafe.com.br",
      phone: "(11) 91111-1111",
      status: "ACTIVE",
      agencyId: agency.id,
      accountManagerId: owner.id,
    },
  });

  const vertex = await prisma.client.create({
    data: {
      name: "Vertex Fitness",
      segment: "Saúde & Bem-estar",
      contact: "Rafael",
      email: "rafael@vertexfit.com.br",
      phone: "(11) 92222-2222",
      status: "ACTIVE",
      agencyId: agency.id,
      accountManagerId: owner.id,
    },
  });

  await prisma.client.create({
    data: {
      name: "Aurora Cosméticos",
      segment: "Beleza",
      status: "PROSPECT",
      agencyId: agency.id,
    },
  });

  // Projetos
  const nomadProject = await prisma.project.create({
    data: {
      name: "Gestão de Redes — Nomad Café",
      description: "Gestão mensal de Instagram e Facebook + tráfego pago.",
      status: "ACTIVE",
      startDate: new Date("2026-06-01"),
      agencyId: agency.id,
      clientId: nomad.id,
    },
  });

  const vertexProject = await prisma.project.create({
    data: {
      name: "Campanha de Lançamento — Vertex",
      description: "Lançamento da unidade nova com foco em geração de leads.",
      status: "ACTIVE",
      startDate: new Date("2026-07-01"),
      agencyId: agency.id,
      clientId: vertex.id,
    },
  });

  // Propostas
  const proposal = await prisma.proposal.create({
    data: {
      number: "PROP-2026-001",
      title: "Fee mensal de gestão de redes e tráfego",
      type: "FEE_MENSAL",
      status: "APPROVED",
      months: 12,
      totalCents: 350000,
      validUntil: new Date("2026-08-01"),
      agencyId: agency.id,
      clientId: nomad.id,
      createdById: owner.id,
      items: {
        create: [
          { description: "Gestão de redes sociais (12 posts/mês)", quantity: 1, unitCents: 200000 },
          { description: "Gestão de tráfego pago", quantity: 1, unitCents: 150000 },
        ],
      },
    },
  });
  void proposal;

  await prisma.proposal.create({
    data: {
      number: "PROP-2026-002",
      title: "Peças avulsas — Kit lançamento",
      type: "PECA_AVULSA",
      status: "SENT",
      totalCents: 480000,
      validUntil: new Date("2026-07-30"),
      agencyId: agency.id,
      clientId: vertex.id,
      createdById: owner.id,
      items: {
        create: [
          { description: "Vídeo institucional 60s", quantity: 1, unitCents: 300000 },
          { description: "Kit de artes para lançamento", quantity: 6, unitCents: 30000 },
        ],
      },
    },
  });

  // Peças avulsas / produção
  await prisma.deliverable.createMany({
    data: [
      {
        title: "Post carrossel — Cardápio de inverno",
        type: "post",
        status: "IN_PRODUCTION",
        dueDate: new Date("2026-07-20"),
        priceCents: 25000,
        agencyId: agency.id,
        clientId: nomad.id,
        projectId: nomadProject.id,
      },
      {
        title: "Vídeo institucional 60s",
        type: "vídeo",
        status: "APPROVAL",
        dueDate: new Date("2026-07-25"),
        priceCents: 300000,
        agencyId: agency.id,
        clientId: vertex.id,
        projectId: vertexProject.id,
      },
    ],
  });

  // Financeiro
  await prisma.financialEntry.createMany({
    data: [
      {
        description: "Fee mensal Nomad Café — Jul/2026",
        type: "RECEIVABLE",
        status: "PAID",
        amountCents: 350000,
        category: "fee",
        dueDate: new Date("2026-07-05"),
        paidAt: new Date("2026-07-04"),
        agencyId: agency.id,
        clientId: nomad.id,
      },
      {
        description: "Fee mensal Vertex — Jul/2026",
        type: "RECEIVABLE",
        status: "PENDING",
        amountCents: 420000,
        category: "fee",
        dueDate: new Date("2026-07-20"),
        agencyId: agency.id,
        clientId: vertex.id,
      },
      {
        description: "Verba de mídia Meta — Vertex",
        type: "PAYABLE",
        status: "PENDING",
        amountCents: 200000,
        category: "mídia",
        dueDate: new Date("2026-07-18"),
        agencyId: agency.id,
        clientId: vertex.id,
      },
      {
        description: "Freelancer edição de vídeo",
        type: "PAYABLE",
        status: "PAID",
        amountCents: 80000,
        category: "produção",
        dueDate: new Date("2026-07-10"),
        paidAt: new Date("2026-07-09"),
        agencyId: agency.id,
        clientId: vertex.id,
      },
    ],
  });

  // Plano de mídia + campanhas
  const mediaPlan = await prisma.mediaPlan.create({
    data: {
      name: "Plano de mídia Jul/2026 — Vertex",
      period: "Jul/2026",
      budgetCents: 200000,
      agencyId: agency.id,
      clientId: vertex.id,
      projectId: vertexProject.id,
    },
  });

  await prisma.campaign.createMany({
    data: [
      {
        name: "Leads — Aula experimental",
        platform: "META",
        objective: "LEADS",
        status: "ACTIVE",
        budgetCents: 120000,
        spentCents: 68000,
        impressions: 145000,
        clicks: 3200,
        conversions: 84,
        startDate: new Date("2026-07-01"),
        agencyId: agency.id,
        clientId: vertex.id,
        projectId: vertexProject.id,
        mediaPlanId: mediaPlan.id,
      },
      {
        name: "Tráfego — Cardápio novo",
        platform: "GOOGLE",
        objective: "TRAFFIC",
        status: "ACTIVE",
        budgetCents: 80000,
        spentCents: 41000,
        impressions: 98000,
        clicks: 2100,
        conversions: 32,
        startDate: new Date("2026-07-01"),
        agencyId: agency.id,
        clientId: nomad.id,
        projectId: nomadProject.id,
      },
    ],
  });

  // Redes sociais (estilo mLabs)
  const igNomad = await prisma.socialAccount.create({
    data: {
      platform: "INSTAGRAM",
      handle: "@nomadcafe",
      connected: true,
      agencyId: agency.id,
      clientId: nomad.id,
    },
  });

  await prisma.socialAccount.create({
    data: {
      platform: "INSTAGRAM",
      handle: "@vertexfitness",
      connected: false,
      agencyId: agency.id,
      clientId: vertex.id,
    },
  });

  await prisma.socialPost.createMany({
    data: [
      {
        caption: "Novo cardápio de inverno chegando! ☕ #nomadcafe",
        status: "SCHEDULED",
        scheduledAt: new Date("2026-07-18T12:00:00"),
        agencyId: agency.id,
        accountId: igNomad.id,
        projectId: nomadProject.id,
      },
      {
        caption: "Bastidores da nova receita 🔥",
        status: "DRAFT",
        agencyId: agency.id,
        accountId: igNomad.id,
        projectId: nomadProject.id,
      },
      {
        caption: "Publicado: promoção de aniversário 🎉",
        status: "PUBLISHED",
        publishedAt: new Date("2026-07-10T09:00:00"),
        agencyId: agency.id,
        accountId: igNomad.id,
        projectId: nomadProject.id,
      },
    ],
  });

  console.log("Seed concluído.");
  console.log("Login: atendimento@agenciacactus.com.br / senha: cactus123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
