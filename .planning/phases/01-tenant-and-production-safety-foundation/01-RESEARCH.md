# Phase 1: Tenant and Production-Safety Foundation - Research

**Researched:** 2026-08-03
**Domain:** PostgreSQL tenant isolation, fail-closed NestJS authorization, and production-safe API operations
**Confidence:** HIGH for PostgreSQL/NestJS implementation; MEDIUM for hosting-specific sizing and ingress controls

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Claude's Discretion

- Organização interna dos módulos de configuração, logging, métricas e tenant unit of work.
- Limites iniciais de throttling, tamanho de corpo, pool e timeouts, desde que documentados,
  configuráveis, testados e conservadores.
- Nomes exatos de métricas, formato do correlation ID e detalhes do endpoint interno de métricas.
- Escolha entre os pacotes compatíveis recomendados pela pesquisa, preservando NestJS, Drizzle e
  PostgreSQL já adotados.

### Deferred Ideas (OUT OF SCOPE)

- Auditoria de domínio imutável e transacional — Phase 2.
- Conclusão do slice de membros já iniciado localmente — Phase 3.
- Jobs duráveis, recuperação operacional completa e procedimentos de deploy — Phase 6.
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                                                         | Research Support                                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| TEN-01 | Toda operação de domínio exige uma igreja ativa explícita e falha quando o contexto está ausente.                                   | `TenantContext` obrigatório, `TenantUnitOfWork`, GUCs locais e policy default-deny.                                              |
| TEN-02 | Leituras e escritas cross-tenant são bloqueadas pela API, constraints e políticas do banco executadas com a role real da aplicação. | Role runtime sem bypass, forced RLS, predicados explícitos, chaves/FKs compostas e testes adversariais com pool real.            |
| TEN-03 | Cada endpoint de domínio nega acesso por padrão e exige uma permissão específica declarada.                                         | Classificação global fail-closed, `@DomainRoute(permission)` composto, guard sem metadata = deny e inventário de controllers.    |
| SEC-01 | A API valida configuração de produção no startup e não usa defaults locais fora de desenvolvimento.                                 | `@nestjs/config` + Zod, schemas por processo, validação condicional de produção e testes puros de bootstrap.                     |
| SEC-02 | Login possui throttling por origem/conta, headers seguros e logs estruturados que não expõem credenciais, tokens ou PII.            | Throttlers nomeados, tracker normalizado, proxy explícito, Helmet/CORS/body limit e Pino com serializers de allowlist/redaction. |
| SEC-03 | Operadores responsáveis conseguem observar saúde, erros e métricas essenciais sem acessar dados sensíveis de outras igrejas.        | Correlação segura, filtro de erros, live/ready separados, `prom-client`, endpoint interno e labels de baixa cardinalidade.       |

</phase_requirements>

## Summary

The phase should make the safe path the only normal path. Domain code must receive an immutable,
explicit `TenantContext` and a tenant transaction rather than a generic database handle. The unit of
work starts a Drizzle transaction, calls parameterized `set_config(..., true)` for church, actor, and
correlation, and passes that exact transaction to the callback. PostgreSQL 16 forced RLS protects raw
queries that omit a predicate; explicit `church_id` predicates and composite foreign keys remain
mandatory because RLS and referential integrity solve different problems.

Authorization should be fail-closed at two levels. A global route-classification guard denies every
unclassified handler. A composed `@DomainRoute(permission, ...permissions)` decorator applies session
authentication, tenant resolution, and permission evaluation in the locked order. The permission guard
itself denies missing/empty metadata. Public, identity-only, internal, and domain routes are explicitly
classified, and a controller inventory test proves no handler is unclassified.

Production safety should be implemented as bootstrap infrastructure, not scattered `process.env`
reads: `@nestjs/config` uses a Zod custom validator, Pino owns JSON request context and correlation,
Helmet/CORS/body limits are installed before routes, named Nest throttlers protect login by source and
normalized account, and `prom-client` exposes a protected internal endpoint. Keep storage and hosting
provider-neutral. Supabase may host the initial PostgreSQL database, but runtime code continues to use
standard `pg`, Drizzle migrations, and separate runtime/migrator URLs and roles.

**Primary recommendation:** Plan four ordered slices—database role/RLS enforcement, tenant and route
boundaries, validated production/request security, then safe observability—and make real-role
adversarial tests the phase gate.

## Project Constraints (from CLAUDE.md)

- Preserve the pnpm modular monolith and the existing web/API/worker process boundaries.
- Preserve Node.js 22.13+, NestJS 11, Next.js 16, PostgreSQL 16, Drizzle, Zod, strict TypeScript, and
  the `@uckg/*` workspace packages. Dependency upgrades outside the additions below are separate work.
- Every domain record and query is tenant-scoped; security denies by default, uses least privilege,
  and never versions credentials.
- Keep feature modules explicit. Controllers handle HTTP concerns; injectable services/application
  code own use cases; database schema/access stays in `@uckg/database`; permissions stay in
  `@uckg/authorization`; runtime contracts derive types from Zod.
- NodeNext server code uses `.js` on relative imports. Shared packages use named exports and package
  root barrels. Keep strict compiler options and existing kebab-case/co-located `*.spec.ts` conventions.
- Validate untrusted HTTP data before typed services, use Nest HTTP exceptions at boundaries, handle
  only recognized database errors, and rethrow unexpected failures for centralized handling.
- The process owns pool lifecycle; shutdown must drain the node-postgres pool. Scripts use
  `try/finally` for pools and temporary databases.
- Do not discard, duplicate, format wholesale, or otherwise overwrite the current uncommitted members
  work. Phase 1 may add its composite candidate key/RLS boundary because that is foundation work, but
  member feature completion remains Phase 3.
- If rendered UI changes, add copy in PT-BR, EN, and ES together; run functional tests, then
  `pnpm test:e2e`, then `pnpm test:visual`; inspect actual/diff images before any baseline update;
  finish with `pnpm check:full`. This phase should avoid UI changes.
- Work proceeds through GSD artifacts. This research file is the planning input; implementation must
  occur through phase execution rather than ad-hoc direct edits.

