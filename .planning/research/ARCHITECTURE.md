# Architecture Patterns

**Domain:** Multi-tenant church member, donation, audit, reporting, and worker modules
**Project:** UCKG Donations
**Researched:** 2026-08-03
**Confidence:** HIGH for framework/database patterns; MEDIUM for donation-specific policy details that still require product decisions

## Recommended Architecture

Keep the existing modular monolith and its three deployable processes. Do not introduce network boundaries between domain modules. The next milestone should strengthen module and tenant boundaries inside the monolith, then build features in dependency order.

```text
Browser
  |
  v
apps/web (localized presentation; shared HTTP contracts)
  |
  v
apps/api composition root
  |
  +--> identity/session (existing)
  +--> tenancy/authorization (existing, hardened)
  +--> members ------+
  +--> donations ----+----> audit writer
  +--> reporting ----+         |
  |                         PostgreSQL
  +--> jobs/outbox -----------+
                                ^
apps/worker composition root ---+ (claims jobs; produces exports/maintenance results)
```

Nest feature modules are the correct unit of encapsulation: providers are private unless explicitly exported, so each module can expose a narrow application API rather than its repositories or tables. This preserves a modular monolith while making dependencies visible in the Nest module graph.

### Dependency Direction

```text
Existing foundation: identity -> tenant context -> permission policy
                                      |
                                      v
                         tenant-scoped unit of work
                            /        |         \
                           v         v          v
                       members    audit      jobs/outbox
                           \         ^          ^
                            v        |          |
                           donations +----------+
                                |
                                v
                            reporting
                                |
                                v
                      asynchronous report export
```

Dependencies must be acyclic:

- `MembersModule` does not import donations, reporting, or worker code.
- `DonationsModule` may depend on a narrow member lookup port, never on `MembersService` internals.
- `AuditModule` exposes only an append interface. It does not call domain modules.
- `ReportingModule` is a read-only consumer of member/donation data. Domain modules never depend on reports.
- `JobsModule` exposes enqueue/claim primitives. The API creates jobs; the worker consumes them. Neither side calls the other process.
- `apps/worker` is a composition root, not a fourth domain layer. Job handlers depend on shared contracts/database primitives and must re-establish tenant context from the persisted job.

## Component Boundaries

| Component | Owns | Public surface | May depend on | Must not do |
|---|---|---|---|---|
| Web member UI | Localized list/detail/create/edit/status screens | HTTP calls using validated shared contracts | `@uckg/contracts`, locale/format helpers | Import database schema or reproduce API types locally |
| Web finance UI | Donation entry, history, totals, reversal UX | HTTP calls using validated shared contracts | Same as above | Calculate authoritative totals or mutate historical records client-side |
| `MembersModule` | Member lifecycle and member table writes | Commands: create/update/change status; queries: detail/paginated search; narrow `MemberReferenceReader` | Tenant unit of work, audit writer | Know about donations or reports |
| `DonationsModule` | Financial contribution ledger and reversal rules | Commands: record/reverse; queries: detail/paginated history | Tenant unit of work, `MemberReferenceReader`, audit writer, optional outbox enqueue | Update or delete an accepted donation in place; accept `churchId` from request body |
| `AuditModule` | Append-only tenant audit events and audit queries | `AuditWriter.append(tx, event)` and tenant-filtered paginated reader | Tenant unit of work | Orchestrate business operations, expose secrets, allow update/delete through application paths |
| `ReportingModule` | Report query definitions and optional export metadata | Synchronous summaries and export request/status/download metadata | Read-only member/donation/audit projections, jobs enqueue | Become a second ledger or synchronously generate large files in HTTP requests |
| `JobsModule` | Durable job/outbox rows, leases, attempts, idempotency state | Enqueue in an existing transaction; claim/complete/fail in worker | PostgreSQL | Hold canonical financial state or rely on in-memory queues |
| `apps/worker` | Process lifecycle and job handlers | Poll/claim/execute/ack loop, readiness, graceful shutdown | Jobs API, tenant unit of work, report exporter, maintenance handlers | Trust tenant data inside payload without revalidation; perform unbounded retries |
| `packages/contracts` | Runtime request/response/job schemas, organized by domain | Zod schemas plus inferred types | Zod only | Contain persistence or Nest behavior |
| `packages/database` | Schema, migrations, connection/transaction primitives | Database factory and tenant-scoped transaction primitive | PostgreSQL/Drizzle | Contain HTTP or role-policy decisions |

