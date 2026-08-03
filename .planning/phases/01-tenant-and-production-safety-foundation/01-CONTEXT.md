# Phase 1: Tenant and Production-Safety Foundation - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Tornar o isolamento entre igrejas, a autorização e a execução da API seguros por construção antes
da expansão dos domínios com PII e dados financeiros. Esta fase entrega contexto de tenant
obrigatório, proteção cross-tenant na aplicação e no PostgreSQL, negação de permissões por padrão,
configuração validada, proteção do login e observabilidade operacional sem vazamento de dados. Ela
não conclui membros, auditoria de domínio, doações, relatórios, jobs ou infraestrutura de deploy.

</domain>

<decisions>
## Implementation Decisions

### Tenant boundary and database enforcement

- **D-01:** Toda operação de domínio recebe um `TenantContext` explícito; não haverá `churchId`
  opcional nem fallback para a última igreja usada. A ausência ou invalidade do contexto falha antes
  de qualquer acesso de domínio.
- **D-02:** O acesso tenant-scoped ocorre dentro de uma unidade de trabalho transacional. O contexto
  de igreja, ator e correlação é aplicado localmente à transação, nunca como estado de sessão que
  possa sobreviver no pool.
- **D-03:** Tabelas de domínio usam `church_id`, chave candidata composta `(church_id, id)` e chaves
  estrangeiras compostas nas relações entre domínios. PostgreSQL RLS será habilitado e forçado para
  a role real da aplicação; a role de migration/schema será separada e não será usada no runtime.
- **D-04:** Consultas continuam declarando o predicado de tenant mesmo com RLS. RLS é defesa em
  profundidade, não substituto para queries legíveis e corretamente delimitadas.
- **D-05:** Um administrador de plataforma continua obrigado a selecionar explicitamente uma igreja
  ativa. Seu privilégio global nunca cria uma operação de domínio sem tenant.

### Authorization boundary

- **D-06:** Rotas de domínio usam uma abstração composta e padronizada que aplica autenticação,
  resolução do tenant e permissão nessa ordem. Não dependeremos de repetir manualmente três guards
  em cada controller.
- **D-07:** Falta de metadata de permissão em uma rota de domínio protegida resulta em negação. Cada
  handler declara ao menos uma capacidade específica, e testes de inventário detectam endpoints
  esquecidos.
- **D-08:** A matriz de papéis permanece centralizada em `@uckg/authorization`, com privilégio mínimo.
  Interfaces podem ocultar ações, mas a API é a autoridade final para autorização.

### Production configuration and request security

- **D-09:** A API terá configuração tipada e validada no startup. Defaults de banco, origem web e
  portas são aceitos somente em desenvolvimento/teste; configuração de produção ausente, inválida ou
  insegura impede a inicialização.
- **D-10:** Login recebe throttling combinado por origem e identificador de conta normalizado, com
  resposta genérica que não permite enumerar usuários. A configuração de proxy confiável é explícita;
  os limites e janelas exatos ficam para pesquisa e planejamento.
- **D-11:** Respostas usam headers seguros, CORS por allowlist, limites explícitos de corpo e política
  de cookie preservando `HttpOnly`, `SameSite=Strict` e `Secure` em produção.
- **D-12:** A política de senha permanece entre 6 e 128 caracteres, conforme decisão explícita do
  produto. Esta fase não elevará o mínimo novamente.

### Safe observability

- **D-13:** Logs são estruturados em JSON e incluem correlação por requisição. Redação obrigatória
  cobre senha, cookie, token, authorization headers, e-mail, nomes, telefones e corpos sensíveis;
  eventos de login registram somente resultado e metadados operacionais seguros.
- **D-14:** `liveness` permanece mínimo e não revela dependências; `readiness` verifica PostgreSQL;
  métricas internas cobrem tráfego, latência, erros, throttling e pool sem labels de alta cardinalidade
  nem conteúdo tenant/PII. Readiness e métricas não serão uma nova tela administrativa nesta fase.
- **D-15:** Erros recebem um identificador de correlação seguro para investigação. Respostas públicas
  não expõem stack trace, SQL, configuração ou detalhes que confirmem a existência de usuários ou
  dados de outra igreja.

### Verification contract

- **D-16:** Provas de isolamento usam PostgreSQL real e a mesma role sem bypass usada pela aplicação.
  Devem cobrir leitura, escrita, associação cross-tenant, ausência de contexto e troca repetida de
  tenant no mesmo pool.
- **D-17:** Testes cobrem a inicialização de produção inválida, metadata de permissão ausente,
  throttling, headers, redação de logs, liveness/readiness e métricas sem dados sensíveis.