## Standard Stack

### Core (preserve pinned versions)

| Library              | Version | Purpose                                                              | Why Standard                                                                  |
| -------------------- | ------: | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| PostgreSQL           |      16 | Canonical store, constraints, transaction-local settings, forced RLS | Locked project database and strongest tenant enforcement layer.               |
| NestJS               |  11.1.6 | API modules, guards, decorators, filters, interceptors               | Existing framework; guard/decorator composition and DI fit the boundary.      |
| Drizzle ORM          |  0.44.4 | Typed schema/queries/transactions/migrations                         | Existing ORM; callback transactions retain one checked-out `pg` client.       |
| node-postgres (`pg`) |  8.16.3 | Pool, direct runtime connection, readiness, pool gauges              | Existing PostgreSQL driver; exposes pool sizing and counts.                   |
| Zod                  |  4.0.14 | Environment coercion/refinement and existing HTTP contracts          | Existing runtime validator; add as a direct API dependency if imported there. |

Do not upgrade the existing core packages in this security phase. Registry checks on 2026-08-03 found
newer Zod, Drizzle, and `pg` releases; combining upgrades with boundary changes would widen the
regression surface.

### Supporting (verified current additions)

| Library             | Version | Published  | Purpose                                                          | When to Use                                     |
| ------------------- | ------: | ---------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `@nestjs/config`    |   4.0.4 | 2026-04-09 | Nest-native configuration lifecycle and injectable typed wrapper | API bootstrap and per-process config schemas.   |
| `@nestjs/throttler` |   6.5.0 | 2025-12-02 | Tested fixed-window request throttling with named policies       | Login source/account limits.                    |
| `helmet`            |   8.3.0 | 2026-07-12 | Security response headers                                        | Register globally before routes.                |
| `nestjs-pino`       |   4.6.1 | 2026-03-13 | Nest logger integration and request-bound logger context         | Root logger module and service logs.            |
| `pino`              |  10.3.1 | 2026-02-09 | Structured JSON logging and redaction                            | Production stdout logging.                      |
| `pino-http`         |  11.0.0 | 2025-10-04 | HTTP serializers, `genReqId`, request completion logs            | Request correlation and safe HTTP logs.         |
| `prom-client`       |  15.1.3 | 2024-06-27 | Prometheus metric primitives/exposition                          | Default process metrics and API custom metrics. |

The verified peer ranges accept NestJS 11, RxJS 7, Node 22+, Pino 10, and pino-http 11.

### Alternatives Considered

| Instead of                      | Could Use                           | Tradeoff                                                                                               |
| ------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@nestjs/config` + existing Zod | Joi schema                          | Adds a second validator and duplicates the repository's Zod convention. Do not use.                    |
| `@nestjs/throttler`             | Custom counters/timers              | Easy to get expiry, concurrency, headers, and proxy semantics wrong. Do not hand-roll.                 |
| `nestjs-pino`                   | Winston or custom middleware        | Changes stack and loses the documented request-context integration. Do not use here.                   |
| `prom-client`                   | Manual text exposition              | Metric types, escaping, content type, and registry behavior are deceptively complex. Do not hand-roll. |
| Standard PostgreSQL connection  | Supabase Data API/Auth/service role | Creates provider coupling and may bypass the required custom runtime-role/RLS proof. Do not use.       |

**Installation:**

```bash
pnpm --filter @uckg/api add @nestjs/config@4.0.4 @nestjs/throttler@6.5.0 helmet@8.3.0 nestjs-pino@4.6.1 pino@10.3.1 pino-http@11.0.0 prom-client@15.1.3 zod@4.0.14
```

## Architecture Patterns

### Recommended Project Structure

```text
apps/api/src/
├── config/
│   ├── api-config.ts                 # Zod schema + production refinements
│   └── api-config.spec.ts
├── database/
│   ├── database.service.ts           # bounded runtime pool only
│   └── tenant-unit-of-work.ts        # explicit context -> Drizzle transaction
├── tenancy/
│   ├── tenant-context.ts
│   ├── route-policy.decorator.ts     # public/identity/internal/domain metadata
│   ├── route-policy.guard.ts         # global unclassified-route denial
│   ├── domain-route.decorator.ts     # composed ordered guards + permission
│   └── route-policy-inventory.spec.ts
├── security/
│   ├── login-throttler.guard.ts
│   ├── correlation.ts
│   └── safe-exception.filter.ts
├── observability/
│   ├── logger.config.ts
│   ├── metrics.service.ts
│   ├── metrics.interceptor.ts
│   └── observability.controller.ts
└── health/
    └── health.controller.ts       # live + ready

packages/database/
├── migrations/                     # candidate keys, grants, RLS policies
├── scripts/
│   ├── migrate.ts                  # MIGRATION_DATABASE_URL
│   ├── test-migrations.ts
│   └── test-tenant-isolation.ts    # actual runtime login role, max pool 1
└── src/index.ts                    # configurable pool factory + tx types
```

### Pattern 1: Explicit Tenant Unit of Work

**What:** `TenantContext` contains non-optional `churchId`, `actorId`, and `correlationId`.
`TenantUnitOfWork.run(context, work)` opens one Drizzle transaction, sets three custom PostgreSQL
parameters locally, and passes the transaction to `work`. Domain repositories accept only that
transaction/context, never the root `db` or an optional tenant ID.

**When to use:** Every read or write against a tenant-owned domain table, including worker/reporting
work in later phases.

```typescript
// Sources: https://orm.drizzle.team/docs/transactions
//          https://www.postgresql.org/docs/16/functions-admin.html
import { sql } from 'drizzle-orm';

export interface TenantContext {
  readonly actorId: string;
  readonly churchId: string;
  readonly correlationId: string;
}

