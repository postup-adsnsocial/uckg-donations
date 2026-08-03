# Codebase Concerns

**Analysis Date:** 2026-08-03

## Tech Debt

**Members domain is in progress, not complete:**
- Issue: The data model, migration, authorization permissions, and `GET`/`POST` API endpoints exist, but there is no member-facing web route, the dashboard still labels members as planned/disabled, and update, status-change, detail, search, and pagination flows are absent.
- Files: `packages/database/src/schema.ts`, `packages/database/migrations/0001_confused_dragon_man.sql`, `packages/contracts/src/index.ts`, `packages/authorization/src/policy.ts`, `apps/api/src/members/members.controller.ts`, `apps/api/src/members/members.service.ts`, `apps/api/src/members/members.module.ts`, `apps/api/src/app.module.ts`, `apps/web/app/dashboard/page.tsx`
- Impact: The current backend slice is not a usable end-to-end member-management feature. Treating it as complete would ship an inaccessible API with no lifecycle management and no coverage of domain behavior.
- Fix approach: Finish the slice with member service/controller tests, tenant-isolation E2E tests, paginated query contracts, localized list/create/edit/status UI, dashboard navigation, and visual coverage in all required locales and viewport profiles.

**Shared contracts are not enforced on responses:**
- Issue: `memberSchema` defines a response contract, but `MembersService` returns raw Drizzle selections and neither the controller nor service parses the result through the schema.
- Files: `packages/contracts/src/index.ts`, `apps/api/src/members/members.service.ts`, `apps/api/src/members/members.controller.ts`
- Impact: Database changes can silently alter HTTP response shape or serialization while TypeScript remains locally consistent; clients receive no runtime guarantee from the advertised schema.
- Fix approach: Parse/serialize API outputs through the shared response schema or establish a typed presenter used by both create and list paths; add contract tests around dates, null optional fields, and statuses.

**Timestamp maintenance is manual:**
- Issue: `updatedAt` defaults at insertion but is not database-managed on updates. Existing seed updates remember to set it explicitly, while future domain updates can easily omit it.
- Files: `packages/database/src/schema.ts`, `apps/api/src/seed.ts`
- Impact: Audit-facing timestamps can become stale and misleading as write paths expand.
- Fix approach: Centralize update helpers that always set `updatedAt`, or add a database trigger and migration so correctness is independent of each caller.

**Worker is only a readiness stub:**
- Issue: The worker starts, logs a static ready payload, and exits; it has no queue consumer, retry policy, job persistence, health endpoint, or graceful long-running loop.
- Files: `apps/worker/src/main.ts`, `apps/worker/src/worker.ts`, `apps/worker/src/worker.spec.ts`
- Impact: No asynchronous donation, reporting, notification, or reconciliation work can be delegated despite the worker being presented as a deployable process.
- Fix approach: Do not treat the worker as operational infrastructure. Add a concrete queue/storage integration, job contracts, retry/dead-letter behavior, shutdown handling, and integration tests before assigning production jobs to it.

**API configuration fails open to local defaults:**
- Issue: API, seed, and migration processes fall back to a development PostgreSQL URL when `DATABASE_URL` is missing; API CORS similarly falls back to the local web origin.
- Files: `apps/api/src/database/database.service.ts`, `apps/api/src/seed.ts`, `packages/database/scripts/migrate.ts`, `apps/api/src/main.ts`
- Impact: A misconfigured deployment can attempt to connect to the wrong database or start with an unintended origin policy instead of failing immediately.
- Fix approach: Permit defaults only outside production and validate all production configuration at startup with a typed environment schema.

## Known Bugs

**Platform administrators without memberships cannot enter the dashboard:**
- Symptoms: `/auth/me` returns only explicit church memberships, while the dashboard requires at least one membership to choose a church. A platform administrator is authorized by the API to select any active church but reaches the generic error state when their membership list is empty.
- Files: `apps/api/src/auth/auth.service.ts`, `apps/api/src/tenancy/tenant.service.ts`, `apps/web/app/dashboard/page.tsx`, `docs/architecture.md`
- Trigger: Sign in as an `admin_users.is_platform_admin = true` user with no row in `church_memberships`.
- Workaround: Add a regular membership for the platform administrator; the proper fix is a platform-admin church discovery/selection flow that preserves explicit tenant selection.

**Malformed percent-encoding in the session cookie can become a server error:**
- Symptoms: Cookie parsing calls `decodeURIComponent` without catching `URIError`; a malformed `uckg_session` cookie can escape guard handling instead of returning a clean 401.
- Files: `apps/api/src/auth/cookies.ts`, `apps/api/src/auth/session-auth.guard.ts`
- Trigger: Send a request with a cookie such as `uckg_session=%` to an authenticated endpoint.
- Workaround: Clear the malformed cookie. Fix by treating decode failures as an absent/invalid cookie and add a guard-level regression test.

