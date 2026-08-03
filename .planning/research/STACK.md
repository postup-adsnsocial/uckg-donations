# Technology Stack: Member, Donation, and Reporting Milestone

**Project:** UCKG Donations  
**Researched:** 2026-08-03  
**Scope:** Extend the existing Node.js/Next.js/NestJS/PostgreSQL modular monolith; do not replace its established stack.  
**Overall confidence:** HIGH for the database and NestJS recommendations; MEDIUM for production topology because a hosting provider, traffic target, retention policy, and recovery objectives have not been selected.

## Recommendation in One Sentence

Keep Next.js 16, NestJS 11, Drizzle, Zod, `pg`, and PostgreSQL 16; add a small set of NestJS-compatible security/operations packages, use PostgreSQL-enforced tenant boundaries and exact financial types, and turn the existing worker into a `pg-boss` consumer only when reports or maintenance actually need asynchronous execution.

## Version Policy

Do **not** mix a framework upgrade into these domain phases. The repository currently pins compatible versions and already has functional, E2E, build, and visual gates. Keep those pins while implementing members, donations, and reports, then upgrade dependencies in a separate change with the full gate.

| Established technology | Keep for this milestone | Current registry release checked | Decision |
|---|---:|---:|---|
| Node.js | `>=22.13.0` | Project constraint | Keep; it satisfies every recommended package's engine requirement. |
| Next.js / React | `16.2.12` / `19.2.6` | Not upgrade-scoped | Keep; no new frontend framework or state library is needed. |
| NestJS | `11.1.6` | Not upgrade-scoped | Keep; recommended Nest packages explicitly accept Nest 11. |
| PostgreSQL | Major `16` | `16.14` current minor documentation | Stay on major 16 and apply supported minor/security updates operationally. Pin the production image/provider version rather than a floating `postgres:16-alpine` tag. |
| Drizzle ORM / Kit | `0.44.4` / `0.31.4` | `0.45.2` / `0.31.10` | Keep the repository pins. `0.44.4` already contains PostgreSQL RLS, policies, indexes, transactions, and views needed here. |
| `pg` | `8.16.3` | `8.22.0` | Keep during feature work. Configure the existing pool; do not change drivers. |
| Zod | `4.0.14` | `4.4.3` | Keep and expand shared request, query, response, job-payload, and environment schemas. |
| Vitest / Playwright | `3.2.4` / `1.54.1` | Not upgrade-scoped | Reuse. Add database-backed tenant/adversarial tests and localized visual cases. |

Exact "current release" values above are registry observations on the research date, not an instruction to upgrade.

## Additions to the Existing Stack

### Required Before Production

| Package | Pin | Install in | Purpose | Why this package |
|---|---:|---|---|---|
| `@nestjs/config` | `4.0.4` | API, worker | Typed startup configuration boundary | Its peer range includes Nest 10/11. Continue using Zod for parsing rather than adding another validation DSL. It eliminates production fallbacks to local database/CORS defaults. |
| `@nestjs/throttler` | `6.5.0` | API | Login and abuse throttling | Official Nest package; its peer range includes Nest 11. Use account-plus-IP keys for login and a coarser per-IP limit elsewhere. Configure trusted proxies explicitly. |
| `helmet` | `8.3.0` | API | HTTP response security headers | Official Nest security guidance uses Helmet middleware. It supports Node 18+, therefore Node 22 is compatible. Configure it before routes. Web CSP remains a Next.js header configuration, not an API Helmet substitute. |
| `nestjs-pino` | `4.6.1` | API | Structured request/application logs with request context | Peer range includes Nest 11 and Pino 10. Use generated request IDs and redaction; do not log request bodies by default. |
| `pino` | `10.3.1` | API, worker | JSON application logging | Fast, structured logs usable by any production log collector. Use the same event field conventions in API and worker. |
| `pino-http` | `11.0.0` | API | HTTP bindings for `nestjs-pino` | Version is within `nestjs-pino`'s declared peer range. Redact cookies, authorization headers, member PII, and donation notes. |
| `prom-client` | `15.1.3` | API, worker | Prometheus-format process and domain metrics | Supports Node 20+ and works without adopting a full tracing platform. Expose metrics on an internal/authenticated endpoint. Never use `church_id`, member ID, email, or request ID as metric labels. |