async run<T>(
  context: TenantContext,
  work: (tx: TenantTransaction) => Promise<T>,
): Promise<T> {
  return this.database.db.transaction(async (tx) => {
    await tx.execute(sql`
      select
        set_config('app.current_church_id', ${context.churchId}, true),
        set_config('app.current_actor_id', ${context.actorId}, true),
        set_config('app.correlation_id', ${context.correlationId}, true)
    `);
    return work(tx);
  });
}
```

Use tagged parameters; never insert an identifier through string concatenation or `sql.raw`. Do not
use `pool.query` for a transaction: node-postgres requires every transaction statement to use the same
checked-out client. Drizzle's node-postgres transaction callback provides that property.

Keep root database access available only to identity/control-plane services that must operate before
tenant selection (`admin_users`, sessions, memberships, active-church resolution). Domain feature
modules receive `TenantUnitOfWork`, not `DatabaseService`.

### Pattern 2: Forced RLS With a Non-Owner Runtime Role

**What:** A privileged migrator owns schema objects. A dedicated application login role is
`NOSUPERUSER NOBYPASSRLS`, does not own domain tables, and receives only required DML privileges.
Each domain table has RLS enabled and forced, a policy scoped to the runtime authorization role, and a
composite candidate key `(church_id, id)`.

```sql
-- Sources: https://www.postgresql.org/docs/16/ddl-rowsecurity.html
--          https://www.postgresql.org/docs/16/sql-createpolicy.html
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE members FORCE ROW LEVEL SECURITY;

CREATE POLICY members_tenant_isolation
ON members
FOR ALL
TO uckg_runtime
USING (
  church_id = NULLIF(current_setting('app.current_church_id', true), '')::uuid
)
WITH CHECK (
  church_id = NULLIF(current_setting('app.current_church_id', true), '')::uuid
);

REVOKE ALL ON members FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON members TO uckg_runtime;
```

`NULLIF(..., '')` is important. After transaction-local custom settings are reset on a reused pooled
connection, PostgreSQL can expose an empty string rather than an absent parameter; casting that value
directly to UUID can raise instead of safely matching no rows. Missing or empty context must produce
zero visible rows and a `WITH CHECK` violation on writes.

Provision login credentials outside versioned migrations. Migrations may create/maintain a stable
`NOLOGIN NOBYPASSRLS` authorization group and grant it privileges, while environment provisioning
creates a provider-specific login member. Tests must connect as the actual login member rather than
using `SET ROLE` on a privileged session.

The runtime role must not receive ownership, schema `CREATE`, `TRUNCATE`, `REFERENCES`, or
`BYPASSRLS`. RLS does not govern `TRUNCATE`/`REFERENCES`, and PostgreSQL's internal unique/FK checks
bypass RLS. Restrictive table privileges and composite tenant FKs are both required.

### Pattern 3: Composite Tenant Relationships

**What:** Every referenced tenant parent defines `UNIQUE (church_id, id)`. Every tenant child carries
both columns and uses one composite FK, even when `id` is globally unique.

```typescript
// Source: https://orm.drizzle.team/docs/indexes-constraints
import { foreignKey, pgTable, unique, uuid } from 'drizzle-orm/pg-core';

export const members = pgTable(
  'members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    churchId: uuid('church_id').notNull(),
  },
  (table) => [
    unique('members_church_id_id_unique').on(table.churchId, table.id),
  ],
);

export const child = pgTable(
  'child',
  {
    churchId: uuid('church_id').notNull(),
    memberId: uuid('member_id').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'child_church_member_fk',
      columns: [table.churchId, table.memberId],
      foreignColumns: [members.churchId, members.id],
    }),
  ],
);
```

The current uncommitted `members` table needs only the composite candidate key and RLS foundation in
this phase. Do not complete member lifecycle/UI work. Because no production child domain table exists
yet, prove the FK pattern with an isolated test-only child table and a rejected cross-tenant insert;
later phases apply it to real donation/member relationships.

### Pattern 4: Fail-Closed Route Classification and Composed Domain Guard

**What:** A global `APP_GUARD` checks that every handler has exactly one route classification:
public, authenticated identity, internal, or domain. Missing classification is denied. A domain route
uses one composed decorator whose non-empty permission tuple applies guards in the locked order.

```typescript
// Sources: https://docs.nestjs.com/custom-decorators#decorator-composition
//          https://docs.nestjs.com/faq/request-lifecycle#guards
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

