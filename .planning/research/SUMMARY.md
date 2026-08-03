# Project Research Summary

**Project:** UCKG Donations  
**Domain:** Multi-tenant church member, donation, and financial reporting administration  
**Researched:** 2026-08-03  
**Confidence:** HIGH for the core product and architecture; MEDIUM where finance policy, legal requirements, and production topology remain undefined

## Executive Summary

UCKG Donations should be built as a dependable system of record for manually received church contributions, not as a payment processor or general accounting suite. The established pnpm modular monolith—localized Next.js web, NestJS API, a separate worker process, shared Zod contracts, Drizzle, and PostgreSQL—already fits the product. Expert implementations keep member identities separate from administrative users, force operators into one explicit church context, represent anonymous giving without fake members, and make accepted financial records immutable and auditable.

The recommended sequence is foundations first: harden tenant enforcement with a required tenant unit of work, composite tenant foreign keys, least-privilege database roles, forced PostgreSQL RLS, and adversarial tests; establish transactional append-only audit and exact financial primitives; then complete members before building donation entry. Donations should use exact decimal strings backed by `numeric(19,2)`, snapshot currency, require idempotency, and support corrections through reversal/replacement rather than update or deletion. Reporting then reads the authoritative ledger through bounded, timezone-correct SQL aggregates. Background jobs and streaming exports should be introduced only when a measured asynchronous workload exists.

The largest risks are cross-church disclosure, mutable or duplicated financial history, inconsistent totals across screens and exports, and ambiguous timezone/currency behavior. Mitigate them at schema, transaction, authorization, contract, and test layers—not through controller conventions. Product decisions about donation semantics, fund/payment taxonomies, batch controls, reversal authority, statements, retention, and jurisdictional requirements must be settled before their schemas are frozen. Trilingual responsive UI and visual review remain delivery gates in every user-facing phase.

## Key Findings

### Recommended Stack

Keep the repository's pinned framework and data stack during this milestone; dependency upgrades should be a separate, fully gated change. PostgreSQL remains the canonical store for tenant data, the immutable ledger, audit events, synchronous reports, and—when needed—durable jobs. Do not add a second ORM, Redis, search cluster, warehouse, or frontend state framework without measured need.

**Core technologies:**

- **Node.js `>=22.13.0`, pnpm monorepo:** existing runtime and workspace boundary; compatible with the proposed packages.
- **Next.js `16.2.12` / React `19.2.6`:** localized responsive presentation; use built-in `Intl` formatting and shared HTTP contracts.
- **NestJS `11.1.6`:** API composition root and feature-module encapsulation with narrow exported ports.
- **PostgreSQL 16:** exact financial storage, transactions, constraints, forced RLS, indexed aggregates, PITR, and optional job queue.
- **Drizzle `0.44.4` / Kit `0.31.4`, `pg` `8.16.3`:** retain the existing schema, migration, query, pool, and transaction stack.
- **Zod `4.0.14`:** runtime schemas for requests, responses, configuration, and versioned job payloads.
- **Vitest `3.2.4` / Playwright `1.54.1`:** extend with database-backed tenant attacks, financial reconciliation, E2E, and PT-BR/EN/ES visual coverage.

**Required production additions:** `@nestjs/config@4.0.4`, `@nestjs/throttler@6.5.0`, `helmet@8.3.0`, `nestjs-pino@4.6.1`, `pino@10.3.1`, `pino-http@11.0.0`, and `prom-client@15.1.3`. Configure typed startup validation, trusted proxies, redacted structured logs, request correlation, internal metrics, bounded database pools, statement timeouts, backups/PITR, and restore drills.

**Conditional additions:** use `pg-boss@12.27.0` only when the worker receives real asynchronous jobs; use `csv-stringify@6.8.2` and, only for measured large exports, `pg-query-stream@4.16.0`. Primary donation acceptance stays synchronous and never depends on worker availability.

### Expected Features

**Must have (table stakes):**