### Required When the Worker Receives Real Work

| Package | Pin | Install in | Purpose | Why this package |
|---|---:|---|---|---|
| `pg-boss` | `12.27.0` | API and worker | PostgreSQL-backed jobs, retries, scheduling, dead-letter handling | Requires Node `>=22.12.0`, matching the project. It supports Drizzle transaction adapters, so a domain write and job enqueue can commit atomically. It uses PostgreSQL `SKIP LOCKED`; no Redis/BullMQ service is justified at this stage. |

Use `pg-boss` for large CSV generation, scheduled expired-session cleanup, report snapshot refresh **if later introduced**, and retention jobs. Do not put the primary donation write behind a queue: recording a donation is a synchronous PostgreSQL transaction and should return its committed result immediately.

Create explicit queue contracts in the shared contracts package: discriminated job name, payload version, `churchId`, actor/correlation metadata, and a Zod schema. Configure bounded retries with exponential backoff, an explicit retention policy, concurrency per queue, graceful shutdown, and alerts for failed/expired jobs. Job handlers must be idempotent even though the queue provides strong delivery semantics.

### Required for CSV Export Phase

| Package | Pin | Install in | Purpose | When to use |
|---|---:|---|---|---|
| `csv-stringify` | `6.8.2` | API and/or worker | RFC-style streaming CSV serialization | Use for locale-aware column labels while keeping machine values deterministic. Prefix spreadsheet-formula-leading text (`=`, `+`, `-`, `@`) or otherwise neutralize it to prevent CSV injection. |
| `pg-query-stream` | `4.16.0` | API and/or worker | Bounded-memory PostgreSQL row streaming | Add only for exports large enough that paged Drizzle reads are measurably inadequate. It declares peer compatibility with `pg ^8`, matching the repository. Use a dedicated checked-out client, transaction, statement timeout, and guaranteed release on abort/error. |

Small reports should remain ordinary bounded queries. Do not add these export dependencies before an export requirement exists.

### Deliberately Deferred

| Technology | Decision | Reason |
|---|---|---|
| OpenTelemetry SDK | Defer until a collector/export backend is selected | Pino logs plus Prometheus metrics cover the immediate operational gap. Half-configured tracing adds dependencies without an operable destination. Instrumentation can be added behind the same request/correlation IDs later. |
| Error-tracking vendor SDK | Defer provider selection | Production hosting and vendor requirements are unknown. Preserve stack-neutral structured errors now. |
| Redis + BullMQ | Do not add | PostgreSQL is already operated and `pg-boss` satisfies the expected queue workload. A second stateful datastore increases failure and recovery surfaces. |
| Prisma/TypeORM | Do not add | Drizzle already owns schema, queries, and migrations. Two ORMs create incompatible migration/type conventions. |
| Redux/React Query | Do not add by default | The current App Router and modest admin workflows do not require another global state/cache layer. Add only after a concrete client-state problem is demonstrated. |
| Elasticsearch/OpenSearch | Do not add | Tenant-bounded member search is well within PostgreSQL. Start with indexed deterministic pagination; consider `pg_trgm` only for a confirmed fuzzy/substring requirement. |
| Data warehouse / OLAP database | Do not add | Initial financial reports can aggregate the transactional dataset using tenant/date indexes. Introduce analytical replication only after measured workload separation is necessary. |
| PDF generation | Defer | CSV is auditable and cheaper to operate. PDF layout, font embedding, pagination, and trilingual rendering are a distinct phase if legally or operationally required. |