- **D-18:** Esta fase não adiciona uma nova superfície visual. Se mensagens ou estados visíveis forem
  alterados, entram simultaneamente em PT-BR, EN e ES e passam por E2E e revisão visual nos
  breakpoints definidos em `AGENTS.md`.

### the agent's Discretion

- Organização interna dos módulos de configuração, logging, métricas e tenant unit of work.
- Limites iniciais de throttling, tamanho de corpo, pool e timeouts, desde que documentados,
  configuráveis, testados e conservadores.
- Nomes exatos de métricas, formato do correlation ID e detalhes do endpoint interno de métricas.
- Escolha entre os pacotes compatíveis recomendados pela pesquisa, preservando NestJS, Drizzle e
  PostgreSQL já adotados.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and acceptance

- `.planning/ROADMAP.md` § Phase 1 — objetivo, requisitos e critérios observáveis de sucesso.
- `.planning/REQUIREMENTS.md` § Tenant and Production Safety — TEN-01 a TEN-03 e SEC-01 a SEC-03.
- `.planning/PROJECT.md` § Constraints and Key Decisions — limites de arquitetura, tenancy,
  segurança, senha e qualidade visual.

### Architecture and security direction

- `docs/architecture.md` § Regra de tenancy and Identidade e tenancy — contrato existente de
  tenant explícito, sessões e papéis.
- `.planning/research/SUMMARY.md` § Architecture Approach and Phase 1 — fundações recomendadas e
  riscos que esta fase deve eliminar.
- `.planning/research/ARCHITECTURE.md` — tenant unit of work, contexto transacional, roles, RLS,
  constraints compostas e sequência de adoção.
- `.planning/codebase/CONCERNS.md` — falhas abertas de defaults de produção, autorização fail-open,
  isolamento convencional, proteção de login e observabilidade.

### Quality gate

- `AGENTS.md` — ordem obrigatória dos testes e gate visual para qualquer mudança renderizada.
- `.planning/codebase/TESTING.md` — padrões atuais de Vitest, PostgreSQL, Playwright e regressão
  visual a ampliar nesta fase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `apps/api/src/tenancy/tenant.guard.ts` e `tenant.service.ts`: resolução explícita de igreja e
  membership já funcional, a ser incorporada ao boundary composto.
- `apps/api/src/tenancy/permissions.decorator.ts` e `permissions.guard.ts`: metadata e decisão de
  autorização existentes; o comportamento sem metadata precisa passar de allow para deny.
- `packages/authorization/src/policy.ts`: matriz central de papéis e capacidades a preservar.
- `apps/api/src/database/database.service.ts` e `packages/database/src/index.ts`: composition root do
  pool/Drizzle onde configuração e unidade de trabalho serão conectadas.
- `apps/api/src/health/health.controller.ts`: liveness atual que pode permanecer mínimo e ser
  complementado por readiness e métricas.
- `apps/api/src/testing/execution-context.ts`: helper para testes unitários dos guards e do boundary.

### Established Patterns

- Controllers NestJS usam decorators declarativos e guards; testes unitários ficam ao lado do código.
- Contratos de runtime compartilhados usam Zod em `@uckg/contracts`.
- Migrations SQL são versionadas pelo pacote database e verificadas em PostgreSQL temporário real.
- Testes de browser e API usam Playwright; mudanças visuais têm suite e baselines separados.

### Integration Points

- `apps/api/src/main.ts`: validação de configuração, logger, headers, CORS, proxy, body limits e
  lifecycle de startup/shutdown.
- `apps/api/src/app.module.ts`: módulos transversais de configuração, throttling e observabilidade.
- `apps/api/src/auth/auth.controller.ts` e `auth.service.ts`: throttling, resposta uniforme e eventos
  seguros de autenticação.
- `apps/api/src/tenancy/`: boundary composto, política deny-by-default e propagação do contexto.
- `packages/database/`: roles, RLS, constraints, helpers transacionais e testes de migration.
- `tests/e2e/`: ataques cross-tenant e verificação de comportamento real da aplicação.

</code_context>

<specifics>
## Specific Ideas

- Segurança de banco e API devem falhar de forma independente: remover um predicado de uma query não
  pode produzir vazamento porque a role real continua presa à RLS.
- Trocar de igreja deve ser tratado como novo contexto por requisição/transação, nunca como mutação de
  estado global ou estado persistente de uma conexão do pool.
- O acabamento visual continua sendo critério de correção, embora esta fase não planeje uma nova tela.

</specifics>

<deferred>
## Deferred Ideas

- Auditoria de domínio imutável e transacional — Phase 2.
- Conclusão do slice de membros já iniciado localmente — Phase 3.
- Jobs duráveis, recuperação operacional completa e procedimentos de deploy — Phase 6.

</deferred>

---

*Phase: 01-tenant-and-production-safety-foundation*
*Context gathered: 2026-08-03*