- Tenant-scoped member directory with deterministic cursor pagination and search by normalized name, email, or phone.
- Member create, detail, edit, deactivate/reactivate, duplicate warning, and no routine hard deletion.
- Separate permissions for member PII, donation entry, ledger read, correction, posting, reports, export, and audit.
- Church currency/timezone configuration plus church-scoped funds/designations and payment-method/source catalogs with archive lifecycles.
- Identified or anonymous donation recording with exact positive amount, fund, method, received date, actor, stable reference, and tenant-scoped idempotency.
- Efficient manual batch entry with defaults, running count/amount totals, draft-to-posted lifecycle, and atomic posting.
- Immutable donation detail/history and explicit reversal/replacement with reason, actor, timestamp, and concurrency-safe one-reversal rules.
- Append-only domain audit written in the same transaction as each member/donation mutation and any durable job enqueue.
- Bounded donation ledger with date presets and filters for fund, method, member/anonymous state, status, batch, and creator.
- Canonical summary totals and breakdowns, member giving history, report provenance, and CSV export that exactly match active filters.
- Locale-, timezone-, and currency-correct PT-BR/EN/ES presentation, including empty/loading/error/retry states and visual regression gates.

**Should have (competitive):**

- Batch control totals with a discrepancy gate and audited override.
- Reversal-first correction UX that makes immutable accounting behavior understandable to operators.
- Tenant-isolation and report-consistency fixtures as explicit release gates.
- Deterministic smart duplicate warnings for members and donations.
- Privacy-preserving distinction between anonymous and temporarily unidentified gifts, if operations require later assignment.
- Neutral printable contribution summaries after canonical totals are proven; country-aware statements require separate validation.
- Two-person review for material batches/corrections only if UCKG operational policy requires dual control.

**Defer (v2+ or until measured/required):**

- Online payments, stored payment methods, recurring gifts, refunds, chargebacks, payouts, and donor portals.
- Full accounting/general ledger, bank reconciliation, budgeting, payroll, expenses, pledges, campaigns, and fundraising automation.
- Tax-compliant receipt claims, country-specific statement templates, in-kind gifts, households, and member-profile merge.
- Saved report views, arbitrary report builders/formulas, predictive scores, leaderboards, and gamification.
- Server-side PDF generation; first ship a reliable printable web summary and CSV unless a reviewed legal/operational requirement mandates PDF.
- OpenTelemetry/vendor error SDK until hosting and collectors are selected; Redis/BullMQ, Elasticsearch, warehouse/OLAP, materialized views, and microservices until measurements justify them.
- Native mobile applications and cross-church ordinary-operator views.

### Architecture Approach

Preserve a modular monolith with three deployable composition roots: the web owns localized presentation, the API owns authoritative commands and queries, and the worker owns durable asynchronous handlers. Nest feature modules own private repositories and expose narrow ports such as `MemberReferenceReader`, `AuditWriter`, and `JobEnqueuer`. One application service command owns one tenant-scoped database transaction containing invariant checks, the domain write, audit append, and optional job enqueue. Reporting is CQRS-lite—a read-only projection over canonical domain tables, not a second ledger or a new framework.

**Major components:**

1. **Web member and finance UI** — validated shared contracts, explicit active-church context, localized formatting, responsive workflows, and no authoritative financial calculations.
2. **Tenant/authorization boundary** — authentication, selected church, explicit deny-by-default permission metadata, and required `TenantContext`.
3. **Tenant unit of work/database layer** — transaction-local church/actor/correlation settings, runtime role separation, forced RLS, composite constraints, migrations, and bounded pools.
4. **MembersModule** — member lifecycle, paginated search, duplicate candidates, and narrow same-tenant lookup for donations.
5. **AuditModule** — append-only safe event schema and permissioned tenant queries; never orchestrates domain behavior.
6. **DonationsModule** — exact, immutable ledger; batch posting; optional same-tenant member association; reversal and idempotency rules.
7. **ReportingModule** — canonical bounded aggregates, ledger/history queries, export metadata, and report provenance.
8. **JobsModule and worker** — durable enqueue/claim/retry/dead-letter protocol and idempotent export/maintenance handlers, introduced only after a real job exists.

**Key patterns:** required tenant context rather than optional `churchId`; `UNIQUE (church_id, id)` plus composite tenant foreign keys; transaction-local RLS settings on pooled connections; Zod response presenters at the API boundary; exact decimals serialized as strings; `timestamptz` with church-local inclusive-start/exclusive-end report ranges; cursor pagination; direct indexed aggregates before caching/materialization; expand/backfill/validate/contract migrations.

### Critical Pitfalls

