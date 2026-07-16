# 🌵 Cactus — Sistema de Gestão de Agência

Sistema de gestão para agências de publicidade e marketing, cobrindo o ciclo
completo da operação: clientes, projetos, propostas comerciais (fee mensal e
peças avulsas), produção, financeiro, mídia/tráfego pago e gestão de redes
sociais (estilo mLabs). Inspirado em ferramentas como SIGA e mLabs.

## Módulos

| Módulo | O que faz |
| --- | --- |
| **Dashboard** | Indicadores da agência: MRR (receita recorrente), clientes/projetos ativos, contas a pagar/receber, investimento em mídia, propostas recentes e campanhas ativas. |
| **Clientes** | Carteira de clientes com status, responsável de conta e visão 360° (projetos, propostas, financeiro e redes do cliente). |
| **Projetos** | Trabalhos e contas em andamento, vinculados a clientes. |
| **Propostas & Fee** | Orçamentos com itens, propostas de **fee mensal** recorrente e **peças avulsas**, com fluxo de status (rascunho → enviada → aprovada). |
| **Peças & Produção** | Quadro (kanban) de produção de entregáveis: briefing → produção → revisão → aprovação → entregue. |
| **Mídia & Tráfego** | Campanhas de tráfego pago (Meta, Google, TikTok…) com verba, investido, impressões, cliques, conversões e métricas calculadas (CTR, CPC, CPL). |
| **Redes Sociais** | Gestão estilo mLabs: contas sociais por cliente e planejamento/agendamento de posts (ideia → rascunho → agendado → publicado). |
| **Financeiro** | Contas a pagar e a receber, categorias, baixa de pagamentos e totais consolidados. |

## Stack

- **Next.js 16** (App Router, React 19, Server Actions) + **TypeScript**
- **Prisma 6** ORM — SQLite em desenvolvimento (portável para PostgreSQL)
- **Tailwind CSS 4**
- Autenticação por sessão em cookie (`bcryptjs`)
- Arquitetura **multi-agência** (multi-tenant) — todos os dados são isolados por agência.

## Como rodar

```bash
npm install

# copie as variáveis de ambiente
cp .env.example .env

# crie o banco e aplique o schema
npx prisma migrate dev

# popule com dados de exemplo
npx prisma db seed

# ambiente de desenvolvimento
npm run dev
```

Acesse http://localhost:3000

### Login de demonstração

- **E-mail:** `atendimento@agenciacactus.com.br`
- **Senha:** `cactus123`

## Integrações (roadmap)

O modelo de dados já prevê os pontos de integração externa:

- **Meta Ads / Google Ads** — campos `externalId` e métricas em `Campaign`,
  prontos para sincronização automática (hoje as métricas são editáveis
  manualmente).
- **Publicação em redes sociais** — `SocialAccount.accessToken` e
  `SocialPost.externalId` para o fluxo OAuth + publicação via API.

## Migração para produção (PostgreSQL)

1. Em `prisma/schema.prisma`, troque `provider = "sqlite"` por `"postgresql"`.
2. Ajuste `DATABASE_URL` no `.env`.
3. Rode `npx prisma migrate dev`.

## Estrutura

```
prisma/
  schema.prisma      # modelo de dados completo do domínio
  seed.ts            # dados de exemplo
src/
  app/
    login/           # autenticação
    (app)/           # área autenticada (layout com sidebar)
      dashboard/
      clientes/
      projetos/
      propostas/
      pecas/
      midia/
      redes/
      financeiro/
  components/         # UI reutilizável (cards, badges, formulários)
  lib/               # prisma, auth, formatação, rótulos
```
