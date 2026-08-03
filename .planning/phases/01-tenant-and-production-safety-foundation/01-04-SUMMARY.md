---
phase: 01-tenant-and-production-safety-foundation
plan: 04
subsystem: api
tags: [nestjs, zod, helmet, cors, postgresql, configuration]

requires:
  - phase: 01-tenant-and-production-safety-foundation
    provides: Separate runtime and migration database credentials from Plan 01-01
provides:
  - Production-aware fail-fast API environment validation
  - Bounded PostgreSQL runtime pool configured only from validated values
  - Helmet, credentialed CORS allowlist, explicit proxy trust, and 256kb request limits
affects: [login-throttling, observability, production-safety, deployment]

tech-stack:
  added: [@nestjs/config, @nestjs/throttler, helmet, nestjs-pino, pino, pino-http, prom-client, zod]
  patterns:
    - One global cached configuration module with a typed API wrapper
    - Runtime database and HTTP bootstrap consume validated values without direct environment reads

key-files:
  created:
    - apps/api/src/config/api-config.ts
    - apps/api/src/config/api-config.spec.ts
    - apps/api/src/config/api-config.service.ts
    - apps/api/src/config/api-config.module.ts
    - apps/api/src/database/database.service.spec.ts
  modified:
    - apps/api/src/database/database.service.ts
    - packages/database/src/index.ts
    - apps/api/src/app.module.ts
    - apps/api/src/main.ts
    - apps/api/package.json
    - pnpm-lock.yaml
    - .env.example

key-decisions:
  - 'Production requires every API, database, body, proxy, metrics, and login-limit setting; development and test retain conservative defaults.'
  - 'The API pool applies the statement timeout as both PostgreSQL statement_timeout and node-postgres query_timeout.'
  - 'Migration credentials remain script-only while ApiConfigService exposes only the runtime DATABASE_URL.'

patterns-established:
  - 'Configuration errors report invalid key names only and never echo submitted values.'
  - 'HTTP middleware is registered before routes, with Nest default body parsing disabled in favor of explicit 256kb parsers.'

requirements-completed: [SEC-01, SEC-02]

duration: 10 min
completed: 2026-08-03
---

# Phase 01 Plan 04: Production Configuration and Bootstrap Summary

**Fail-fast Zod configuration now drives a bounded PostgreSQL pool and hardened NestJS HTTP bootstrap with explicit proxy, Helmet, CORS, and request-size controls**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-03T18:45:14Z
- **Completed:** 2026-08-03T18:55:28Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Added a secret-safe production validation matrix covering every required runtime key, unsafe localhost/wildcard/proxy cases, and all development/test defaults.
- Removed direct environment reads from API database and HTTP bootstrap code while keeping migration credentials confined to the migration script.
- Bounded pool size, connection/idle/statement/query timeouts and identified connections with `application_name=uckg-api`.
- Applied Helmet, explicit trust proxy, credentialed origin allowlisting, 256kb JSON/urlencoded parsers, shutdown hooks, and validated listen port before startup.

## Task Commits

Each TDD task was committed as a RED test followed by its GREEN implementation:

1. **Task 1 RED: Define the production environment behavior** - `0c29009` (test)
2. **Task 1 GREEN: Implement validated API configuration** - `0ce06c2` (feat)
3. **Task 2 RED: Define bounded runtime pool behavior** - `bdeef4b` (test)
4. **Task 2 GREEN: Harden database and HTTP bootstrap** - `de6299e` (feat)

## Files Created/Modified

- `apps/api/src/config/api-config.ts` - Parses defaults and rejects incomplete or insecure production configuration without exposing values.
- `apps/api/src/config/api-config.spec.ts` - Covers 25 production failure and parsing cases, including secret canaries.
- `apps/api/src/config/api-config.service.ts` - Exposes the validated configuration as one typed injectable object.
- `apps/api/src/config/api-config.module.ts` - Registers cached global Nest configuration before dependent modules initialize.
- `apps/api/src/database/database.service.spec.ts` - Proves the API constructs an explicitly bounded runtime pool.
- `apps/api/src/database/database.service.ts` - Creates the database connection only from `ApiConfigService` values.
- `packages/database/src/index.ts` - Accepts explicit pool size and timeout options while preserving script callers.
- `apps/api/src/main.ts` - Installs proxy, Helmet, parsers, CORS and shutdown handling before listen.
- `apps/api/src/app.module.ts` - Loads global API configuration before the database module.
- `apps/api/package.json`, `pnpm-lock.yaml` - Pin the eight planned dependencies exactly.
- `.env.example` - Documents runtime versus migration URLs, all limits, and the provisional co-located `us-east-1` deployment note without a production secret.