1. **Tenant filtering as a convention** — require tenant-bound transactions/repositories, explicit predicates, composite foreign keys, forced RLS, least-privilege roles, and cross-tenant integration tests.
2. **Mutable financial history** — revoke routine update/delete paths for accepted donations and use audited reversal plus replacement.
3. **Floating-point money or mutable currency meaning** — use `numeric(19,2)`, canonical decimal strings, positive-value checks, and a currency snapshot on every donation; never sum unlike currencies.
4. **Audit or jobs written after commit** — atomically write domain data, audit, and any outbox/job row in one transaction; handlers remain idempotent.
5. **Duplicate submissions and unbounded reads** — enforce tenant-scoped idempotency, test concurrent retries, show submitting states, and use capped deterministic cursor pagination.
6. **Ambiguous reports** — define reversal inclusion, church-local calendar boundaries, timezone, currency, filters, and provenance once; reuse that canonical definition across UI, CSV, print, and member history.
7. **Over-broad permissions or coupled identities** — keep members non-authenticating and separate financial/member/audit capabilities; API authorization is authoritative.
8. **Unreviewed visual baseline updates** — test PT-BR, EN, and ES at supported breakpoints and manually inspect snapshots before accepting changes.

## Implications for Requirements

Requirements should describe observable invariants, not only screens:

- Every domain record and cross-domain relationship is church-scoped; no-context and cross-tenant reads/writes fail through the real runtime database role.
- Member and financial permissions are independently testable, deny by default, and enforced by the API.
- Posted donations and audit events are immutable; correction behavior, effective totals, and reversal visibility are defined explicitly.
- Amounts, supported currencies, date boundaries, anonymous/unidentified behavior, batch posting, and duplicate replay semantics have acceptance examples.
- Dashboard totals, ledger, member history, CSV, and printable output reconcile from shared fixtures for the same filters.
- All new UI copy and states ship simultaneously in PT-BR, EN, and ES and pass responsive/visual gates.
- Production readiness includes validated configuration, throttling/headers, redacted logs, internal metrics, bounded pools, migration safety, PITR, and a demonstrated restore.

Before donation schema planning, product owners must decide whether records represent received cash only or also pledges/external settlement states; supported currency and whether it can change; initial funds and payment methods; anonymous versus unidentified semantics; batch control/approval rules; reversal authority; and retention/accounting-close policy. Before statement/export planning, decide required jurisdictions, whether a neutral contribution summary is sufficient, postal-address needs, artifact storage/download authorization, expected export size, and acceptable report freshness/latency.

## Implications for Roadmap

Based on the combined research, use six dependency-ordered phases. Security and visual verification are acceptance criteria within every phase, not postponed cleanup work.

### Phase 1: Tenant and Production-Safety Foundation

**Rationale:** Every later domain adds PII or financial data; tenant mistakes must become structurally difficult before those tables and endpoints expand.  
**Delivers:** Composite protected-route abstraction, deny-by-default permission metadata, `TenantUnitOfWork`, transaction-local context, runtime/migrator role split, forced RLS, composite tenant constraints, response-presenter convention, migration assertions, typed configuration, headers/throttling, redacted logs, metrics, and adversarial tenant tests.  
**Addresses:** Explicit active-church context, least privilege, tenant-isolation release proof, production security controls.  
**Avoids:** Controller-only tenant filtering, pooled-connection context leakage, broad permissions, unsafe migrations, and accidental PII logging.

### Phase 2: Audit and Financial Primitives

**Rationale:** Audit, currency, time, fund/method taxonomies, and exact money define the contract that member mutations and every donation flow rely upon. Retrofitting them would invalidate ledger and report behavior.  
**Delivers:** Append-only tenant audit schema/writer/view permissions; safe event versioning/redaction; church currency/timezone configuration; exact decimal contract; fund and payment-method catalogs; financial permission matrix; atomic domain-plus-audit transaction integration.  
**Addresses:** Audit trail, report provenance foundations, exact amounts, controlled reporting dimensions.  
**Avoids:** Floating-point totals, currency reinterpretation, audit-after-commit gaps, and incompatible taxonomies.

### Phase 3: Complete Members End to End

