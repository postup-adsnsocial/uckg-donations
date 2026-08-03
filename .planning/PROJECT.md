# UCKG Donations

## What This Is

UCKG Donations é uma plataforma web administrativa multi-igreja para cadastro de membros, gestão
de doações e acompanhamento financeiro das congregações da Universal. Operadores trabalham sempre
dentro de uma igreja selecionada, com permissões por função, rastreabilidade e uma experiência
profissional em português brasileiro, inglês e espanhol.

## Core Value

Cada igreja consegue registrar e acompanhar suas contribuições com segurança, clareza e isolamento
total dos dados de outras congregações.

## Requirements

### Validated

- ✓ Monorepo executável com web, API, worker e pacotes compartilhados — fundação existente
- ✓ Identidade administrativa própria com sessão segura de 12 horas — Marco 1 existente
- ✓ Seleção explícita de igreja, contexto de tenant e autorização por função — Marco 1 existente
- ✓ Login e dashboard localizados em PT-BR, EN e ES — interface existente
- ✓ Gate de qualidade com lint, tipos, testes, build, E2E e regressão visual — infraestrutura existente
- ✓ Política de senha administrativa entre 6 e 128 caracteres — decisão explícita do produto

### Active

- [ ] Operadores autorizados conseguem cadastrar, consultar e manter membros da igreja ativa
- [ ] Dados de membros permanecem isolados por igreja e protegidos por privilégio mínimo
- [ ] Operadores financeiros conseguem registrar doações vinculadas à igreja e, quando aplicável, ao membro
- [ ] Operadores conseguem consultar histórico e totais financeiros confiáveis
- [ ] Relatórios essenciais respeitam locale, timezone e moeda configurados para a igreja
- [ ] Toda nova interface mantém acabamento profissional nas três línguas e nos breakpoints suportados
- [ ] Controles de segurança pendentes para produção são concluídos antes do lançamento

### Out of Scope

- Microsserviços — o monólito modular atende o estágio atual com menor complexidade operacional
- Aplicativos móveis nativos — a experiência web responsiva é a prioridade inicial
- Misturar contas administrativas com membros — são identidades e ciclos de vida distintos
- Integrações externas específicas de pagamento no primeiro ciclo — dependem de requisitos operacionais ainda não definidos
- Exclusão física de igrejas pela aplicação — arquivamento deve ser o fluxo seguro de ciclo de vida

## Context

- O código existente está mapeado em `.planning/codebase/`.
- A fundação técnica e o Marco 1 de identidade/tenancy foram implementados antes desta estrutura de planejamento.
- O domínio de membros foi iniciado durante a sessão de 2026-08-03, mas permanece incompleto: schema,
  migration, contratos, permissões e endpoints iniciais existem como alterações locais ainda não finalizadas.
- O usuário definiu que acabamento visual tem importância equivalente ao backend. Erros básicos de
  truncamento, overflow, responsividade e tamanho de controles devem bloquear a entrega.
- A interface deve sempre ser mantida simultaneamente em `pt-BR`, `en` e `es`.
- As 150 igrejas-alvo estão nos Estados Unidos; infraestrutura de produção deve priorizar região
  norte-americana próxima da API, mantendo timezone e locale configuráveis por igreja.

## Constraints

- **Arquitetura**: manter monólito modular no monorepo pnpm — evita complexidade prematura
- **Tenancy**: todo registro de domínio possui `church_id` e toda query é filtrada pela igreja ativa — impede acesso cross-tenant
- **Segurança**: negar acesso por padrão, aplicar privilégio mínimo e nunca versionar credenciais — há dados pessoais e financeiros
- **Internacionalização**: textos novos entram nos três dicionários no mesmo change set — evita experiências incompletas por idioma
- **Qualidade visual**: mudanças de UI executam `pnpm test:visual` depois dos testes funcionais — acabamento faz parte da correção
- **Compatibilidade**: Node.js 22.13+, pnpm, PostgreSQL 16, Next.js 16 e NestJS 11 — stack já estabelecida

## Key Decisions

| Decision                                                   | Rationale                                                               | Outcome   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- | --------- |
| Monólito modular com processos web, API e worker separados | Preserva limites claros sem custo prematuro de microsserviços           | ✓ Good    |
| Sessões opacas próprias com cookie seguro                  | Controle explícito de identidade administrativa e tenant                | ✓ Good    |
| Contas administrativas separadas de membros                | Evita misturar operadores do sistema com pessoas da congregação         | ✓ Good    |
| PT-BR, EN e ES desde a fundação da interface               | Internacionalização tardia geraria retrabalho estrutural                | ✓ Good    |
| Senhas administrativas com mínimo de 6 caracteres          | Política solicitada explicitamente pelo responsável do produto          | — Pending |
| Gate visual obrigatório após E2E                           | Impede regressões de acabamento e traduções truncadas                   | ✓ Good    |
| Membros antes de doações                                   | Estabelece a identidade opcional do doador antes do registro financeiro | — Pending |
| PostgreSQL gerenciado e portável em região dos EUA         | Atende as 150 igrejas americanas sem acoplamento a um provedor específico | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-08-03 after brownfield initialization_
