---
phase: 01-tenant-and-production-safety-foundation
plan: 02
subsystem: database
tags: [postgresql, drizzle, nestjs, multi-tenant, transactions]

requires:
  - phase: 01-tenant-and-production-safety-foundation
    provides: Forced RLS, least-privilege runtime role, and real-role pool isolation proof from Plan 01
provides:
  - Explicit immutable tenant context with church, actor, and correlation identifiers
  - Transaction-local tenant unit of work using parameterized PostgreSQL GUCs
  - Existing member list/create operations restricted to the tenant transaction
affects: [authorization-boundary, audit, members, donations, reporting]

tech-stack:
  added: []
  patterns:
    - Domain services receive TenantUnitOfWork instead of root DatabaseService
    - Tenant GUCs are set locally inside the exact Drizzle callback transaction

key-files:
  created:
    - apps/api/src/database/tenant-unit-of-work.ts
    - apps/api/src/database/tenant-unit-of-work.spec.ts
    - apps/api/src/members/members.service.spec.ts
  modified:
    - apps/api/src/database/database.module.ts
    - apps/api/src/auth/auth.types.ts
    - apps/api/src/members/members.service.ts
    - apps/api/src/members/members.controller.ts

key-decisions:
  - 'TenantContext requires readonly churchId, actorId, and correlationId strings and validates them before opening a transaction.'
  - 'Member controllers derive actor identity from the authenticated administrator and create a fresh correlation UUID for each existing operation.'

patterns-established:
  - 'Tenant transaction boundary: validate explicit context, set three local GUCs, then invoke domain work with the same transaction object.'
  - 'Defense in depth: member SQL retains explicit church_id predicates and insert values inside the RLS-protected transaction.'

requirements-completed: [TEN-01, TEN-02]

duration: 6 min
completed: 2026-08-03
---

# Phase 01 Plan 02: Explicit Tenant Unit of Work Summary

**Typed tenant transactions set church, actor, and correlation GUCs locally while existing member reads and writes retain explicit church scoping**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-03T18:45:01Z
- **Completed:** 2026-08-03T18:51:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added an injectable `TenantUnitOfWork` that rejects missing context before database access and passes the exact Drizzle transaction to domain work.
- Set `app.current_church_id`, `app.current_actor_id`, and `app.correlation_id` through parameterized `set_config(..., true)` calls in one transaction.
- Moved the pre-existing member list/create operations off the root database while preserving their validation, permissions, responses, errors, explicit predicate, and inserted church identifier.
- Kept all non-owned protected files byte-for-byte equal to the Plan 01 SHA-256 manifest.

## Task Commits

Each task was committed atomically using TDD commits:

1. **Task 1 RED: Define tenant unit-of-work behavior** - `fd51748` (test)
2. **Task 1 GREEN: Add explicit tenant transaction boundary** - `19ad7ea` (feat)
3. **Task 2 RED: Require tenant-bound member operations** - `bec1794` (test)
4. **Task 2 GREEN: Move member operations into tenant transactions** - `fd6bb4d` (feat)

## Files Created/Modified

- `apps/api/src/database/tenant-unit-of-work.ts` - Typed validation and transaction-local GUC boundary.
- `apps/api/src/database/tenant-unit-of-work.spec.ts` - Context rejection and exact-transaction callback tests.
- `apps/api/src/database/database.module.ts` - Globally exports the new provider.
- `apps/api/src/auth/auth.types.ts` - Makes established authenticated and resolved-tenant identity data immutable.
- `apps/api/src/members/members.service.ts` - Runs existing list/create SQL only inside tenant callbacks.
- `apps/api/src/members/members.controller.ts` - Supplies required church, actor, and correlation context.
- `apps/api/src/members/members.service.spec.ts` - Proves member operations use the callback transaction and context church ID.

## Decisions Made

- Runtime validation rejects absent or blank tenant context fields before Drizzle acquires a transaction, complementing compile-time non-optional fields.
- A new correlation UUID is created at the controller boundary for the existing member operations; Plan 01-06 can later unify this with request-wide safe observability without weakening the domain contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added focused member unit-of-work tests**

- **Found during:** Task 2 (Move only existing member operations behind the unit of work)
- **Issue:** The planned verification directories did not directly exercise `MembersService`, despite the task being marked TDD.
- **Fix:** Added focused tests proving list/create use the unit-of-work callback and create supplies `context.churchId`.
- **Files modified:** `apps/api/src/members/members.service.spec.ts`
- **Verification:** `pnpm exec vitest run apps/api/src/members/members.service.spec.ts apps/api/src/database/tenant-unit-of-work.spec.ts`
- **Committed in:** `bec1794`

---

**Total deviations:** 1 auto-fixed (1 missing critical test gap).
**Impact on plan:** The added test is narrowly scoped to the planned tenant adaptation and adds no member feature behavior.

## Issues Encountered

- A concurrent production-safety executor added OpenTelemetry-aware dependencies while this plan ran, temporarily creating incompatible Drizzle peer-instance type diagnostics across pre-existing API queries. Focused runtime tests and the required plan verification remain green; the unit-of-work query uses an explicit boundary cast while preserving parameterized SQL.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- The explicit transaction boundary is ready for route-policy enforcement and later audit/domain work.
- The member slice remains intentionally incomplete; only its existing list/create operations were adapted.

## Self-Check: PASSED

- All seven declared created/modified files exist.
- Task commits `fd51748`, `19ad7ea`, `bec1794`, and `fd6bb4d` exist in git history.
- Required focused Vitest and real-role PostgreSQL tenancy commands pass.

---

_Phase: 01-tenant-and-production-safety-foundation_
_Completed: 2026-08-03_
