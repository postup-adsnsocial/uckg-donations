# Domain Pitfalls: UCKG Donations

**Research date:** 2026-08-03  
**Context:** Subsequent milestone on an existing multi-tenant modular monolith

## 1. Tenant filtering treated as a controller convention

**Risk:** One forgotten `church_id` predicate exposes member or donation data across churches.

**Warning signs:** Services accept naked IDs, queries do not receive a tenant-scoped unit of work,
or new tables lack composite tenant relationships.

**Prevention:** Establish the tenant boundary before expanding domains: composite tenant foreign
keys, tenant-scoped repositories/transactions, adversarial cross-tenant tests and PostgreSQL RLS as
defense in depth.

**Phase:** Tenant boundary hardening, before member completion.

## 2. Mutable financial history

**Risk:** Editing or deleting a recorded donation destroys the evidence needed to reconcile totals
and investigate operator mistakes.

**Warning signs:** Generic CRUD endpoints for donations, `UPDATE amount`, hard delete buttons or
reports that cannot explain why a total changed.

**Prevention:** Make posted donations immutable. Corrections create explicit reversal and replacement
entries that reference the original, with reason, actor and timestamp.

**Phase:** Donation ledger design and implementation.

## 3. Floating-point money

**Risk:** Binary floating-point arithmetic creates rounding differences between entry, totals,
exports and reports.

**Warning signs:** JavaScript `number` used for stored monetary values, arithmetic in UI components or
database `real`/`double precision` columns.

**Prevention:** Use PostgreSQL `numeric(19,2)`, transfer decimal values as validated strings and
centralize arithmetic/formatting. Test reconciliation with multiple entries and locales.

**Phase:** Financial primitives, before the first donation endpoint.

## 4. Member identity coupled to administrative identity

**Risk:** Church members accidentally gain system-login semantics, or administrator lifecycle changes
corrupt donor history.

**Warning signs:** Reusing `admin_users` for donors, foreign keys from donations to admin accounts, or
member forms asking for login credentials.

**Prevention:** Keep `members` as a separate tenant-owned domain. A donation may reference a member,
but administrator identity remains the actor who performed the operation.

**Phase:** Members.

## 5. Unbounded member and ledger queries

**Risk:** A screen that works with ten fixtures becomes slow, memory-heavy and unstable with a real
church's history.

**Warning signs:** `GET` endpoints return every row, sorting happens in the browser, search ignores
indexes or page order is nondeterministic.

**Prevention:** Define capped cursor pagination and deterministic ordering from the first UI slice.
Add indexes that match tenant, filter and cursor order; test page boundaries.

**Phase:** Members and donation ledger.

## 6. Audit written after the business transaction

**Risk:** A donation succeeds but its audit record or export job is lost, leaving an unexplained
financial state.

**Warning signs:** Separate non-transactional writes, fire-and-forget logging or worker publication
performed after the database commit.

**Prevention:** Write domain record, audit event and outbox job atomically in one transaction. The
worker consumes the durable outbox later with idempotent handlers.

**Phase:** Audit foundation, before donation writes.

## 7. Reports with ambiguous timezone and date boundaries

**Risk:** The same donation appears on different days or periods depending on browser locale, server
timezone or export implementation.

**Warning signs:** Grouping UTC timestamps directly into local calendar dates, formatting dates by
string slicing or reports that omit timezone metadata.

**Prevention:** Define reporting periods in the selected church timezone, convert boundaries once at
the query edge and show locale/timezone in report output. Add boundary tests around midnight and DST.

**Phase:** Reporting.

## 8. Duplicate submissions and imports

**Risk:** Retries, double clicks or network uncertainty record the same contribution twice.

**Warning signs:** POST endpoints have no idempotency key, submit buttons can fire repeatedly or batch
imports cannot be safely replayed.

**Prevention:** Use tenant-scoped idempotency keys, unique constraints and a visible submitting state.
Return the existing result for a safe replay and test concurrent duplicates.

**Phase:** Donation entry.

## 9. Permission names too broad for personal and financial data

**Risk:** A role intended to view totals can browse member contact data or mutate financial history.

**Warning signs:** One generic `church:read` permission protects all domain routes, UI hiding is used as
authorization or platform administrators receive implicit tenant access.

**Prevention:** Separate member read/write, donation entry, ledger read, correction, report and audit
permissions. Enforce them in the API and test each role, including denial paths.

**Phase:** Tenant boundary and each domain phase.

## 10. Visual references updated without review

**Risk:** A broken layout becomes the new approved baseline, making automated visual tests green while
users see clipped translations or unusable mobile controls.

**Warning signs:** Snapshot updates committed without before/after inspection, only one locale reviewed
or CI tolerances increased to silence platform differences.

**Prevention:** Keep platform-specific baselines, require manual inspection before updates, preserve
objective checks for overflow/text fit/touch targets and cover PT-BR, EN and ES.

**Phase:** Every phase with UI; enforced by `AGENTS.md` and `pnpm test:visual`.

## Roadmap Implications

1. Harden tenant and authorization boundaries before adding more PII.
2. Establish append-only audit and exact money primitives before donation entry.
3. Finish members with pagination and full role/tenant tests.
4. Build immutable, idempotent donation entry and correction flows.
5. Build timezone-correct reports from the authoritative ledger.
6. Add durable worker jobs only when a real asynchronous export or maintenance task exists.

## Confidence

- **High:** tenant isolation, immutable ledger, exact money, audit atomicity, pagination, timezone and
  idempotency recommendations derive from the existing architecture and known financial-system invariants.
- **High:** visual gate requirements are already implemented and verified in this repository.
- **Medium:** final permission granularity and report set require confirmation from operational users
  during their respective phase discussions.