## Database Design: Prescriptive Patterns

### 1. Tenant Isolation Must Exist at Three Layers

Every domain table carries a non-null `church_id`. Every repository method accepts a tenant context rather than an optional church filter. Every endpoint continues to resolve the selected active church and permission. Add PostgreSQL RLS as defense in depth for `members`, donation tables, financial audit tables, and tenant-owned job/export metadata.

Use separate database roles:

- `uckg_migrator`: owns schema objects and runs migrations only.
- `uckg_app`: non-owner, no `BYPASSRLS`, least privileges required by API.
- `uckg_worker`: non-owner, no `BYPASSRLS`; domain access is tenant-scoped. It additionally accesses the `pg-boss` schema it needs.

For every tenant transaction, execute transaction-local context before domain SQL:

```sql
SELECT set_config('app.church_id', $1, true);
```

Policy shape:

```sql
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations FORCE ROW LEVEL SECURITY;

CREATE POLICY donations_tenant_policy ON donations
  FOR ALL TO uckg_app
  USING (church_id = nullif(current_setting('app.church_id', true), '')::uuid)
  WITH CHECK (church_id = nullif(current_setting('app.church_id', true), '')::uuid);
```

`true` makes the setting local to the transaction, which prevents tenant context leaking when a pooled connection is reused. Do not use a session-level `SET` on pooled connections. The application role must not own the protected tables because owners normally bypass RLS. Keep platform administrators tenant-scoped too: elevated application authorization may choose any active church, but the database transaction still carries exactly one selected `church_id`.

RLS is not a replacement for application authorization. Migration tests must prove no-context default deny, cross-tenant read/write denial, same-tenant success, and policy behavior through the actual pooled application role.

### 2. Enforce Composite Tenant Foreign Keys

A globally unique child ID alone does not prove that related records belong to the same church. Add `UNIQUE (church_id, id)` on tenant parent tables and use composite foreign keys, for example:

```text
donations (church_id, member_id)
    -> members (church_id, id)
```

Use the same pattern for reversals, exports, and other tenant-child relations. This prevents an application bug from attaching a donation in church A to a member in church B.

### 3. Money Is Exact and Currency Is Historical Data

Use PostgreSQL `numeric(19,2)` for `amount`, with `CHECK (amount > 0)`, and store/return it as a canonical decimal **string** across `pg`, Drizzle, Zod, and JSON. PostgreSQL explicitly recommends `numeric` for exact monetary calculations. Do not use JavaScript `number`, PostgreSQL `real`/`double precision`, or PostgreSQL `money` for financial values.

Add `churches.currency_code` and snapshot a three-letter uppercase ISO-style `currency_code` on each donation. Constrain it with `CHECK (currency_code ~ '^[A-Z]{3}$')`; validate against the product-supported currency allowlist in Zod. Reports group by currency and never sum unlike currencies. Do not silently reinterpret old donations if a church's configured currency changes.

`numeric(19,2)` is appropriate for the currently implied BRL/USD/EUR-style two-decimal currencies. If currencies with other minor-unit scales become a real requirement, research that phase before changing the invariant; do not guess scale from locale.

Formatting is presentation-only: API responses contain canonical decimal strings and ISO dates; the web uses built-in `Intl.NumberFormat(locale, { style: 'currency', currency })`. Do not use database locale formatting or persist formatted currency strings.

### 4. Donations Form an Append-Or-Reverse Ledger

Recommended core tables:

- `donations`: `id`, `church_id`, optional `member_id`, exact `amount`, snapshot `currency_code`, `donated_at timestamptz`, constrained `method`, optional bounded note/reference, `recorded_by_user_id`, `idempotency_key`, `created_at`.
- `donation_reversals`: one-to-one `donation_id`, matching `church_id`, reason, actor, and `created_at`. Reports subtract/exclude reversed donations according to the explicitly documented report definition.
- `audit_events`: append-only actor, church, action, entity type/ID, timestamp, request/correlation ID, and a minimized JSONB change summary.

