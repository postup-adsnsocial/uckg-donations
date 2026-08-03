---
phase: 01-tenant-and-production-safety-foundation
plan: 03
subsystem: authorization
tags: [nestjs, guards, metadata, discovery, fail-closed]

requires:
  - phase: 01-tenant-and-production-safety-foundation
    provides: Explicit tenant unit of work and ordered authentication/tenant guards
provides:
  - Global fail-closed route exposure classification
  - Permission-bearing DomainRoute with locked guard order
  - DiscoveryService inventory proof for every registered HTTP handler
affects: [auth, health, members, churches, future-api-routes]

tech-stack:
  added: []
  patterns:
    - Exactly one public, identity, internal, or domain classification per handler
    - Domain routes compose authentication, tenant resolution, and permission authorization

key-files:
  created:
    - apps/api/src/tenancy/route-policy.decorator.ts
    - apps/api/src/tenancy/route-policy.guard.ts
    - apps/api/src/tenancy/domain-route.decorator.ts
    - apps/api/src/tenancy/route-policy-inventory.spec.ts
  modified:
    - apps/api/src/tenancy/permissions.guard.ts
    - apps/api/src/tenancy/permissions.guard.spec.ts
    - apps/api/src/tenancy/tenancy.module.ts
    - apps/api/src/auth/auth.controller.ts
    - apps/api/src/churches/churches.controller.ts
    - apps/api/src/members/members.controller.ts
    - apps/api/src/health/health.controller.ts

key-decisions:
  - 'Use one metadata key per route policy so duplicate classifications remain detectable instead of overwriting each other.'
  - 'Keep the dirty central authorization matrix byte-for-byte unchanged and expose its current permission vocabulary from the API guard for runtime inventory validation.'
  - 'Build the inventory from the AppModule import graph, then use a test-local DiscoveryService context so production database providers are not initialized.'

patterns-established:
  - 'Every new HTTP handler must carry exactly one explicit route policy decorator.'
  - 'Every domain handler uses DomainRoute with at least one ChurchPermission rather than manually repeating guards.'

requirements-completed: [TEN-03]

duration: 7 min
completed: 2026-08-03
---

# Phase 01 Plan 03: Fail-Closed Route Authorization Summary

**Global route classification, permission-bearing domain guard composition, and a complete DiscoveryService-backed controller inventory make omitted authorization metadata deny by default**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-03T18:59:08Z
- **Completed:** 2026-08-03T19:06:43Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Added explicit `public`, `identity`, `internal`, and `domain` route classifications with a global guard that denies missing or ambiguous metadata.
- Added `DomainRoute(firstPermission, ...rest)` with the fixed `SessionAuthGuard`, `TenantGuard`, `PermissionsGuard` order and fail-closed permission validation.
- Classified all eight current HTTP handlers, including explicit public health and login routes, while preserving member feature behavior.
- Added a dynamic controller inventory that discovers registered handlers and proves each has exactly one classification and valid domain permissions.

## Task Commits

Each task followed RED/GREEN TDD commits:

1. **Task 1 RED: Define fail-closed route policy behavior** - `9da9737` (test)
2. **Task 1 GREEN: Enforce fail-closed route policy contracts** - `8af4300` (feat)
3. **Task 2 RED: Add failing route classification inventory** - `eb88e87` (test)
4. **Task 2 GREEN: Classify and inventory every API route** - `37a113d` (feat)

## Files Created/Modified

- `apps/api/src/tenancy/route-policy.decorator.ts` - Defines the four exact policy decorators and independently detectable metadata keys.
- `apps/api/src/tenancy/route-policy.guard.ts` - Globally denies unclassified or multiply classified handlers.
- `apps/api/src/tenancy/domain-route.decorator.ts` - Composes domain classification, required permissions, and locked guard order.
- `apps/api/src/tenancy/route-policy-inventory.spec.ts` - Discovers all registered controllers and validates route metadata.
- `apps/api/src/tenancy/permissions.guard.ts` - Denies missing, empty, and unknown permissions before evaluating role access.
- `apps/api/src/tenancy/permissions.guard.spec.ts` - Covers omission, ambiguity, unknown permission, insufficient role, and domain guard composition.
- `apps/api/src/tenancy/tenancy.module.ts` - Registers RoutePolicyGuard globally through `APP_GUARD`.
- `apps/api/src/auth/auth.controller.ts` - Classifies login as public and logout/me as identity routes.
- `apps/api/src/churches/churches.controller.ts` - Replaces repeated guards and permission decorators with DomainRoute.
- `apps/api/src/members/members.controller.ts` - Applies DomainRoute without changing the incomplete member feature behavior.
- `apps/api/src/health/health.controller.ts` - Makes current health exposure explicitly public.

## Decisions Made

- Independent boolean metadata keys preserve evidence of multiple classifications; a single overwritten policy value could not fail closed when decorators are accidentally stacked.
- The runtime permission set lives beside `PermissionsGuard` so inventory and authorization share validation while the protected Plan 01 authorization matrix remains unchanged.
- The inventory walks the real `AppModule` module graph but registers discovered controllers in an isolated Nest context, avoiding database/config initialization while still using `DiscoveryService` for handler enumeration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reconciled legacy state progress after updater partial no-op**

- **Found during:** Plan metadata update
- **Issue:** GSD tools reported 57% and 4/7 but left legacy STATE/ROADMAP display fields at 43% and 3/7, and appended the metric outside the established metrics structure.
- **Fix:** Reconciled the displayed progress, velocity totals, recent trend, and roadmap count while preserving all accumulated project context.
- **Files modified:** `.planning/STATE.md`, `.planning/ROADMAP.md`
- **Verification:** STATE and ROADMAP now both report four of seven plans complete and 57% progress.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 1 auto-fixed (1 blocking issue).
**Impact on plan:** Metadata now accurately reflects the on-disk summaries; no product scope was added.

## Issues Encountered

- Directly bootstrapping the production `AppModule` in Vitest attempted to initialize database providers whose emitted injection metadata is not available in the test transform. The inventory now builds a test-local Nest context from the real module graph's controller registrations, preserving complete discovery without opening production resources.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- TEN-03 route authorization is fail closed and ready for Plan 01-05 login protection and Plan 01-06 health/metrics expansion.
- Any health handlers added by Plan 01-06 must retain explicit public/internal classification, and all new controllers will require an inventory expectation update.

## Self-Check: PASSED

- All four declared created files exist.
- TDD commits `9da9737`, `8af4300`, `eb88e87`, and `37a113d` exist in git history.
- Protected authorization files match the Plan 01 SHA-256 manifest.
- The member controller differs from its pre-plan state only through planned guard/decorator/import changes.

---

_Phase: 01-tenant-and-production-safety-foundation_
_Completed: 2026-08-03_