## Decisions Made

- Production has no implicit operational defaults: port, runtime URL, origins, proxy policy, metrics token, body limit, pool bounds/timeouts, readiness timeout, and both login policies must all be explicit.
- A single validated statement limit configures both server-side `statement_timeout` and client-side `query_timeout`, preventing either side from waiting indefinitely.
- `MIGRATION_DATABASE_URL` stays outside the API source/config contract, so privileged migrator credentials cannot be injected into normal runtime composition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added a dedicated global API configuration module**

- **Found during:** Task 2 (Consume config in database and HTTP bootstrap)
- **Issue:** A root provider alone is not visible while imported database modules initialize, so the typed service needed a proper global module boundary.
- **Fix:** Added `ApiConfigModule` to own cached `ConfigModule.forRoot`, validation, and the exported typed service.
- **Files modified:** `apps/api/src/config/api-config.module.ts`, `apps/api/src/app.module.ts`
- **Verification:** API typecheck and all focused config/database tests pass.
- **Committed in:** `de6299e`

**2. [Rule 3 - Blocking] Unified Drizzle optional-peer resolution after adding observability dependencies**

- **Found during:** Task 1 (Define dependencies and production environment contract)
- **Issue:** Adding `prom-client` introduced OpenTelemetry into pnpm's peer context, temporarily linking the API and database workspaces to distinct Drizzle type identities.
- **Fix:** Refreshed the filtered database workspace installation against the updated lockfile so both workspaces resolve the same Drizzle peer variant.
- **Files modified:** `pnpm-lock.yaml` (planned dependency update); generated `node_modules` links were refreshed.
- **Verification:** `pnpm --filter @uckg/api typecheck` passes without duplicate Drizzle type errors.
- **Committed in:** `0ce06c2`

**3. [Rule 3 - Blocking] Reconciled legacy progress fields after updater no-ops**

- **Found during:** Plan metadata update
- **Issue:** GSD tools correctly counted 3/7 summaries and returned 43%, but left legacy STATE progress/velocity fields and the ROADMAP progress row at their previous 2/7 values.
- **Fix:** Reconciled those display fields with summary counts and recorded execution metrics while preserving concurrent plan state.
- **Files modified:** `.planning/STATE.md`, `.planning/ROADMAP.md`
- **Verification:** STATE and ROADMAP now both report three completed plans and 43% phase progress.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 blocking issues).
**Impact on plan:** Both changes were required for correct dependency injection and deterministic compilation; no product scope was added.

## Issues Encountered

- A broad forced install began fetching irrelevant optional platform binaries; it was stopped and replaced with a filtered database workspace refresh, which resolved the peer links without changing declared dependencies.
- The required `pnpm check:full` invocation stopped at `pnpm format:check` on 25 pre-existing or concurrently owned files. None are Plan 01-04 implementation files; the exact out-of-scope list is recorded in `deferred-items.md`.

## User Setup Required

None - `.env.example` documents all settings, while real production credentials and the metrics token remain deployment-injected secrets.

## Known Stubs

None. The blank `METRICS_TOKEN` in `.env.example` is intentional secret-safe documentation; production validation rejects it.

## Next Phase Readiness

- Plan 01-05 can consume the validated source/account login limits and explicit trusted-proxy policy.
- Plan 01-06 can consume the pinned Pino and Prometheus dependencies, metrics token, readiness timeout, and the same composition root.
- No blockers remain for production-safety work.

## Self-Check: PASSED

- All five declared created files exist.
- Task commits `0c29009`, `0ce06c2`, `bdeef4b`, and `de6299e` exist in git history.
- Focused config/database tests pass (31 tests), API typecheck passes, and API bootstrap/database contain no direct `process.env` reads.
- Pre-existing members work remains unstaged and uncommitted by this plan.

---

_Phase: 01-tenant-and-production-safety-foundation_
_Completed: 2026-08-03_