Once posted, do not update or delete a donation's church, amount, currency, member, or effective timestamp. Corrections create a reversal and, if needed, a replacement donation in one transaction. Restrict the application role from `UPDATE`, `DELETE`, and `TRUNCATE` on append-only tables where practical; enforce immutability with privileges/triggers and test it. Never cascade-delete financial rows when a member is deactivated or a church is archived.

Use `UNIQUE (church_id, idempotency_key)` and require a UUID-shaped client idempotency key on donation creation. A retry returns the already-committed result when the payload matches; reuse with a different payload is a conflict. The transaction atomically inserts the donation, financial audit event, and any `pg-boss` job needed for a derived side effect.

Do not store payment-card data, bank credentials, or raw payment-provider payloads. External payment processing remains out of scope.

### 5. Time Is an Instant; Reporting Boundaries Belong to the Church

Persist event instants as `timestamptz` (`donated_at`, `created_at`, reversal time). Continue storing a validated IANA timezone on each church. Validate timezone values at church configuration time against supported runtime/PostgreSQL zones rather than accepting arbitrary text.

For a report requested as church-local calendar dates, convert the inclusive start and exclusive end boundaries using the church timezone, and compare against the indexed `timestamptz`. Compute grouping days/months with PostgreSQL 16's timezone-aware `date_trunc`/`AT TIME ZONE`. This handles daylight-saving transitions correctly. Do not group by UTC date and relabel afterward.

The database returns unformatted date buckets and exact numeric strings; Next.js formats them with built-in `Intl.DateTimeFormat` and `Intl.NumberFormat` in `pt-BR`, `en`, or `es`. No date library is required for the initial reports.

### 6. Query and Index Around Actual Access Paths

Use cursor pagination, never unbounded lists or deep offset pagination.

Recommended initial indexes:

```text
members:   (church_id, lower(full_name), id)
donations: (church_id, donated_at DESC, id DESC)
donations: (church_id, member_id, donated_at DESC, id DESC)
           partial WHERE member_id IS NOT NULL
reversals: UNIQUE (church_id, donation_id)
audit:     (church_id, created_at DESC, id DESC)
jobs:      managed by pg-boss; do not hand-edit its indexes
```

For a common report scan, benchmark a covering index such as `(church_id, donated_at) INCLUDE (amount, currency_code)`; add it only when `EXPLAIN (ANALYZE, BUFFERS)` shows value because every index increases write and vacuum cost. PostgreSQL multicolumn B-tree indexes work best when tenant equality is the leftmost condition.

If product requirements demand accent-tolerant substring/fuzzy member search, enable PostgreSQL's bundled `pg_trgm` extension and add a measured GIN trigram index on the normalized search expression. Do not install Elasticsearch for this. Do not add trigram indexes speculatively: congregation size and the exact search predicate should drive the migration.

### 7. Reports Start as Parameterized SQL Aggregates

Implement a read-only reporting repository in the donations module. Keep the report definition in version-controlled SQL/Drizzle expressions and test totals against fixture transactions, reversals, currencies, local-date boundaries, empty ranges, and cross-tenant attempts.

Start with direct `SUM(numeric)`, `COUNT`, and timezone-correct grouping over bounded tenant/date ranges. Regular security-invoker views may centralize a stable definition, but they must preserve RLS. Do **not** start with materialized views or cached totals. They introduce freshness and refresh/reconciliation behavior before there is evidence that live aggregates are too slow.

If measured volume later requires precomputation, introduce a summary table or materialized view with:

- an explicit freshness timestamp and UI disclosure;
- idempotent refresh jobs and replay/rebuild procedure;
- reconciliation tests against the immutable source ledger;
- a unique index if concurrent materialized-view refresh is used;
- monitoring for stale/failed refreshes.

### 8. Migrations Are Expand/Backfill/Validate/Contract