**Rationale:** The member domain is already partially implemented and provides the optional, same-tenant donor reference required by donation entry.  
**Delivers:** Cursor-paginated/searchable directory; create/detail/edit/status/reactivation; duplicate warnings; narrow `MemberReferenceReader`; audited lifecycle changes; shared response presenters; role/tenant E2E; trilingual responsive UI.  
**Addresses:** All member-management table stakes except donation history, which follows the ledger.  
**Avoids:** Member/admin identity coupling, hard deletion, unbounded reads, cross-tenant lookup, and visual/i18n regressions.

### Phase 4: Immutable Donation Ledger and Manual Batches

**Rationale:** Donation commands require stable member references and settled financial primitives; report definitions must not be built on mutable records.  
**Delivers:** Identified/anonymous entry; fast member lookup; draft batches with defaults/running totals; atomic posting; exact stored amounts and currency snapshot; stable reference; tenant-scoped idempotency; duplicate warnings; detail/history; immutable reversal/replacement; localized confirmation; transactional audit; concurrency and reconciliation tests.  
**Addresses:** Core donation recording, batch workflow, safe corrections, discrepancy gate, and donation-specific permissions.  
**Avoids:** Duplicate records, mutable ledger facts, fake anonymous members, cross-tenant member links, and non-atomic batch totals.

### Phase 5: Essential Synchronous Reporting

**Rationale:** Reports can become authoritative only after posting and reversal semantics are stable. Start with direct indexed queries so correctness and real performance are measurable.  
**Delivers:** Bounded ledger filters; canonical totals/counts/unique donors; fund/method breakdowns; member giving history; church-timezone date presets; exact-string contracts; report provenance; CSV for bounded data; printable localized summary; consistency fixtures and query budgets.  
**Addresses:** Active requirements for history, trusted totals, essential reports, export interoperability, and donor history.  
**Avoids:** UTC/local-date drift, unlike-currency sums, conflicting report definitions, unbounded queries, speculative caches, and CSV injection.

### Phase 6: Worker, Large Exports, and Launch Operations

**Rationale:** Asynchrony is justified only after a real report/export or maintenance workload is known. It must never sit on the canonical donation write path.  
**Delivers:** `pg-boss`-backed durable jobs, versioned Zod payloads, tenant re-establishment, leases, bounded retries/backoff, dead-letter state, graceful drain, queue metrics/readiness, permissioned export status/download metadata, streaming CSV only when measured, expired-session cleanup, backup/PITR monitoring, and restore/rollback runbooks.  
**Addresses:** Large export reliability and production operational readiness.  
**Avoids:** In-memory jobs, stranded claims, unbounded retries, connection starvation, unauthorized artifacts, and untested recovery.

### Phase Ordering Rationale

- Tenant enforcement and audit are correctness foundations; members then supply the optional donor reference; donations supply canonical financial facts; reporting consumes those facts; worker/export infrastructure handles derived work last.
- The grouping follows module ownership and keeps dependencies acyclic: members never depend on donations, donations use only a narrow member port, reporting is read-only, and worker handlers consume durable jobs.
- Exact amounts, historical currency, immutable correction, and timezone boundaries are fixed before downstream totals and exports depend on them.
- Each phase should include contract tests, cross-tenant/permission denial paths, PT-BR/EN/ES UI states, E2E, and visual verification appropriate to its slice.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1 — Tenant/RLS:** HIGH. Validate Drizzle/node-postgres transaction-local settings, actual runtime privileges, `FORCE ROW LEVEL SECURITY`, pooled behavior, and migration-test mechanics in the repository.
- **Phase 2 — Audit/financial primitives:** MEDIUM. Product input is required for audit retention/visibility/redaction, supported currencies, fund/method governance, and accounting-close rules.
- **Phase 4 — Donations/batches:** HIGH. Resolve received-versus-pledged semantics, batch workflow, anonymous/unidentified meaning, reversal authority, duplicate policy, receipts, retention, and any dual control.
- **Phase 5 — Reporting:** HIGH. Confirm canonical report set, reversal treatment, calendar boundaries, export/print requirements, neutral statements, legal wording, and latency/freshness targets.
- **Phase 6 — Worker/exports:** MEDIUM. Validate deployment topology, artifact storage, expected export sizes, connection budget, retry/retention limits, RPO/RTO, and observability destination.

Phases with standard patterns (skip research-phase unless scope changes):