export function DomainRoute(
  permission: ChurchPermission,
  ...permissions: ChurchPermission[]
) {
  return applyDecorators(
    SetMetadata(routePolicyKey, 'domain'),
    SetMetadata(requiredPermissionsKey, [permission, ...permissions]),
    UseGuards(SessionAuthGuard, TenantGuard, PermissionsGuard),
  );
}
```

The `PermissionsGuard` still throws when metadata is missing/empty. The global classification guard
prevents a completely undecorated controller method from becoming public. `DiscoveryService` can
enumerate registered controllers for the inventory test; assert every HTTP handler has one
classification and every domain handler has at least one `ChurchPermission` present in the central
policy matrix.

### Pattern 5: Typed Production Bootstrap

**What:** `ConfigModule.forRoot({ isGlobal: true, cache: true, validate })` calls a Zod parser that
coerces numbers/booleans and uses `superRefine` for production-only requirements. Expose one typed
`ApiConfigService`; after initialization, application code does not read `process.env` directly.

**Production-required API values:** runtime `DATABASE_URL`, `WEB_ORIGINS`, explicit `TRUST_PROXY`,
`METRICS_TOKEN`, pool bounds/timeouts, body limit, and login limits/windows. Migration and seed scripts
use separate schemas and `MIGRATION_DATABASE_URL`; the API process must not receive that privileged
secret.

Defaults are allowed only when `NODE_ENV` is `development` or `test`. Production rejects localhost
database/origin URLs, wildcard credentialed CORS, an empty/implicit trust-proxy setting, malformed
URLs, and out-of-range ports/limits. Never include configuration values in the validation error.

Recommended initial configurable values:

| Setting                    |                                     Initial value | Rationale                                                                          |
| -------------------------- | ------------------------------------------------: | ---------------------------------------------------------------------------------- |
| API port                   | `3001` dev/test; required or explicit `3001` prod | Preserve current behavior but validate range.                                      |
| JSON/urlencoded body limit |                                         `256 KiB` | Conservative for current forms; future batches must justify increases.             |
| Pool max                   |                                              `10` | Current `pg` default made explicit; total must be budgeted across replicas/pooler. |
| Pool connection timeout    |                                             `5 s` | Fail boundedly when DB is unavailable.                                             |
| Pool idle timeout          |                                            `30 s` | Avoid indefinite idle clients while limiting churn.                                |
| Statement/query timeout    |                   `15 s` general, `1 s` readiness | Bound resource use and health checks.                                              |
| Login source limit         |                              `10 attempts / 60 s` | Blocks bursts without ordinary-user lockout.                                       |
| Login account limit        |                      `5 failed attempts / 15 min` | Addresses distributed-IP guessing; applies whether account exists or not.          |

Treat these as safe starting values, not capacity claims. Metrics and real traffic determine later
tuning.

### Pattern 6: Login Throttling Without Enumeration

Use two named throttlers on `POST /auth/login`. The source tracker uses `request.ip` only after
explicit trusted-proxy configuration. The account tracker uses a SHA-256 digest of the same trimmed,
lowercased identifier used by login; raw email never enters logs or metric labels. Invalid bodies
still receive source throttling. `generateKey(context, tracker, throttlerName)` can derive independent
keys for the two named policies.

Count failed attempts for the account window; keep the source burst limit on all attempts. Return the
same generic 401 payload for unknown, inactive, and wrong-password cases, and a generic 429 when any
limit fires. Perform one password-hash verification using a fixed dummy hash for unknown/inactive
accounts so timing does not become a discrepancy factor. Keep the locked 6–128 password policy.

The built-in throttler store is process-local. It is acceptable only while the API is deployed as one
replica and should be documented/tested as such. Before multiple replicas, require an edge limit or a
supported shared `ThrottlerStorage`; do not invent a PostgreSQL/Redis adapter in Phase 1. Redis remains
explicitly out of scope until measured need.

### Pattern 7: Safe Logging and Correlation

Configure `LoggerModule.forRoot` once and bootstrap Nest with `{ bufferLogs: true }`, then
`app.useLogger(app.get(Logger))`. `genReqId` accepts an inbound correlation ID only when it matches a
strict UUID format; otherwise generate `randomUUID()`. Return it as `x-correlation-id`.

Use allowlist serializers for requests and errors, not only a blacklist. Log request ID, method,
route template, status class, duration, and safe event name. Do not log raw URL/query, headers, body,
tenant ID, user ID, account digest, or database error detail. Keep Pino redaction as defense in depth
for at least:

```text
req.headers.authorization
req.headers.cookie
req.headers['x-metrics-token']
req.body
res.headers['set-cookie']
password
token
email
fullName
phone
```

Authentication events contain only `outcome` (`success`, `invalid`, `throttled`), throttle scope, and
correlation ID. A centralized exception filter returns a generic public payload with correlation ID;
production logs map database/internal errors to safe class/code fields rather than serializing raw
errors that may include SQL values.

### Pattern 8: Health, Readiness, and Metrics

- Keep `/health` as a compatibility liveness alias and add `/health/live`; both return a static status
  without dependency names, versions, or configuration.
- `/health/ready` runs only `SELECT 1` with a one-second bound. Return minimal `ok` or generic 503;
  never return the database error.
- `/internal/metrics` uses a production-required, constant-time-checked internal token and should also
  be restricted by ingress/network policy when hosting is defined. Management endpoints should not be
  Internet-public merely because they contain no PII.
- Use a dedicated `prom-client.Registry`, `collectDefaultMetrics({ prefix: 'uckg_api_', register })`,
  and point-in-time `Gauge.collect()` callbacks for `pool.totalCount`, `idleCount`, and `waitingCount`.
- HTTP counters/histograms label only bounded method, Nest route template, and status class. Never use
  raw URL, church/user/correlation IDs, email, or error messages as labels.

Recommended custom metrics:

```text
uckg_api_http_requests_total{method,route,status_class}
uckg_api_http_request_duration_seconds{method,route,status_class}
uckg_api_login_attempts_total{outcome}
uckg_api_throttle_rejections_total{scope}
uckg_api_db_pool_connections{state="total|idle|waiting"}
```

### Supabase Compatibility and US Deployment Note

Keep one multi-tenant PostgreSQL database for all 150 US churches; do not create one Supabase project
or database per church. Keep database/session timestamps in UTC and store each church's business
timezone per tenant in the later financial-primitives phase.

For a persistent Nest backend, Supabase recommends a direct connection for long-lived servers or its
session pooler when the host is IPv4-only. Use those for runtime `DATABASE_URL`; use a privileged
direct/session connection for migrations. Transaction-pooler mode is aimed at serverless/edge clients
and does not support prepared statements, so it is not the default for this application-side `pg`
pool.

Create a custom runtime login role with `NOBYPASSRLS`; never use Supabase `service_role`, Auth, or Data
API for application domain access. The privileged `postgres`/migration connection is only for schema
operations. Provider migrations/restores may not preserve roles or RLS enablement, so provisioning and
release verification must recreate/assert role membership, grants, `relrowsecurity`,
`relforcerowsecurity`, table ownership, and `row_security_active` before traffic is enabled.

All churches are in the United States. Provisional managed-database placement is `us-east-1`
(Northern Virginia), with the API co-located in the same region. Revisit only when actual church
distribution or provider latency measurements favor a western region. This is a deployment assumption,
not a dependency in migrations or application code, preserving future AWS portability.

### Anti-Patterns to Avoid

- **Optional `churchId` or ambient last selection:** makes unsafe calls compile. Require context.
- **AsyncLocalStorage as the tenant authority:** request logging may use it internally, but domain data
  scope stays an explicit argument and transaction.
- **Session-level `SET app.current_church_id`:** leaks across pooled requests. Use local `set_config`
  inside the exact transaction.
- **Policies tested as the owner/migrator:** owners/superusers may bypass RLS and produce false proof.
- **RLS without explicit predicates/composite FKs:** obscures intent and leaves relationship integrity
  and covert-channel risks.
- **`trust proxy = true`:** forwarded IP headers can be spoofed unless every path is controlled.
- **Logging raw request objects or Pino's default full request serializer:** headers, URLs, and bodies
  can contain credentials/PII.
- **Metric labels from URLs or identifiers:** produces unbounded cardinality and sensitive series.
- **Readiness as liveness:** a temporary database outage should remove readiness, not trigger needless
  process restarts.

## Don't Hand-Roll

| Problem                          | Don't Build                                    | Use Instead                                               | Why                                                             |
| -------------------------------- | ---------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| Environment loading/lifecycle    | Scattered `process.env` helpers                | `@nestjs/config` + one Zod validator/typed wrapper        | Startup ordering, injection, caching, and testability.          |
| Rate-limit counters              | Timers/maps in controller code                 | `@nestjs/throttler` named policies                        | Expiry, guard integration, headers, override metadata.          |
| Security headers                 | Manual header list                             | Helmet                                                    | Header defaults evolve and interact.                            |
| Request logging context          | Custom request-scope logger/ALS                | `nestjs-pino` + pino-http                                 | Established Nest integration and correlation propagation.       |
| Log redaction                    | Ad-hoc string replacement                      | Pino path redaction plus allowlist serializers            | Nested values and serialization order are error-prone.          |
| Metrics exposition               | Concatenated Prometheus text                   | `prom-client` registry/types                              | Escaping, metric types, content type, and collection semantics. |
| RLS session context              | Connection-global mutable variables            | PostgreSQL `set_config(..., true)` in Drizzle transaction | Transaction reset is database-enforced.                         |
| Cross-tenant relationship checks | Service-only lookup before insert              | Composite UNIQUE/FK constraints                           | Race-free enforcement independent of application code.          |
| Database test doubles            | Mocked RLS/repository tests as isolation proof | Real PostgreSQL 16 + actual runtime login role            | Mocks cannot prove policies, ownership, grants, or pooling.     |

**Key insight:** Libraries should own generic transport/operational mechanics; project code should own
the small policy-specific pieces—tenant context, route classification, safe event schema, and metrics
label allowlists.

## Common Pitfalls

### Pitfall 1: Runtime Role Still Bypasses RLS

**What goes wrong:** Tests pass while production can see all rows because the runtime role is a table
owner, superuser, or has `BYPASSRLS`.

**How to avoid:** Separate URLs/credentials; `FORCE ROW LEVEL SECURITY`; query `pg_roles`,
`pg_class.relowner`, and `row_security_active()` from the actual runtime connection in CI/readiness
verification.

**Warning signs:** E2E fixtures and migrations use the same URL; tests rely on `SET ROLE` from an admin.

### Pitfall 2: Transaction Context Escapes or Is Applied on Another Client

**What goes wrong:** `SET` persists into the pool, or `BEGIN`/context/query use different clients.

**How to avoid:** One Drizzle transaction callback, `set_config(..., true)` first, tenant queries only
through the callback transaction. Run A/B/A switch tests with pool `max: 1`.

**Warning signs:** domain repositories inject the root database; code calls `pool.query('BEGIN')`.

### Pitfall 3: Empty Custom GUC Causes UUID Cast Errors

**What goes wrong:** A reused connection has an empty custom setting after transaction end and
`current_setting(...)::uuid` raises instead of denying.

**How to avoid:** `NULLIF(current_setting(name, true), '')::uuid`; test a no-context query after many
context-bearing transactions on the same pooled connection.

### Pitfall 4: RLS Is Mistaken for Relationship Integrity

**What goes wrong:** A child carries church A but references an ID from church B, or FK error behavior
reveals another row's existence.

**How to avoid:** Candidate key and composite FK on every tenant relationship, explicit predicates,
opaque external not-found/conflict mapping, no raw constraint details in responses/logs.

### Pitfall 5: One Forgotten Decorator Opens a Route

**What goes wrong:** Current `PermissionsGuard` returns true when metadata is absent, and a controller
may omit all guards.

**How to avoid:** Global unclassified-route denial, non-empty composed domain decorator, permission
guard deny-by-default, and `DiscoveryService` inventory test.

### Pitfall 6: Throttling Creates Enumeration or DoS

**What goes wrong:** Unknown accounts use a different status/timing, raw emails become keys/logs, or a
hard account lock lets attackers lock out operators.

**How to avoid:** Same normalization and generic outcomes, dummy password verification, hashed tracker,
bounded observation window rather than permanent lock, independent source burst limit.

### Pitfall 7: Trusted Proxy Configuration Lets Attackers Pick Their IP

**What goes wrong:** `trust proxy=true` accepts spoofed `X-Forwarded-For`, defeating source throttling.

**How to avoid:** Production requires an explicit false value or exact trusted CIDR/subnet function;
test direct and forwarded requests against the intended topology.

### Pitfall 8: Redaction Is Too Narrow

**What goes wrong:** Pino removes `req.body.password` but leaves cookie, authorization, query email,
response `set-cookie`, names, phones, or database error details.

**How to avoid:** Whitelist serializers first, Pino redaction second, fixture/canary tests that scan
captured JSON for every sensitive value and field name.

### Pitfall 9: Metrics Leak or Exhaust Memory

**What goes wrong:** Raw URL/church/user/error labels create one series per request/entity and expose
tenant context.

**How to avoid:** A fixed metric/label inventory and route templates/status classes only. Test that
known UUID/email/token fixtures never appear in exposition.

### Pitfall 10: Double Pooling Exhausts Managed PostgreSQL

**What goes wrong:** Each API replica opens ten application connections on top of a provider pool;
combined runtime, migrator, Supabase services, and direct connections exceed the database budget.

**How to avoid:** Explicit pool max/timeouts, expose pool gauges, budget `replicas × max`, use direct or
session-pooler mode for the persistent API, and keep migration connections short-lived.

## Code Examples

### Production-Aware Zod Validation

```typescript
// Source: https://docs.nestjs.com/techniques/configuration#custom-validate-function
const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  API_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  DATABASE_URL: z.url().optional(),
  WEB_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.string().optional(),
});