**Login page exposes a real-looking address as initial form data:**
- Symptoms: The email input is pre-populated with `post.assessoria@gmail.com` for every visitor rather than starting blank or using a development-only fixture.
- Files: `apps/web/app/login/login-form.tsx`
- Trigger: Open any localized login route.
- Workaround: Manually replace the value. Fix by initializing the field to an empty string and keeping demo credentials outside production UI code.

## Security Considerations

**Login brute-force protection and authentication audit are absent:**
- Risk: Attackers can make unlimited credential guesses, and operators have no durable record of successful logins, failures, logouts, or suspicious tenant access attempts. The architecture explicitly marks both controls as required before production.
- Files: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.service.ts`, `docs/architecture.md`
- Current mitigation: Passwords use scrypt and errors do not directly disclose whether an email exists in `packages/authorization/src/password.ts` and `apps/api/src/auth/auth.service.ts`.
- Recommendations: Add per-IP and per-account throttling with safe proxy configuration, escalating delays/lock policy, and append-only structured auth audit events that exclude passwords and raw session tokens.

**Tenant isolation relies entirely on every application query:**
- Risk: Domain tables carry `church_id`, but PostgreSQL row-level security is not enabled. Any future query that omits its tenant predicate can read or mutate another church's data despite guards resolving a valid tenant.
- Files: `packages/database/src/schema.ts`, `packages/database/migrations/0000_dizzy_ricochet.sql`, `packages/database/migrations/0001_confused_dragon_man.sql`, `apps/api/src/tenancy/tenant.guard.ts`, `apps/api/src/members/members.service.ts`
- Current mitigation: Protected controllers use `SessionAuthGuard`, `TenantGuard`, and `PermissionsGuard`; current member listing explicitly filters by `churchId`.
- Recommendations: Introduce tenant-scoped repositories/query helpers and adversarial cross-tenant integration tests for every domain operation. For stronger defense in depth, set request-local tenant context and enforce PostgreSQL RLS policies.

**Authentication timing differs for unknown users:**
- Risk: `verifyPassword` runs only when an active user record exists, so repeated timing samples can potentially distinguish unknown/disabled accounts from valid accounts with wrong passwords.
- Files: `apps/api/src/auth/auth.service.ts`, `packages/authorization/src/password.ts`
- Current mitigation: HTTP error text is the same for missing users and incorrect passwords.
- Recommendations: Perform a dummy scrypt verification when no eligible record exists, then combine this with rate limiting and monitoring.

**Password policy permits weak six-character credentials:**
- Risk: Administrative accounts can be seeded with passwords much weaker than expected for financial and personal-data access.
- Files: `packages/authorization/src/password.ts`, `apps/web/app/login/login-form.tsx`, `apps/api/src/seed.ts`
- Current mitigation: Passwords are hashed with salted scrypt and have a maximum length to bound resource use.
- Recommendations: Raise the minimum for newly set passwords, support password-manager-friendly passphrases, check compromised-password lists where appropriate, and add a migration/rotation policy without weakening scrypt storage.

**Session lifecycle has no cleanup or global revocation workflow:**
- Risk: Expired rows accumulate indefinitely, password replacement through the seed path leaves prior sessions valid, and there is no operation to revoke all sessions for an administrator after suspected compromise.
- Files: `packages/database/src/schema.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/seed.ts`
- Current mitigation: Sessions expire after 12 hours, raw tokens are never stored, logout deletes the current token, and disabled users fail authentication.
- Recommendations: Delete expired sessions on a schedule, revoke all user sessions on password changes/security events, expose administrative revocation, and test those transitions.

**Security headers and explicit request-size limits are not configured:**
- Risk: The API relies on framework/server defaults for browser-facing security headers and body limits; the web app and API have no repository-level Content Security Policy or Helmet configuration.
- Files: `apps/api/src/main.ts`, `apps/api/package.json`, `apps/web/next.config.ts`
- Current mitigation: Session cookies are `httpOnly`, `SameSite=Strict`, and `Secure` in production; CORS allows a configured single origin.
- Recommendations: Add Helmet or equivalent headers, define a CSP for the web app, set explicit JSON/body limits, document trusted proxies, and regression-test production cookie/header behavior.

**Destructive tenant cascade has no recovery boundary:**
- Risk: Deleting a church cascades to memberships and members. The schema includes an `archived` status, but nothing prevents application or operator code from issuing a physical church delete and erasing tenant data.
- Files: `packages/database/src/schema.ts`, `packages/database/migrations/0000_dizzy_ricochet.sql`, `packages/database/migrations/0001_confused_dragon_man.sql`
- Current mitigation: No church deletion endpoint is present.
- Recommendations: Make archival the supported lifecycle, restrict production database delete privileges, require audited retention workflows, and define backup/restore tests before adding destructive endpoints.

## Performance Bottlenecks

**Member listing is unbounded:**
- Problem: `GET /members` loads every member for a church and sorts the complete matching set; the response has no cursor, limit, search boundary, or field projection negotiated by the client.
- Files: `apps/api/src/members/members.controller.ts`, `apps/api/src/members/members.service.ts`, `packages/contracts/src/index.ts`
- Cause: The in-progress member contract accepts no query parameters and the service has no `.limit()` clause.
- Improvement path: Add validated cursor pagination with a deterministic `(fullName, id)` cursor, capped page size, optional indexed search strategy, and response metadata before building the member UI.

**Every authenticated request writes the session row:**
- Problem: `authenticate()` updates `lastSeenAt` on every request, turning otherwise read-only traffic into database writes and increasing WAL, row churn, and contention on `admin_sessions`.
- Files: `apps/api/src/auth/auth.service.ts`, `packages/database/src/schema.ts`
- Cause: Activity tracking has no debounce interval or asynchronous aggregation.
- Improvement path: Update only when `lastSeenAt` is older than a threshold, or publish activity asynchronously; measure before selecting the interval.

**Expired sessions grow without bound:**
- Problem: Expiry is checked during authentication, but expired `admin_sessions` rows are never deleted.
- Files: `apps/api/src/auth/auth.service.ts`, `packages/database/src/schema.ts`, `apps/worker/src/worker.ts`
- Cause: There is no maintenance job and the worker is not yet a functioning processor.
- Improvement path: Add indexed batched deletion on a schedule, monitor table size, and retain only the audit data required by policy in a separate audit store.

## Fragile Areas

**Authorization depends on guard ordering and decorator discipline:**
- Files: `apps/api/src/members/members.controller.ts`, `apps/api/src/churches/churches.controller.ts`, `apps/api/src/tenancy/tenant.guard.ts`, `apps/api/src/tenancy/permissions.guard.ts`
- Why fragile: Tenant safety requires controllers to apply three guards in the correct order and each handler to declare permissions. `PermissionsGuard` permits handlers with no permission metadata, so forgetting a decorator can unintentionally make a route available to every authenticated tenant member.
- Safe modification: Provide a composite domain guard/decorator, deny by default when a protected controller lacks permission metadata, and add controller metadata tests for all domain routes.
- Test coverage: Guard units exist, but no automated inventory asserts that every domain handler is decorated; member routes have no E2E authorization tests in `tests/e2e/auth-tenancy.spec.ts`.

**Database migrations are checked only for table presence:**
- Files: `packages/database/scripts/test-migrations.ts`, `packages/database/migrations/0000_dizzy_ricochet.sql`, `packages/database/migrations/0001_confused_dragon_man.sql`
- Why fragile: The migration test confirms a fixed table-name list but does not verify foreign keys, checks, enums, unique indexes, downgrade/recovery behavior, or actual insert constraints.
- Safe modification: Extend migration tests with catalog assertions and representative accepted/rejected writes, especially tenant foreign keys, normalized email uniqueness, E.164 phone checks, and cascades.
- Test coverage: The current migration test would pass if a critical member constraint or index disappeared while the table remained.

**Frontend duplicates backend/auth contract types:**
- Files: `apps/web/app/dashboard/page.tsx`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.types.ts`, `packages/contracts/src/index.ts`
- Why fragile: Membership, authenticated-user, and current-church shapes are handwritten in the dashboard instead of exported from shared contracts; role or payload changes can compile independently and fail at runtime.
- Safe modification: Add Zod schemas and inferred types for `/auth/me` and `/churches/current` in `packages/contracts/src/index.ts`, validate fetched JSON, and remove local duplicate interfaces.
- Test coverage: `tests/e2e/auth-tenancy.spec.ts` checks only a partial shape and does not cover schema mismatch behavior.