### Suggested Physical Layout

Keep the current locations and expand them consistently:

```text
apps/api/src/
  members/       members.module/controller/service/repository/presenter
  donations/     donations.module/controller/service/repository/presenter
  audit/         audit.module/service/repository/controller
  reporting/     reporting.module/controller/service/repository
  jobs/          jobs.module/service/repository
  tenancy/       guards, decorators, TenantUnitOfWork

apps/worker/src/
  main.ts
  worker.ts
  handlers/report-export.handler.ts
  handlers/session-cleanup.handler.ts

packages/contracts/src/
  members.ts
  donations.ts
  audit.ts
  reporting.ts
  jobs.ts
  index.ts
```

Repositories stay feature-private. Export application ports only where another module has a real dependency. Avoid a generic `DomainService` package or a shared repository package; those erase ownership.

## Persistence Model and Invariants

### Tenant Key Is Part of Every Domain Relationship

Every member, donation, audit event, report request, and job row must have a non-null `church_id`. The tenant key must also participate in cross-domain references, not merely coexist beside them.

Recommended constraints:

- Add `UNIQUE (church_id, id)` to tenant-owned parent tables that are referenced across modules.
- A donation's optional member reference is `FOREIGN KEY (church_id, member_id) REFERENCES members (church_id, id)`. This makes a cross-church member link impossible even if application code is wrong.
- Audit events store `(church_id, entity_type, entity_id)` as an intentionally polymorphic reference; do not use a cross-table foreign key. Preserve the identifier after archival and reversal.
- Jobs and report exports carry `church_id` separately from their JSON payload. Index claim/status queries by status and availability, and tenant-facing status queries by `(church_id, created_at, id)`.
- Use restrictive deletion behavior for financial records. Church archival remains the lifecycle; production application credentials should not be able to physically delete a church.

PostgreSQL documents unique, check, and foreign-key constraints as the correct database mechanisms for cross-row/cross-table integrity. The database should reject invalid tenant relationships rather than relying only on service checks.

### Donation Ledger

Treat accepted donations as immutable financial facts:

- Store exact amounts, never floating point. Prefer `amount_minor bigint` plus an ISO 4217 `currency_code` snapshot when currencies in scope have a fixed minor-unit interpretation. If product requirements include fractional minor units or variable-scale assets, use constrained `numeric(precision, scale)` instead. PostgreSQL explicitly identifies `numeric` as exact and floating-point types as inexact.
- Store `received_at timestamptz`, `created_at timestamptz`, `created_by_admin_user_id`, payment/method classification, optional same-tenant `member_id`, and a stable external/idempotency reference if imports or retries are expected.
- Do not edit amount, member, currency, or effective time after acceptance. Correct mistakes by creating a reversal row referencing the original donation, with a reason and actor. Enforce one effective reversal per original donation if that is the product rule.
- Snapshot currency on the donation. Changing a church's future currency setting must not reinterpret history.
- Compute report date boundaries from the church timezone, then query the UTC interval. Do not group UTC timestamps into calendar dates and relabel them in the UI.

### Audit Record

The audit event is part of the business transaction, not best-effort logging. A mutation transaction should write:

1. the domain change;
2. its audit event;
3. an outbox/job row only when asynchronous follow-up is required;
4. then commit once.

Minimum event fields: `id`, `church_id`, `occurred_at` (database time), actor admin user ID, action, entity type/ID, request correlation ID, and a versioned JSON details object. Details should contain a safe change summary or approved before/after fields, not passwords, session tokens, unrestricted request bodies, or unnecessary personal data. Application roles receive insert/select as appropriate but no update/delete path.

Drizzle supports a callback transaction that commits or rolls back the statements as one logical unit, which is sufficient for atomic domain + audit + outbox writes without adding a broker.

## Tenant Enforcement

Use defense in depth. HTTP guards remain necessary for identity, tenant selection, and permissions, but they are not sufficient for row isolation.

### Layer 1: Composite Protected-Route Boundary

Replace repeated guard/decorator discipline with one tested domain-route abstraction that always applies, in order:

1. session authentication;
2. active church resolution from `x-church-id`;
3. explicit permission metadata;
4. deny-by-default when permission metadata is missing.

Controllers obtain a `TenantContext` and pass it as a required argument. Request bodies and query strings never define authoritative `churchId`. Platform administrators still select an explicit active church; platform status changes permission evaluation, not data scope.