- **Phase 3 — Members:** Standard CRUD/lifecycle/search/pagination patterns are well documented; use phase discussion to settle only product field and duplicate-warning details.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing pinned versions were checked against official framework, PostgreSQL, package, and registry documentation. Production sizing/topology is MEDIUM until hosting, load, and recovery objectives are known. |
| Features | HIGH for milestone core; MEDIUM for differentiators | Member/donation/report table stakes converge across current Planning Center and Tithely documentation and project requirements. Dual control, statements, and jurisdiction-specific behavior require UCKG validation. |
| Architecture | HIGH for boundaries and build order; MEDIUM for finance policy | Modular-monolith, transaction, RLS, constraint, and job patterns are supported by official NestJS, Drizzle, and PostgreSQL sources. Donation states and policy remain product-specific. |
| Pitfalls | HIGH | Tenant isolation, exact money, immutability, atomic audit, idempotency, pagination, and timezone risks are established financial/multi-tenant invariants and align with current codebase concerns. |

**Overall confidence:** HIGH for the proposed roadmap structure; MEDIUM for detailed donation, statement, and launch-operation requirements.

### Gaps to Address

- **Donation meaning:** Decide cash received versus pledge/external-settlement states before modeling status.
- **Currency:** Confirm supported ISO currencies, two-decimal assumption, single-currency-per-church policy, and rules for future configuration changes.
- **Funds and methods:** Decide initial vocabulary, central versus church governance, defaults, archive behavior, and external references.
- **Batch controls:** Confirm draft ownership, expected totals, discrepancy overrides, posting authority, and whether two-person review is required.
- **Correction policy:** Define reversal visibility, replacement linking, permissible metadata edits, reason requirements, and accounting-close periods.
- **Privacy and retention:** Define member/audit/financial retention, consent/deletion exceptions, PII redaction, and auditor visibility by jurisdiction.
- **Statements:** Confirm launch countries, neutral summary versus tax-compliant output, address fields, numbering, versioning, and reissue behavior.
- **Reports:** Define canonical metrics, reversal inclusion, calendar periods, filters, output formats, provenance, latency, freshness, and volume targets.
- **Exports:** Select artifact storage, retention, authorization, and download expiry during Phase 6; keep only metadata in PostgreSQL.
- **Operations:** Select hosting/log/metric/error backends and set traffic, pool, backup, RPO/RTO, and restore-drill targets before launch.

## Sources

### Primary (HIGH confidence)

- [Project definition](../PROJECT.md) — validated foundation, active requirements, constraints, and explicit exclusions.
- [Stack research](STACK.md) — version compatibility, database patterns, production controls, and conditional dependencies.
- [Feature research](FEATURES.md) — official-product evidence for table stakes, differentiators, anti-features, and product gaps.
- [Architecture research](ARCHITECTURE.md) — module boundaries, tenant enforcement, data flows, and dependency-ordered build plan.
- [Pitfall research](PITFALLS.md) — prioritized failure modes and prevention strategies.
- [PostgreSQL 16 documentation](https://www.postgresql.org/docs/16/) — exact numeric types, timestamps/timezones, constraints, RLS/policies, indexes, locking, privileges, and PITR.
- [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview) — transactions, RLS, constraints/indexes, views, and PostgreSQL integration.
- [NestJS documentation](https://docs.nestjs.com/) — modules, configuration, Helmet, and throttling.
- [node-postgres documentation](https://node-postgres.com/) — pool API and sizing guidance.
- [`pg-boss` official repository](https://github.com/timgit/pg-boss) — PostgreSQL jobs, transactional adapters, retries, scheduling, and runtime support.
- [Planning Center Giving documentation](https://pcogiving.zendesk.com/) — funds, payment sources, batches, reports, statements, and in-kind boundaries.
- [Tithely Giving documentation](https://help.tithe.ly/) — transaction filters, exports, funds, receipts/statements, duplicate handling, and saved views.

### Secondary (MEDIUM confidence)

- Opinionated recommendations inferred from the project's auditability requirement: reversal-first UX, batch discrepancy gates, tenant proof as a release gate, neutral pre-compliance statements, and optional two-person review. Validate these with UCKG finance operations.

### Tertiary (LOW confidence)

- None used. Unresolved legal, accounting, hosting, and volume assumptions are listed as gaps rather than treated as facts.

---
*Research completed: 2026-08-03*  
*Ready for roadmap: yes*