**Dashboard async state can race during church selection:**
- Files: `apps/web/app/dashboard/page.tsx`
- Why fragile: Multiple `loadChurch` calls are not cancelled or sequenced. A slower earlier response can overwrite a later selection, and status remains ready while a switch is pending.
- Safe modification: Track request identity or use `AbortController`, set a distinct switching state, and only persist the church associated with the latest successful request.
- Test coverage: No component or E2E test rapidly changes between multiple memberships in `tests/e2e/auth-tenancy.spec.ts`.

## Scaling Limits

**Single unconfigured PostgreSQL pool per API process:**
- Current capacity: No load-tested capacity or explicit pool sizing is declared; `createDatabase()` uses the `pg` defaults for every API process.
- Limit: Horizontal API scaling multiplies database connections, while per-request session writes and unbounded member reads consume the same pool.
- Scaling path: Configure pool bounds/timeouts from validated environment settings, budget total connections across replicas, add metrics, and load-test authentication plus member listing.
- Files: `packages/database/src/index.ts`, `apps/api/src/database/database.service.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/members/members.service.ts`

**All member search/sort work targets the primary database:**
- Current capacity: No documented member-count target or benchmark exists.
- Limit: Sorting and transferring the full tenant population grows linearly; the `(church_id, full_name)` index helps ordered scans but does not bound response size or support flexible normalized search.
- Scaling path: Establish expected congregation sizes, implement cursor pagination first, then add a deliberate search index only for confirmed query patterns.
- Files: `packages/database/src/schema.ts`, `apps/api/src/members/members.service.ts`

