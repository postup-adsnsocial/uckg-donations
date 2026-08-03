---
phase: 01-tenant-and-production-safety-foundation
plan: 01
subsystem: database
tags: [postgresql, rls, drizzle, multi-tenant, least-privilege]

requires: []
provides:
  - Forced PostgreSQL row-level security for members under the real runtime role
  - Composite members tenant candidate key for safe downstream foreign keys
  - Reusable isolated PostgreSQL migration and generated LOGIN-role test harness
  - Separate migration and runtime database credentials in local and CI topology
affects: [tenant-unit-of-work, members, donations, production-safety]

tech-stack:
  added: []
  patterns:
    - Stable NOLOGIN authorization role with generated LOGIN members
    - Transaction-local tenant context verified on a single pooled connection

key-files:
  created:
    - packages/database/migrations/0002_tenant_runtime_rls.sql
    - packages/database/migrations/meta/0002_snapshot.json
    - packages/database/scripts/postgres-test-harness.ts
    - packages/database/scripts/test-tenant-isolation.ts
  modified:
    - packages/database/src/schema.ts
    - packages/database/scripts/test-migrations.ts
    - packages/database/scripts/migrate.ts
    - docker-compose.yml
    - .github/workflows/ci.yml

key-decisions:
  - 'Migrations own a stable NOLOGIN uckg_runtime role; deployment and tests create separate LOGIN members that inherit it.'
  - 'Tenant context is transaction-local through parameterized set_config calls and is tested with Pool max 1.'
  - 'E2E fixture setup uses migration credentials while the spawned API uses the generated runtime DATABASE_URL.'

patterns-established:
  - 'Database test isolation: create, migrate, exercise, terminate clients, and drop temporary roles/database in finally cleanup.'
  - "RLS policy expression: church_id = NULLIF(current_setting('app.current_church_id', true), '')::uuid for safe missing context."

requirements-completed: [TEN-01, TEN-02]

duration: 11 min
completed: 2026-08-03
---

# Phase 01 Plan 01: Tenant and Production-Safety Foundation Summary

**Forced PostgreSQL tenant isolation with a least-privilege runtime role, composite member key, and real-login adversarial pool tests**

## Performance

- **Duration:** 11 min
- **Started:** 2026-08-03T18:30:25Z
- **Completed:** 2026-08-03T18:41:32Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Added a Drizzle-generated additive migration that preserves `0001`, creates the composite `(church_id, id)` member key, and forces RLS for `uckg_runtime`.
- Proved role attributes, ownership, policy expressions, migration-journal denial, and exact table/schema grants from PostgreSQL catalogs.
- Exercised missing-context and cross-tenant attacks through a generated real LOGIN role, including 25 A/B/none/A pool-reuse cycles and rollback.
- Split local and CI migrator/runtime credentials so migrations remain privileged while API execution uses a generated runtime login.

## Task Commits

Each task was committed atomically:

1. **Task 1: Establish the isolated PostgreSQL and runtime-role test harness** - `eb9500e` (test)
2. **Task 2: Add composite tenant key, least-privilege grants, and forced RLS** - `73a4326` (feat)
3. **Task 3: Prove isolation through the real runtime login and CI topology** - `63d6209` (test)

## Files Created/Modified

- `packages/database/scripts/postgres-test-harness.ts` - Creates, migrates, and reliably cleans isolated databases and generated runtime logins.
- `packages/database/scripts/test-tenant-isolation.ts` - Runs the real-role adversarial RLS, privilege, composite-FK, and pool-reuse proof.
- `packages/database/migrations/0002_tenant_runtime_rls.sql` - Adds the composite key, authorization role, grants, forced RLS, and tenant policy.
- `packages/database/migrations/meta/0002_snapshot.json` - Records the additive Drizzle schema snapshot.
- `packages/database/scripts/test-migrations.ts` - Preserves the five-table assertion and validates role/RLS/catalog state.
- `packages/database/scripts/migrate.ts` - Requires `MIGRATION_DATABASE_URL` without runtime or localhost fallback.
- `packages/database/src/schema.ts` - Adds only the planned member composite unique constraint.
- `docker-compose.yml` - Defines separate local migrator/runtime URLs and provisions the local runtime login after migration.
- `.github/workflows/ci.yml` - Runs migration and tenancy proofs and generates a runtime LOGIN URL for E2E.
- `tests/e2e/auth-tenancy.spec.ts` - Uses migrator credentials only for privileged fixture setup.

## Decisions Made

- Kept `uckg_runtime` as a stable NOLOGIN authorization group so migration-defined grants remain portable while actual credentials stay outside version control.
- Used transaction-local parameterized `set_config` for church, actor, and correlation context; session-global `SET ROLE` and tenant state are never used.
- Preserved least privilege by giving runtime only control-plane reads, session DML, and member SELECT/INSERT/UPDATE; DELETE, TRUNCATE, REFERENCES, schema CREATE, policy alteration, and migration-journal access remain denied.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Separated E2E fixture credentials from API runtime credentials**

- **Found during:** Task 3 (CI topology)
- **Issue:** Existing E2E fixture setup directly inserts control-plane rows, which the least-privilege runtime role must not be allowed to do.
- **Fix:** Made the fixture prefer `MIGRATION_DATABASE_URL`; CI still launches the API with the generated runtime `DATABASE_URL`.
- **Files modified:** `tests/e2e/auth-tenancy.spec.ts`
- **Verification:** Runtime tenancy and migration suites pass, and the CI runtime-role provisioning command was executed successfully against local PostgreSQL.
- **Committed in:** `63d6209`

**2. [Rule 3 - Blocking] Corrected legacy state progress fields after the updater no-op**

- **Found during:** Plan metadata update
- **Issue:** GSD progress tools reported 14% and 1/7 successfully but left the legacy STATE and ROADMAP display fields at 0% and 0/7.
- **Fix:** Reconciled those display fields with the tool-reported disk counts while preserving all existing state content.
- **Files modified:** `.planning/STATE.md`, `.planning/ROADMAP.md`
- **Verification:** STATE now shows Plan 2 of 7 and 14%; ROADMAP shows Phase 1 at 1/7 In Progress.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 2 auto-fixed (2 blocking issues).
**Impact on plan:** Both fixes preserve required security and accurate execution metadata; no product scope was added.

## Issues Encountered

- The Task 1 tenancy test intentionally failed before `0002` because `uckg_runtime` did not exist; Task 2 supplied the role and made the same command green as planned.

## User Setup Required

None - local Docker and CI generate non-production runtime credentials automatically.

## Known Stubs

None.

## Next Phase Readiness

- Database-level TEN-01/TEN-02 enforcement is ready for Plan 01-02 to introduce the explicit tenant unit of work.
- The pre-existing members slice remains intentionally incomplete and byte-for-byte preserved except for the additive composite-key and migration-test adaptations authorized by this plan.

## Self-Check: PASSED

- All four declared created files exist.
- Task commits `eb9500e`, `73a4326`, and `63d6209` exist in git history.
- Protected non-owned members artifacts match the pre-execution SHA-256 manifest.

---

_Phase: 01-tenant-and-production-safety-foundation_
_Completed: 2026-08-03_