export function validateEnvironment(input: Record<string, unknown>) {
  return baseSchema
    .superRefine((value, context) => {
      if (value.NODE_ENV === 'production' && !value.DATABASE_URL) {
        context.addIssue({
          code: 'custom',
          path: ['DATABASE_URL'],
          message: 'required',
        });
      }
    })
    .parse(input);
}
```

Tests should assert key names but not secret values in thrown messages. Prefer a typed wrapper that
returns already-parsed URL arrays, numeric limits, and trusted-proxy policy.

### Pool Configuration and Gauges

```typescript
// Source: https://node-postgres.com/apis/pool
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.poolMax,
  connectionTimeoutMillis: config.poolConnectionTimeoutMs,
  idleTimeoutMillis: config.poolIdleTimeoutMs,
  statement_timeout: config.statementTimeoutMs,
  query_timeout: config.queryTimeoutMs,
  application_name: 'uckg-api',
});

poolGauge.collect = function collect() {
  this.set({ state: 'total' }, pool.totalCount);
  this.set({ state: 'idle' }, pool.idleCount);
  this.set({ state: 'waiting' }, pool.waitingCount);
};
```

### Safe Correlation ID

```typescript
// Source: https://github.com/pinojs/pino-http#api
genReqId(request, response) {
  const incoming = request.headers['x-correlation-id'];
  const id = typeof incoming === 'string' && uuidSchema.safeParse(incoming).success
    ? incoming
    : randomUUID();
  response.setHeader('x-correlation-id', id);
  return id;
}
```

### Minimal Metrics Endpoint

```typescript
// Source: https://github.com/prometheus/client_js
@Get('metrics')
@InternalRoute()
async metrics(@Res() response: Response): Promise<void> {
  response.type(this.metrics.registry.contentType);
  response.send(await this.metrics.registry.metrics());
}
```

## State of the Art

| Old/Current Approach                | Required Approach                                               | Evidence/Impact                                                                          |
| ----------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Tenant predicates only              | Explicit predicates + composite FKs + forced RLS                | PostgreSQL policies are default-deny; FK checks bypass RLS, so both layers are required. |
| Session-global tenant variable      | `set_config(..., true)` per Drizzle transaction                 | PostgreSQL documents transaction-local reset; safe for pooled reuse.                     |
| Same database credential everywhere | Privileged migrator + least-privilege runtime login             | Prevents runtime DDL/ownership and makes real-role isolation testable.                   |
| Repeated three-guard annotations    | One composed domain decorator + global unclassified-route guard | Nest supports `applyDecorators`; global guards run before route guards.                  |
| Permission metadata absent = allow  | Missing classification/permission = deny                        | Satisfies TEN-03 and protects forgotten endpoints.                                       |
| Direct `process.env` defaults       | Typed, production-conditional startup validation                | Nest config validation throws before bootstrap.                                          |
| Console/default request logs        | Pino JSON, safe correlation, allowlist serializers/redaction    | Structured operations without tokens/PII.                                                |
| One `/health` check                 | minimal live, dependency ready, protected metrics               | Separates restart and traffic-routing signals.                                           |

**Deprecated/outdated for this phase:**

- Supabase `service_role` or an owner connection as application runtime: bypasses the required RLS
  proof.
- Transaction-pooler connection as the default for a persistent Nest/`pg` server: intended for
  transient/serverless clients and lacks prepared-statement support.
- A permissive `PermissionsGuard` fallback: directly contradicts TEN-03/D-07.
- `trust proxy=true` without a verified ingress path: forwarded source addresses are spoofable.

## Recommended Planning Breakdown

1. **Database enforcement and proof:** preserve dirty members work; add composite candidate key,
   runtime authorization role/grants, forced RLS migration, separate runtime/migration configuration,
   local/CI role provisioning, migration catalog checks, and the real-role pool-reuse attack suite.
2. **Tenant and authorization boundary:** add explicit context/UoW transaction types, move members
   domain access onto the UoW without completing the feature, add route classifications/composed
   decorator, deny-by-default guards, and inventory tests.
3. **Production bootstrap and request security:** add typed configuration, bounded pool, explicit
   trusted proxy/CORS/body parsing, Helmet, cookie regression checks, generic/dummy-hash login path,
   and named source/account throttling.
4. **Safe observability and phase gate:** add Pino/correlation/safe error filter, live/ready/metrics,
   redaction/cardinality tests, adversarial E2E, then existing functional/visual/full gates.

Do not put all concerns into `main.ts`. Each slice should leave a fast focused command green before
the next slice starts.

## Open Questions

1. **Will production begin with more than one API replica?**
   - What we know: deployment topology is not defined; built-in throttler storage is process-local.
   - Recommendation: plan one replica for the initial gate or require provider edge throttling. A
     shared application storage adapter is a later scoped decision, not an implicit Phase 1 custom build.

2. **How will the internal metrics endpoint be network-restricted?**
   - What we know: no deployment manifests or ingress exist; application token protection can be
     implemented now.
   - Recommendation: require `METRICS_TOKEN` in production and document that launch infrastructure
     must add private ingress/ACL before metrics scraping.

3. **Does initial hosting actually favor Northern Virginia?**
   - What we know: all 150 churches are US-based; actual geographic distribution and API host are not
     yet measured.
   - Recommendation: provision API/database together in `us-east-1` by default and validate latency
     before production; no application code should encode the region.

4. **How should association-proof acceptance be represented before donations exist?**
   - What we know: current production domain has `members` but no tenant child domain relation; D-16
     still requires a cross-tenant association test.
   - Recommendation: migration/catalog test asserts `UNIQUE(church_id,id)` and creates an isolated
     test-only child table with the exact composite FK pattern; Phase 4 repeats against the real FK.

## Environment Availability

| Dependency       | Required By                    |        Available | Version                                    | Fallback                                                          |
| ---------------- | ------------------------------ | ---------------: | ------------------------------------------ | ----------------------------------------------------------------- |
| Node.js          | API/tooling                    |                ✓ | 24.12.0 (meets 22.13+)                     | CI runs Node 22.                                                  |
| pnpm             | Workspace/install/gates        |                ✓ | 11.9.0                                     | Pinned by `packageManager`.                                       |
| Docker Engine    | Local PostgreSQL/tests         |                ✓ | 29.4.1                                     | Managed PostgreSQL URL when appropriate.                          |
| Docker Compose   | Local PostgreSQL               |                ✓ | 5.1.3                                      | Plain Docker or external DB.                                      |
| PostgreSQL 16    | Migration/RLS integration      |                ✓ | `postgres:16-alpine`, healthy on port 5432 | CI PostgreSQL 16 service.                                         |
| `psql` host CLI  | Manual role/catalog checks     |                ✗ | —                                          | Use `docker compose exec postgres psql` or node-postgres scripts. |
| Supabase project | Optional managed production DB | ✗/not configured | —                                          | Local Docker PostgreSQL; implementation is provider-neutral.      |

**Missing dependencies with no fallback:** None for planning or local execution.

**Missing dependencies with fallback:** Host `psql` and Supabase project; Docker/node-postgres cover
development and tests.

## Validation Architecture

### Test Framework

| Property             | Value                                                                     |
| -------------------- | ------------------------------------------------------------------------- |
| Unit framework       | Vitest 3.2.4, co-located `*.spec.ts`                                      |
| Database integration | PostgreSQL 16 standalone `tsx` scripts using isolated temporary databases |
| HTTP/E2E             | Playwright 1.54.1 against live API/web                                    |
| Config files         | `vitest.config.ts`, `playwright.config.ts`, `playwright.visual.config.ts` |
| Quick unit command   | `pnpm test` or targeted `pnpm exec vitest run <file>`                     |
| Quick DB command     | New `pnpm --filter @uckg/database test:tenancy`                           |
| Full suite command   | `pnpm check:full`                                                         |

### Phase Requirements → Test Map

| Req ID | Behavior                                                                                                                                    | Test Type                     | Automated Command                                                                                                                                                   | File Exists?                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| TEN-01 | Missing context rejects before domain access; A/B/A pool reuse never carries tenant                                                         | PostgreSQL integration + unit | `pnpm --filter @uckg/database test:tenancy`                                                                                                                         | ❌ Wave 0                                  |
| TEN-02 | Raw read/write and cross-tenant association fail under actual runtime login; role/RLS/catalog assertions hold                               | PostgreSQL integration        | `pnpm --filter @uckg/database test:tenancy`                                                                                                                         | ❌ Wave 0                                  |
| TEN-03 | Missing route classification/permission denies; role matrix remains least privilege                                                         | Unit/inventory                | `pnpm exec vitest run apps/api/src/tenancy/route-policy-inventory.spec.ts apps/api/src/tenancy/permissions.guard.spec.ts packages/authorization/src/policy.spec.ts` | ❌ inventory; ✅ guard/policy              |
| SEC-01 | Invalid/missing/insecure production config prevents bootstrap; dev/test defaults remain                                                     | Unit                          | `pnpm exec vitest run apps/api/src/config/api-config.spec.ts`                                                                                                       | ❌ Wave 0                                  |
| SEC-02 | Source/account limits return generic 429; generic login/timing path, Helmet/CORS/body/cookie policies, sensitive values absent from logs    | Unit + HTTP E2E               | `pnpm exec vitest run apps/api/src/security apps/api/src/observability` then `pnpm exec playwright test tests/e2e/production-safety.spec.ts --project=chromium`     | ❌ Wave 0                                  |
| SEC-03 | Live is dependency-free; ready reflects DB without detail; metrics cover required signals and contain no tenant/PII/high-cardinality labels | Unit + HTTP E2E               | `pnpm exec vitest run apps/api/src/health apps/api/src/observability` then `pnpm exec playwright test tests/e2e/production-safety.spec.ts --project=chromium`       | ⚠️ current liveness only; Wave 0 additions |

### Required Adversarial Database Cases

Run through a fresh `pg.Pool({ max: 1 })` authenticated with a generated real login member of the
`uckg_runtime` authorization role:

1. Assert `current_user` is the login role, `rolsuper=false`, `rolbypassrls=false`, it is not the table
   owner, and `row_security_active('members')=true`.
2. With no context: raw select sees zero rows; insert fails RLS.
3. With church A context: select/insert/update A succeeds with explicit predicates.
4. With church B context: raw query that deliberately omits tenant predicate cannot see/update A.
5. Attempt to write `church_id=A` while context is B fails `WITH CHECK`.
6. A test-only composite child table rejects `(church B, member A)`.
7. Repeat A/B/no-context/A at least 25 times on pool max 1 and assert no context leakage or UUID cast
   error after transaction completion/rollback.
8. Set `row_security=off` as runtime and assert protected queries error rather than silently bypass.
9. Verify runtime cannot `TRUNCATE`, create schema objects, alter policies, or use migrator tables/role.

### Security/Observability Canary Fixtures

Captured log JSON and metric exposition tests should inject unique canaries for password, session
token, authorization header, cookie, email, full name, phone, church UUID, and database URL. Assert
none appear byte-for-byte. Also assert:

- every log line parses as JSON and carries a valid correlation ID;
- returned 4xx/5xx bodies contain correlation ID but no stack/SQL/config/error detail;
- metric names and label keys exactly match an allowlist;
- login outcomes use only bounded values;
- `/health/live` remains 200 while PostgreSQL readiness is deliberately unavailable;
- `/health/ready` returns generic 503 under the same condition;
- `/internal/metrics` rejects absent/incorrect token and uses the registry content type when allowed.

### Sampling Rate

- **Per task commit:** targeted Vitest file or `test:tenancy` command for the changed boundary.
- **Per wave merge:** `pnpm test && pnpm test:migrations && pnpm --filter @uckg/database test:tenancy`.
- **Phase gate:** `pnpm test:e2e`, then `pnpm test:visual` only if rendered behavior changed, then
  `pnpm check:full` as required by `AGENTS.md`.

### Wave 0 Gaps

- [ ] `packages/database/scripts/test-tenant-isolation.ts` and package/root script — real runtime role,
      forced-RLS, composite-FK, pool-reuse attacks for TEN-01/TEN-02.
- [ ] Shared isolated-database/role harness extracted from `test-migrations.ts` without modifying or
      discarding the uncommitted members assertions.
- [ ] `apps/api/src/config/api-config.spec.ts` — production fail-fast matrix for SEC-01.
- [ ] `apps/api/src/tenancy/route-policy-inventory.spec.ts` — every registered route classified;
      every domain route has non-empty known permission for TEN-03.
- [ ] `apps/api/src/security/login-throttler.guard.spec.ts` — independent source/account keys, proxy
      semantics, normalization, generic 429 for SEC-02.
- [ ] `apps/api/src/observability/logger.config.spec.ts` — captured JSON redaction canaries.
- [ ] `apps/api/src/observability/metrics.service.spec.ts` — metric/label allowlist and sensitive canaries.
- [ ] Extend health unit tests for live/ready behavior and generic database failure.
- [ ] `tests/e2e/production-safety.spec.ts` — headers, CORS, 413, throttle, generic errors, live/ready,
      protected metrics, and correlation behavior against the real app.
- [ ] CI/local environment provisions separate migrator and runtime credentials and runs E2E API with
      the runtime URL; migrations run only with `MIGRATION_DATABASE_URL`.

## Sources

### Primary (HIGH confidence)

- [PostgreSQL 16 row security](https://www.postgresql.org/docs/16/ddl-rowsecurity.html) — default deny,
  owner/BYPASSRLS behavior, forced RLS, and referential-integrity bypass.
- [PostgreSQL 16 `CREATE POLICY`](https://www.postgresql.org/docs/16/sql-createpolicy.html) — `USING`,
  `WITH CHECK`, roles, write semantics, and integrity covert channels.
- [PostgreSQL 16 administration functions](https://www.postgresql.org/docs/16/functions-admin.html) —
  `current_setting(..., true)` and transaction-local `set_config(..., true)`.
- [PostgreSQL 16 privileges](https://www.postgresql.org/docs/16/ddl-priv.html) — DML, schema,
  `TRUNCATE`, `REFERENCES`, and ownership privileges.
- [PostgreSQL 16 constraints](https://www.postgresql.org/docs/16/ddl-constraints.html) — composite
  unique/FK requirements and indexing.
- [Drizzle transactions](https://orm.drizzle.team/docs/transactions) — callback transactions and
  PostgreSQL transaction configuration.
- [Drizzle indexes and constraints](https://orm.drizzle.team/docs/indexes-constraints) — current
  composite `unique` and `foreignKey` APIs.
- [node-postgres transactions](https://node-postgres.com/features/transactions) — same-client
  transaction requirement.
- [node-postgres pool API](https://node-postgres.com/apis/pool) — explicit pool bounds/lifecycle and
  total/idle/waiting counts.
- [NestJS configuration](https://docs.nestjs.com/techniques/configuration) — custom startup validator
  and typed config service.
- [NestJS decorator composition](https://docs.nestjs.com/custom-decorators#decorator-composition) and
  [request lifecycle](https://docs.nestjs.com/faq/request-lifecycle) — composed guards and order.
- [NestJS DiscoveryService](https://docs.nestjs.com/fundamentals/discovery-service) — registered
  controller inventory.
- [NestJS rate limiting](https://docs.nestjs.com/security/rate-limiting) — named throttlers,
  `getTracker`, `generateKey`, proxy behavior, and storage extension.
- [NestJS Helmet](https://docs.nestjs.com/security/helmet), [CORS](https://docs.nestjs.com/security/cors),
  and [body parser limits](https://docs.nestjs.com/faq/raw-body) — request/response hardening.
- [nestjs-pino](https://github.com/iamolegga/nestjs-pino),
  [Pino redaction](https://github.com/pinojs/pino/blob/main/docs/api.md#redact-array--object), and
  [pino-http](https://github.com/pinojs/pino-http) — Nest integration, request IDs, serializers/redaction.
- [prom-client](https://github.com/prometheus/client_js) — registries, default metrics, gauges,
  histograms, and exposition.
- [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres) and
  [roles](https://supabase.com/docs/guides/database/postgres/roles) — direct/session/transaction modes,
  custom roles, and service-role implications.
- [Supabase PostgreSQL migration guide](https://supabase.com/docs/guides/platform/migrating-to-supabase/postgres)
  — role/RLS recreation requirements after migration.
- npm registry checks on 2026-08-03 — exact supporting-package versions, publish dates, engines, and
  peer compatibility.

### Secondary (MEDIUM confidence)

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
  — generic outcomes, timing discrepancy, source/account throttling, and lockout DoS cautions.
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
  — correlation and exclusion of tokens, passwords, connection strings, and PII.
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
  — management endpoint restriction, generic errors, headers, CORS, 413/429/503 semantics.

### Project Evidence (HIGH confidence for current state)

- `01-CONTEXT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `CLAUDE.md`, and `AGENTS.md`.
- `.planning/research/ARCHITECTURE.md`, `.planning/research/SUMMARY.md`,
  `.planning/codebase/CONCERNS.md`, and `.planning/codebase/TESTING.md`.
- `apps/api/src/main.ts`, tenancy/auth/database/health modules, `packages/database`,
  `packages/authorization`, and `tests/e2e/auth-tenancy.spec.ts`.

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — exact versions verified against npm and peer ranges; core versions locked.
- PostgreSQL architecture: **HIGH** — based on PostgreSQL 16, Drizzle, and node-postgres primary docs.
- Authorization/bootstrap patterns: **HIGH** — supported by NestJS 11 APIs and current code inventory.
- Throttle starting limits: **MEDIUM** — conservative product defaults; traffic/topology are unmeasured.
- Observability: **HIGH** for implementation, **MEDIUM** for endpoint ingress because hosting is unset.
- Supabase/AWS placement: **MEDIUM** — compatibility is documented; actual provider/latency not measured.

**Research date:** 2026-08-03
**Valid until:** 2026-09-02 for stable architecture; re-check package versions and Supabase connection
guidance immediately before implementation if planning starts after that date.

**What might have been missed:** No deployment manifest exists, so edge throttling, private metrics
ingress, secret injection, and replica count cannot be proven in this phase's repository work. The plan
must make these explicit launch assumptions rather than silently treating application controls as full
infrastructure readiness.