## Dependencies at Risk

**No automated dependency or container vulnerability scanning:**
- Risk: Exact versions are locked, but CI performs build/test gates only and does not audit npm packages or the PostgreSQL service image for known vulnerabilities.
- Impact: Vulnerable transitive packages can remain unnoticed until manual review.
- Migration plan: Add scheduled Dependabot/Renovate updates and a non-secret-leaking dependency/container scan with an explicit severity policy.
- Files: `package.json`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`

## Missing Critical Features

**Operational observability is absent:**
- Problem: API and worker have no structured request logging, metrics, tracing, error tracking, readiness dependency checks, or alerting integration.
- Blocks: Production incident detection, tenant-aware diagnosis, latency/capacity planning, and reliable worker operation.
- Files: `apps/api/src/main.ts`, `apps/api/src/health/health.controller.ts`, `apps/worker/src/main.ts`, `apps/worker/src/worker.ts`

**Member lifecycle and UI are incomplete:**
- Problem: Only create and full-list backend operations exist; there is no user-accessible member screen or lifecycle beyond the database default `active` status.
- Blocks: Operators cannot use the members domain from the product, correct data, deactivate/reactivate records, or safely work with large churches.
- Files: `apps/api/src/members/members.controller.ts`, `apps/api/src/members/members.service.ts`, `apps/web/app/dashboard/page.tsx`, `packages/database/src/schema.ts`

**Production deployment and recovery definition are absent:**
- Problem: CI validates code but the repository contains no deployment manifest, backup/restore procedure, migration rollout strategy, or disaster-recovery test.
- Blocks: A repeatable, auditable production release of sensitive donation and member data.
- Files: `.github/workflows/ci.yml`, `packages/database/scripts/migrate.ts`, `README.md`

## Test Coverage Gaps

**Members API and service:**
- What's not tested: Validation failures, creation, duplicate email mapping, nullable email/phone, stable ordering, empty lists, tenant filtering, role permissions, cross-tenant access, and response serialization.
- Files: `apps/api/src/members/members.controller.ts`, `apps/api/src/members/members.service.ts`, `packages/contracts/src/index.ts`, `tests/e2e/auth-tenancy.spec.ts`
- Risk: The in-progress domain can regress or leak tenant data without the existing 20-test Vitest suite detecting it.
- Priority: High

**Authentication service and controller:**
- What's not tested: Login success/failure against the database, disabled users, expiry, `lastSeenAt`, logout deletion, cookie flags in production, malformed cookies, session revocation, and platform-admin behavior.
- Files: `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/cookies.ts`, `apps/api/src/auth/session-auth.guard.spec.ts`, `tests/e2e/auth-tenancy.spec.ts`
- Risk: Authentication and session regressions can bypass access expectations or lock out administrators.
- Priority: High

**Tenant service database behavior:**
- What's not tested: The real joins and filters for active/suspended/archived churches, stale memberships, platform administrators, and cross-tenant data queries.
- Files: `apps/api/src/tenancy/tenant.service.ts`, `apps/api/src/tenancy/tenant.guard.spec.ts`, `tests/e2e/auth-tenancy.spec.ts`
- Risk: Mock-based guard tests can pass while database-level tenant resolution is wrong.
- Priority: High

**Coverage enforcement:**
- What's not tested: There is no minimum line, branch, function, or statement threshold, and normal CI does not produce or enforce coverage.
- Files: `vitest.config.ts`, `package.json`, `.github/workflows/ci.yml`
- Risk: New modules can be merged with no tests while all configured gates remain green.
- Priority: Medium

**Platform-admin and multi-membership UI:**
- What's not tested: Church discovery for platform administrators, empty memberships, switching among multiple churches, failed switches, request races, and persistence of a stale selected church.
- Files: `apps/web/app/dashboard/page.tsx`, `tests/e2e/auth-tenancy.spec.ts`
- Risk: Privileged users can be unable to enter the product or can see UI state for a church other than their latest selection.
- Priority: High

---

*Concerns audit: 2026-08-03*