Continue generated SQL migrations, but review and commit the SQL. Never use schema push in production. Use a dedicated migrator role and one deployment migration runner protected by an advisory lock. For populated tables: add nullable/default-safe columns, backfill in bounded batches, add constraints as `NOT VALID` where applicable, validate, then make the contract strict in a later deployment. Set finite `lock_timeout` and `statement_timeout`; do not let a rollout wait indefinitely on a table lock.

Extend the migration harness beyond table presence: catalog assertions for RLS/policies, composite foreign keys, uniqueness, checks, indexes, role privileges, and representative accepted/rejected writes.

## Operational Components

| Component | Minimum production requirement | Notes |
|---|---|---|
| PostgreSQL service | PostgreSQL 16 current supported minor, encrypted connections/storage, automated backups, PITR, maintenance windows | Financial/member data requires tested recovery, not merely configured backups. Run periodic restore drills and record achieved RPO/RTO. |
| API pool | Explicit `max`, `connectionTimeoutMillis`, `idleTimeoutMillis`, `maxLifetimeSeconds`; aggregate connection budget across replicas | `pg` defaults to max 10 per pool, but total capacity is replicas × processes × pools. Set database `statement_timeout` too. |
| Worker pool | Separate small bounded pool and graceful drain | A report/export must not exhaust connections needed for interactive donation recording. Start with low concurrency and measure. |
| Queue operations | `pg-boss` migrations/schema ownership, queue lag/failure/dead-letter metrics, retry policy, cleanup/retention | Health should report readiness only when PostgreSQL and the required queue schema are usable. |
| Logging | JSON logs, request/correlation ID, actor ID and church ID where authorized, error code, latency; centralized retention | Redact cookies, session tokens, authorization headers, email, phone, notes, and request bodies. Keep high-cardinality IDs out of metrics. |
| Metrics/alerts | HTTP latency/error rate, pool waiting/usage, DB errors, donation-write failures, report duration, queue lag/failures, backup/PITR status | Metrics endpoint must not be public. Alert on symptoms tied to an operator response. |
| Backups | Provider/base backups plus continuous WAL/PITR and tested restoration | `pg_dump` is useful for logical/export recovery but is not a substitute for continuous archiving/PITR. |
| Deployment | Backward-compatible migration before app rollout, one migration runner, rollback/runbook | Never deploy destructive contract changes in the same step as the code that stops using the old shape. |

## Installation

Keep additions scoped to the consuming workspaces:

```bash
# API production safety and observability
pnpm --filter @uckg/api add \
  @nestjs/config@4.0.4 \
  @nestjs/throttler@6.5.0 \
  helmet@8.3.0 \
  nestjs-pino@4.6.1 \
  pino@10.3.1 \
  pino-http@11.0.0 \
  prom-client@15.1.3

# When asynchronous jobs become real
pnpm --filter @uckg/api add pg-boss@12.27.0
pnpm --filter @uckg/worker add pg-boss@12.27.0 pino@10.3.1 prom-client@15.1.3

# Only in the report-export phase and only where the stream executes
pnpm --filter @uckg/api add csv-stringify@6.8.2 pg-query-stream@4.16.0
```

If large exports run exclusively in the worker, install the last two packages there instead. Do not install every deferred package up front.

## Recommended Phase Ordering

1. **Database and production-safety foundation:** validated config, pool bounds, structured/redacted logs, headers/throttling, role split, tenant transaction helper, RLS/adversarial migration tests.
2. **Complete members:** cursor pagination, tenant-composite constraints, lifecycle/audit, indexed deterministic search, shared response parsing, trilingual UI and visual gates.
3. **Donation ledger:** exact money/currency, immutable writes and reversals, idempotency, audit, permissions, tenant/RLS and concurrency tests.
4. **Live financial reports:** timezone-correct SQL aggregates, bounded ranges, numeric-string contracts, trilingual formatting, reconciliation tests.
5. **Operational worker and exports:** introduce `pg-boss` when there is a real scheduled/long-running job; add streaming CSV only for measured large exports; finish metrics, alerts, PITR and restore drills before launch.