### Layer 2: Tenant-Scoped Unit of Work and Repositories

Introduce a `TenantUnitOfWork.run(context, callback)` that:

- starts a Drizzle transaction;
- sets transaction-local PostgreSQL settings for `church_id`, actor ID, and correlation ID;
- passes a tenant-bound transaction/repository context to the callback;
- cannot be constructed without a resolved tenant.

Feature repositories require this context and include `church_id` predicates explicitly. This makes the safe path easy to review and gives audit/outbox writes the same transaction.

### Layer 3: PostgreSQL Row-Level Security

Enable and force RLS on tenant domain tables before financial data is introduced. Policies should compare the row's `church_id` with a transaction-local setting such as `current_setting('app.current_church_id', true)::uuid`, using both `USING` and `WITH CHECK`. Use a non-owner, non-`BYPASSRLS` runtime database role; a separate migration role owns schema changes. PostgreSQL notes that table owners normally bypass RLS unless `FORCE ROW LEVEL SECURITY` is applied.

This design has important operational consequences:

- `SET LOCAL`/transaction-local context must be established after a pooled connection is acquired and within the same transaction as all tenant queries; never use session-global settings on pooled connections.
- The worker must start a tenant unit of work from the job row's `church_id` before reading domain data.
- Reports use the same tenant context even when their SQL joins several modules.
- Backups and migrations use separate operational roles and procedures; they must not masquerade as tenant requests.
- Keep adversarial cross-tenant integration tests even after RLS. Constraints and RLS are defense in depth, not substitutes for tests.

PostgreSQL RLS becomes default-deny when enabled without an applicable policy and applies policies to reads and writes. Referential-integrity checks can bypass RLS, which is why composite tenant foreign keys are still required and why constraint error details must not be exposed verbatim to callers.

## Explicit Data Flows

### Member Create or Update

```text
localized form
 -> shared request schema
 -> API composite auth/tenant/permission boundary
 -> TenantUnitOfWork(church, actor, correlation)
 -> MembersService validates lifecycle rule
 -> MembersRepository writes church-scoped row
 -> AuditWriter appends member event in same transaction
 -> member presenter parses shared response schema
 -> localized UI
```

List/search uses deterministic cursor pagination, ideally `(normalized_name, id)`, with a capped page size. Detail/update predicates include both `id` and `church_id`; a missing/cross-tenant record should have the same external not-found behavior.

### Donation Registration

```text
localized finance form
 -> shared donation schema (amount, currency, receivedAt, optional memberId)
 -> finance:write permission
 -> TenantUnitOfWork
 -> optional MemberReferenceReader checks active same-tenant member
 -> DonationsRepository inserts immutable ledger row
 -> AuditWriter appends donation.recorded
 -> optional outbox row (only for actual async side effect)
 -> single commit
 -> response presenter / UI receipt
```

The donation remains valid if the linked member later becomes inactive. Member status is checked at entry according to product policy; historical relationships are not erased.

### Donation Reversal

```text
reversal command + reason
 -> finance:write (or a later dedicated permission)
 -> TenantUnitOfWork
 -> lock/read original same-tenant donation
 -> enforce not already reversed
 -> insert compensating reversal record
 -> append donation.reversed audit event
 -> commit
```

Use a database uniqueness constraint to make concurrent duplicate reversals fail safely. Never implement reversal as delete or negative in-place update.

### Synchronous Summary Report

```text
report filters
 -> reports:read permission
 -> resolve church timezone/currency configuration
 -> convert requested local date range to UTC boundaries
 -> tenant-scoped ReportingRepository aggregate query
 -> response schema with raw exact totals + dimensions
 -> web formats with operator locale and church currency/timezone rules
```

The API owns authoritative filters and totals. The web owns presentation formatting. Start with direct indexed aggregate queries; do not create summary tables before measured query latency requires them.

### Asynchronous Export

```text
API export request
 -> validate report filters and reports:export permission
 -> transaction inserts report_request + tenant job row
 -> worker claims available job using row lock/lease
 -> worker re-establishes TenantUnitOfWork from job.church_id
 -> report exporter reads a repeatable dataset and writes artifact
 -> worker stores success metadata or retry/dead-letter state
 -> UI polls tenant-scoped request status and downloads authorized artifact
```

