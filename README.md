# 🌵 Cactus — Sistema de Gestão de Agência

Sistema de gestão para agências de publicidade e marketing, cobrindo o ciclo
completo da operação — do comercial à entrega, do financeiro à performance.
Uma evolução do modelo clássico (estilo SIGA) para a agência moderna, que vive
de **fee recorrente, performance, conteúdo e dados**, com integração de mídia,
gestão de redes (estilo mLabs) e uma camada de IA.

## Módulos

### Fundação
| Módulo | O que faz |
| --- | --- |
| **Dashboard** | Indicadores da agência: MRR, clientes/projetos ativos, a pagar/receber, margem das contas, investimento em mídia, propostas e campanhas. |
| **Clientes** | Carteira com status, responsável de conta e **visão 360°** (projetos, propostas, financeiro, redes, margem e portal). |
| **Projetos** | Trabalhos e contas em andamento, vinculados a clientes. |
| **Propostas & Fee** | Orçamentos com itens, **fee mensal** recorrente e **peças avulsas**, com fluxo de status. |
| **Peças & Produção** | Quadro **kanban** de entregáveis (briefing → produção → revisão → aprovação → entregue). |
| **Mídia & Tráfego** | Campanhas (Meta, Google, TikTok…) com verba, investido e métricas calculadas (CTR, CPC, CPL). |
| **Redes Sociais** | Estilo mLabs: contas sociais por cliente e agendamento de posts. |
| **Financeiro** | Contas a pagar/receber, categorias, baixa de pagamentos e totais. |

### Módulos modernos
| Módulo | O que faz |
| --- | --- |
| **Rentabilidade** | **Margem real por cliente** = receita − custos de mídia/externos − custo das horas. Apontamento de horas, custo/hora da equipe, ranking e alerta de conta no vermelho. |
| **Relatórios & Analytics** | Dashboards de aquisição por cliente (estilo GA4): KPIs com variação, tendência de sessões e sessões por canal, em gráficos SVG. |
| **Portal do cliente** | Link público (`/portal/[token]`) onde o cliente **aprova ou pede ajustes** nas peças, sem login. |
| **IA & Insights** | Alertas por regras (conta no vermelho, verba estourando, recebimento vencido, cliente sem post, proposta parada) + **resumo executivo via Claude** (com fallback por template). |
| **Integrações** | OAuth + sincronização com **Meta Ads, Google Ads e GA4** (importa campanhas e métricas). |

## Stack

- **Next.js 16** (App Router, React 19, Server Actions) + **TypeScript**
- **Prisma 6** ORM — SQLite em desenvolvimento (portável para PostgreSQL)
- **Tailwind CSS 4**
- Autenticação por sessão em cookie (`bcryptjs`)
- Arquitetura **multi-agência** (multi-tenant) — dados isolados por agência
- IA via **API do Claude** (`@anthropic-ai/sdk`) — opcional

## Como rodar

```bash
npm install
cp .env.example .env          # variáveis de ambiente
npx prisma migrate dev        # cria o banco e aplica o schema
npx prisma db seed            # popula com dados de exemplo
npm run dev
```

Acesse http://localhost:3000

**Login de demonstração:** `atendimento@agenciacactus.com.br` / `cactus123`
**Portal de demonstração:** `/portal/nomad-portal-demo`

## Variáveis de ambiente (opcionais)

Tudo funciona sem elas (IA por template, integrações como "não configurado").
Para ativar os recursos externos, defina no `.env` (veja `.env.example`):

| Variável | Habilita |
| --- | --- |
| `ANTHROPIC_API_KEY` | Resumo executivo gerado por IA (Claude) em **IA & Insights** |
| `META_APP_ID` / `META_APP_SECRET` | Conexão OAuth com o **Meta Ads** |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Conexão OAuth com **Google Ads** e **GA4** |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Sincronização do **Google Ads** |

## Deploy em produção (PostgreSQL)

1. Em `prisma/schema.prisma`, troque `provider = "sqlite"` por `"postgresql"`.
2. Defina `DATABASE_URL` apontando para o Postgres (Railway, Supabase, Neon…).
3. Aplique as migrações: `npx prisma migrate deploy`.
4. `npm run build && npm start` (ou faça deploy na Vercel/Railway).

**Checklist de produção:** definir `NODE_ENV=production`; criptografar
`accessToken`/`refreshToken` de `Integration` e `SocialAccount`; configurar as
URLs de callback OAuth no console de cada plataforma como
`https://SEU_DOMINIO/api/integrations/{provider}/callback`.

## Estrutura

```
prisma/
  schema.prisma          # modelo de dados completo do domínio
  seed.ts                # dados de exemplo
src/
  app/
    login/               # autenticação
    portal/[token]/      # portal público de aprovação (sem login)
    api/integrations/    # rotas OAuth (connect/callback)
    (app)/               # área autenticada (layout com sidebar)
      dashboard/  clientes/  projetos/  propostas/  pecas/
      midia/  redes/  financeiro/  rentabilidade/  relatorios/
      ia/  integracoes/
  components/             # UI reutilizável (cards, badges, gráficos, formulários)
  lib/                   # prisma, auth, rentabilidade, insights, ia, integrações
```