This order puts isolation, exactness, auditability, and recovery beneath the financial features rather than retrofitting them afterward.

## Confidence Assessment

| Area | Confidence | Basis / remaining uncertainty |
|---|---|---|
| Framework compatibility | HIGH | Exact registry metadata confirms Nest 11 and Node 22 compatibility for proposed packages. |
| PostgreSQL types, RLS, indexes, timezones | HIGH | PostgreSQL 16 and Drizzle official documentation directly cover these capabilities. |
| `pg-boss` queue fit | HIGH | Official project documentation confirms PostgreSQL `SKIP LOCKED`, transactional Drizzle adapters, retries/scheduling, and Node `>=22.12`. |
| Reporting strategy | HIGH for initial live aggregates | Correctness patterns are stable; materialization threshold depends on measured data volume and latency goals. |
| Production sizing | MEDIUM | Replica count, database connection limit, donation/member volume, export size, RPO/RTO, and hosting provider are unknown. Load tests must set numeric pool/concurrency values. |
| Currency scale | MEDIUM | Two-decimal currencies are implied but not explicitly enumerated. Validate supported currencies before freezing `numeric(19,2)`. |

## Official Sources

- [PostgreSQL 16 numeric types — exact `numeric` recommended for monetary amounts](https://www.postgresql.org/docs/16/datatype-numeric.html)
- [PostgreSQL 16 date/time types and IANA timezone behavior](https://www.postgresql.org/docs/16/datatype-datetime.html)
- [PostgreSQL 16 date/time functions, `date_trunc`, and `AT TIME ZONE`](https://www.postgresql.org/docs/16/functions-datetime.html)
- [PostgreSQL 16 row security policies](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- [PostgreSQL 16 `CREATE POLICY` and default-deny behavior](https://www.postgresql.org/docs/16/sql-createpolicy.html)
- [PostgreSQL 16 privileges](https://www.postgresql.org/docs/16/ddl-priv.html)
- [PostgreSQL 16 multicolumn indexes](https://www.postgresql.org/docs/16/indexes-multicolumn.html)
- [PostgreSQL 16 `pg_trgm`](https://www.postgresql.org/docs/16/pgtrgm.html)
- [PostgreSQL 16 continuous archiving and PITR](https://www.postgresql.org/docs/16/continuous-archiving.html)
- [PostgreSQL 16 `pg_dump`](https://www.postgresql.org/docs/16/app-pgdump.html)
- [Drizzle ORM PostgreSQL row-level security](https://orm.drizzle.team/docs/rls)
- [Drizzle ORM indexes and constraints](https://orm.drizzle.team/docs/indexes-constraints)
- [Drizzle ORM views and materialized views](https://orm.drizzle.team/docs/views)
- [Drizzle ORM transactions](https://orm.drizzle.team/docs/transactions)
- [node-postgres pool API](https://node-postgres.com/apis/pool)
- [node-postgres pool sizing guidance](https://node-postgres.com/guides/pool-sizing)
- [NestJS rate-limiting guidance](https://docs.nestjs.com/security/rate-limiting)
- [NestJS Helmet guidance](https://docs.nestjs.com/security/helmet)
- [`pg-boss` official repository and capability summary](https://github.com/timgit/pg-boss)
- [`nestjs-pino` official repository and Nest integration](https://github.com/iamolegga/nestjs-pino)
- [`prom-client` official repository](https://github.com/siimon/prom-client)
- [`csv-stringify` official documentation](https://csv.js.org/stringify/)
- [`pg-query-stream` official node-postgres repository package](https://github.com/brianc/node-postgres/tree/master/packages/pg-query-stream)

Package versions and peer/engine compatibility were checked against the official npm registry metadata on 2026-08-03.