PostgreSQL supports `FOR UPDATE ... SKIP LOCKED`; its documentation notes that skipping locked rows gives an inconsistent general-purpose view but is useful for queue-like tables. That makes a PostgreSQL-backed job table a proportionate first implementation for this monolith. Claims need leases (`locked_until`), bounded retries, exponential backoff, idempotency keys, and terminal failure state so a crashed worker does not strand a job.

## Patterns to Follow

### Narrow Module APIs

Export ports such as `MemberReferenceReader`, `AuditWriter`, and `JobEnqueuer`, not repositories or an all-purpose service. This makes the dependency graph explicit and avoids circular Nest imports.

### Command Transaction Boundary

One application service method owns one transaction. It performs invariant checks, the domain write, audit append, and optional job enqueue together. Controllers must not coordinate multiple repository calls outside this boundary.

### Response Presenter at the API Boundary

Map Drizzle rows to public response objects and parse them through the shared Zod response schema. Dates, bigint/numeric amounts, nullable fields, and enums need explicit serialization. The browser validates received JSON rather than casting it.

### CQRS-Lite, Not a Framework

Separate command services from reporting queries conceptually, but do not adopt an event-sourcing or CQRS library. PostgreSQL remains the single source of truth. Reporting repositories may use efficient read-only joins/aggregates over domain tables while writes stay behind owner modules.

### Immutable Financial Corrections

Append reversals and audit facts. Never rewrite accepted donation history to make the current state look clean. Current balance/total queries derive the effective result from original and compensating entries.

## Anti-Patterns to Avoid

### Raw Database Access from Controllers

**Why bad:** It bypasses tenant transactions, module ownership, audit, and response presentation.
**Instead:** Controller -> application service -> tenant-scoped repository.

### Generic Repository with Optional `churchId`

**Why bad:** Optional tenant scope makes an unsafe call compile and turns cross-tenant access into a convention.
**Instead:** Require `TenantContext`/tenant transaction in every domain repository method. Put explicitly global administrative queries in a separately named interface.

### In-Process Event Emitter as Audit Guarantee

**Why bad:** Process crashes or transaction rollback can leave the domain write and audit/job side effects inconsistent.
**Instead:** Insert audit and outbox/job records in the same PostgreSQL transaction.

### Worker Before Durable Job Semantics

**Why bad:** The current readiness stub provides no delivery, retry, lease, or shutdown guarantees.
**Instead:** Implement the jobs table/state machine and idempotent handler protocol before assigning production work.

### Report Module Calling Domain HTTP Endpoints or Services in Loops

**Why bad:** It creates N+1 work and turns an in-process reporting query into distributed-style orchestration.
**Instead:** Use a tenant-scoped read repository with explicit SQL projections.

### Mutable Donation CRUD

**Why bad:** Update/delete destroys traceability and makes audit/reconciliation ambiguous.
**Instead:** Record and reverse; reserve administrative correction workflows for explicit, audited compensating entries.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users / very high volume |
|---|---|---|---|
| Member reads | Cursor pagination and `(church_id, normalized_name, id)` index | Add confirmed search index and query metrics | Dedicated search/read replica only if measured need justifies it |
| Donation history | Tenant/date cursor index; bounded pages | Partition only after table/maintenance evidence | Time partitioning and archival strategy may be required |
| Reports | Direct indexed aggregates | Async exports; targeted cached/read models with freshness metadata | Warehouse/replica may become a justified extraction boundary |
| Audit | Append-only table with `(church_id, occurred_at, id)` | Retention and partition plan | Separate audit storage may become a service boundary, but not now |
| Jobs | PostgreSQL queue with leases and `SKIP LOCKED` | Multiple workers with bounded concurrency | External broker becomes reasonable when DB queue contention is measured |
| Tenant isolation | Explicit predicates + composite FKs + forced RLS | Same, with policy/load tests | Same; tenant sharding is a later infrastructure concern |

## Build Order Implications

1. **Harden the domain boundary**
   - Add the composite protected-route abstraction, deny-by-default permission metadata, tenant-scoped unit of work/repositories, response presenters, and adversarial tenant tests.
   - Introduce runtime versus migration database roles and forced RLS before donation tables contain financial records.
   - This is the prerequisite for every following module, not a cleanup phase to defer.

2. **Establish append-only audit**
   - Build the audit table, writer port, query permission, safe event schema, and transaction integration.
   - Audit precedes completion of member and donation mutation flows so later phases do not retrofit traceability.

3. **Finish members end to end**
   - Complete pagination/search/detail/update/status, contracts/presenters, localized UI, audit events, and tenant/permission E2E coverage.
   - Add the `(church_id, id)` candidate key and narrow member-reference query port required by donations.

4. **Build the immutable donation ledger**
   - Resolve product decisions for donation categories/methods, currency policy, reversal authority, idempotency, and retention before freezing the schema.
   - Deliver registration, history, detail, reversal, exact totals, audit coupling, and concurrency tests synchronously first.

5. **Build essential synchronous reporting**
   - Add tenant/date/member/method aggregates over the canonical ledger, with church timezone/currency semantics and localized presentation.
   - Establish query budgets and measure real plans before adding caches or summary tables.

6. **Make the worker real, then add exports/maintenance**
   - Implement durable PostgreSQL jobs/outbox, lease/claim semantics, retry/dead-letter behavior, idempotent handlers, metrics, readiness, and graceful shutdown.
   - First jobs should be bounded, non-canonical work: report exports and expired-session cleanup. Donation acceptance must not depend on worker availability.

**Ordering rationale:** tenant enforcement and audit are correctness foundations; members supply the optional donor reference; donations supply canonical financial data; reporting consumes that data; asynchronous export is an optimization/operational capability and must follow durable job semantics. This preserves deployable web/API/worker processes without turning modules into microservices.

## Phase-Specific Research Flags

| Phase | Research need | Why |
|---|---|---|
| Boundary/RLS | HIGH | Validate Drizzle/node-postgres transaction-local settings, runtime role privileges, migration behavior, and test harness before implementation |
| Audit | MEDIUM | Product must approve event retention, visible fields, PII redaction, and which actions auditors may see |
| Members | LOW | Standard CRUD/lifecycle patterns; main risks are tenant enforcement, pagination, and UI quality |
| Donations | HIGH | Payment method/category taxonomy, accepted-vs-pledged semantics, currency, reversal rules, receipts, import idempotency, and legal retention remain product-specific |
| Reporting | HIGH | Required report definitions, accounting calendar, timezone boundary rules, export formats, and acceptable freshness/latency need decisions |
| Worker | MEDIUM | PostgreSQL queue is suitable initially, but deployment topology, artifact storage, retry limits, and observability need environment-specific validation |

## What Might Be Missing

- The project does not yet state whether a donation is cash received, a pledge, an externally settled payment, or all three. Those require different state machines; do not invent one generic mutable `status` column until clarified.
- Currency configuration is mentioned in requirements but is absent from the current church schema. Decide whether churches are single-currency and whether historical donations may differ.
- Receipt numbering, fiscal/legal retention, consent/privacy deletion, and accounting close periods are jurisdiction-dependent and can change the ledger/report model.
- Report export artifact storage and download authorization are undefined. Keep only metadata in PostgreSQL; select object storage during the worker/export phase.
- Authentication audit events occur before tenant selection. Keep them in a separately designed security-audit stream/table rather than weakening the non-null `church_id` invariant for tenant domain audit events.

## Sources

- [NestJS Modules](https://docs.nestjs.com/modules) — official documentation; module provider encapsulation, imports/exports, and feature-module organization. **HIGH confidence.**
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions) — official documentation; atomic callback transactions, rollback, nested savepoints, and PostgreSQL transaction configuration. **HIGH confidence.**
- [PostgreSQL 18 Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) — official documentation; default-deny behavior, `USING`/`WITH CHECK`, owner and `BYPASSRLS` caveats, and referential-integrity bypass. **HIGH confidence.**
- [PostgreSQL 16 Constraints](https://www.postgresql.org/docs/16/ddl-constraints.html) — official documentation; check, unique, and foreign-key integrity. **HIGH confidence.**
- [PostgreSQL 16 Numeric Types](https://www.postgresql.org/docs/16/datatype-numeric.html) — official documentation; exact `numeric` values versus inexact floating point. **HIGH confidence.**
- [PostgreSQL 18 SELECT locking clause](https://www.postgresql.org/docs/current/sql-select.html) — official documentation; `FOR UPDATE ... SKIP LOCKED` and its queue-like-table use. **HIGH confidence.**
- Project sources: `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`, `docs/architecture.md`, `packages/database/src/schema.ts`, and `packages/authorization/src/policy.ts`. **HIGH confidence for current-state findings.**

---

*Architecture research for roadmap creation; preserves the existing modular monolith.*
