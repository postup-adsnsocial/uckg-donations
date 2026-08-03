# Testing Patterns

**Analysis Date:** 2026-08-03

## Test Framework

**Runner:**
- Vitest 3.2.4 runs unit tests across `apps/` and `packages/`; configuration is in `vitest.config.ts` and the version is pinned in `package.json`.
- Playwright Test 1.54.1 runs browser/API E2E tests from `tests/e2e/`; configuration is in `playwright.config.ts`.
- A separate Playwright configuration runs visual regression and layout-quality tests from `tests/visual/`; configuration is in `playwright.visual.config.ts`.
- The migration smoke test is a standalone `tsx` script rather than a Vitest suite: `packages/database/scripts/test-migrations.ts`.

**Assertion Library:**
- Use Vitest's `expect` for unit tests, imported with `describe`, `it`, and `vi` as needed in files such as `apps/api/src/tenancy/tenant.guard.spec.ts`.
- Use Playwright's auto-retrying `expect` for browser/API tests, imported with `test` from `@playwright/test` in `tests/e2e/foundation.spec.ts` and `tests/visual/login.visual.spec.ts`.

**Run Commands:**
```bash
pnpm test                 # Run all Vitest unit tests once
pnpm test:watch           # Run Vitest in watch mode
pnpm test:migrations      # Apply migrations to a temporary PostgreSQL database and verify tables
pnpm test:e2e             # Run functional Playwright tests
pnpm test:visual          # Run the screenshot and visual layout gate
pnpm check:full           # Run formatting, lint, types, unit tests, build, migrations, E2E, then visual tests
```

## Test File Organization

**Location:**
- Co-locate unit tests beside implementation files under `apps/**/src/` and `packages/**/src/`, for example `apps/api/src/auth/session-auth.guard.spec.ts` beside `apps/api/src/auth/session-auth.guard.ts`.
- Put reusable unit-test infrastructure in a local testing directory, as with `apps/api/src/testing/execution-context.ts`.
- Put cross-process/browser functional tests in `tests/e2e/`, separate from application source; current suites are `tests/e2e/foundation.spec.ts` and `tests/e2e/auth-tenancy.spec.ts`.
- Put screenshot and browser-layout tests in `tests/visual/`; approved images live beneath `tests/visual/__snapshots__/{platform}/{projectName}/` according to `playwright.visual.config.ts`.
- Keep migration verification with database operational scripts in `packages/database/scripts/test-migrations.ts`.

**Naming:**
- Name unit tests `<source>.spec.ts`, as in `packages/authorization/src/password.spec.ts` and `apps/web/app/i18n/config.spec.ts`.
- Name functional suites `<behavior>.spec.ts`, as in `tests/e2e/auth-tenancy.spec.ts`.
- Name screenshot suites `<surface>.visual.spec.ts`, as in `tests/visual/login.visual.spec.ts`.

**Structure:**
```text
apps/<app>/src/<feature>/<module>.spec.ts
packages/<package>/src/<module>.spec.ts
tests/e2e/<journey>.spec.ts
tests/visual/<surface>.visual.spec.ts
tests/visual/__snapshots__/<platform>/<project>/<test-file>/<snapshot>.png
```

## Test Structure

**Suite Organization:**
```typescript
// Pattern from apps/api/src/tenancy/tenant.guard.spec.ts
describe('TenantGuard', () => {
  it('returns 403 when a user from church A requests church B', async () => {
    const service = {
      resolve: vi.fn().mockResolvedValue(null),
    } as unknown as TenantService;
    const guard = new TenantGuard(service);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.resolve).toHaveBeenCalledWith(user, churchB);
  });
});
```

**Patterns:**
- Name suites after the unit or capability and write behavior-focused test names in present tense, following `packages/authorization/src/policy.spec.ts` and `apps/api/src/health/health.controller.spec.ts`.
- Keep each unit test in arrange-act-assert order without explicit section comments, as in `apps/api/src/auth/session-auth.guard.spec.ts`.
- Instantiate small classes directly instead of bootstrapping a Nest test module when dependency injection behavior itself is not under test, as in `apps/api/src/health/health.controller.spec.ts` and `apps/api/src/tenancy/permissions.guard.spec.ts`.
- For async results, use `.resolves` and `.rejects`; examples are `packages/authorization/src/password.spec.ts` and `apps/api/src/tenancy/tenant.guard.spec.ts`.
- Assert both outcome and interaction where policy depends on collaboration, such as the `resolve` call in `apps/api/src/tenancy/tenant.guard.spec.ts`.
- Use role/label-based locators in browser tests rather than CSS selectors for normal user interactions, as in `tests/e2e/foundation.spec.ts` and `tests/e2e/auth-tenancy.spec.ts`.

## Mocking

**Framework:** Vitest `vi`, used in `apps/api/src/auth/session-auth.guard.spec.ts`, `apps/api/src/tenancy/tenant.guard.spec.ts`, and `apps/api/src/tenancy/permissions.guard.spec.ts`.

**Patterns:**
```typescript
// Pattern from apps/api/src/auth/session-auth.guard.spec.ts
const authService = {
  authenticate: vi.fn().mockResolvedValue(user),
} as unknown as AuthService;

const guard = new SessionAuthGuard(authService);
```

```typescript
// Shared Nest execution-context fake from apps/api/src/testing/execution-context.ts
const context = createExecutionContext({
  authUser: user,
  headers: { 'x-church-id': churchId },
});
```

**What to Mock:**
- Mock immediate Nest service collaborators when unit-testing guards; use the smallest object surface needed by the subject, following `apps/api/src/auth/session-auth.guard.spec.ts` and `apps/api/src/tenancy/tenant.guard.spec.ts`.
- Mock `Reflector` metadata responses when unit-testing permission decisions, following `apps/api/src/tenancy/permissions.guard.spec.ts`.
- Reuse `createExecutionContext` from `apps/api/src/testing/execution-context.ts` instead of recreating Nest's full `ExecutionContext` per test.

**What NOT to Mock:**
- Do not mock deterministic domain utilities such as password hashing and permissions; test the real functions in `packages/authorization/src/password.spec.ts` and `packages/authorization/src/policy.spec.ts`.
- Do not mock PostgreSQL in migration and tenant-isolation E2E coverage; `packages/database/scripts/test-migrations.ts` and `tests/e2e/auth-tenancy.spec.ts` deliberately exercise real schema behavior.
- Do not mock browser rendering, navigation, cookies, accessibility roles, or screenshots in `tests/e2e/` and `tests/visual/`; Playwright drives the running applications configured by `playwright.config.ts` and `playwright.visual.config.ts`.

## Fixtures and Factories

**Test Data:**
```typescript
// Pattern from tests/e2e/auth-tenancy.spec.ts
const suffix = randomUUID().slice(0, 8);
const email = `e2e-auditor-${suffix}@example.com`;

test.beforeAll(async () => {
  // Insert uniquely named churches, an administrator, and membership.
});

test.afterAll(async () => {
  // Delete the administrator and churches, then close the pool.
});
```

**Location:**
- Small unit-test objects are inline in each `.spec.ts`, as in `apps/api/src/tenancy/tenant.guard.spec.ts`; there is no shared fixture/factory package.
- The sole shared test helper is `apps/api/src/testing/execution-context.ts`.
- Stateful E2E fixtures are created through Drizzle in `tests/e2e/auth-tenancy.spec.ts`, use a random suffix to avoid collisions, and are deleted in `test.afterAll`.
- The migration test creates and drops an isolated database with a timestamp/random name in `packages/database/scripts/test-migrations.ts`.

## Coverage

**Requirements:** No numeric line, branch, function, or statement threshold is enforced in `vitest.config.ts` or `.github/workflows/ci.yml`.

**Configuration:**
- `vitest.config.ts` declares the V8 provider and `text`, `json`, and `html` reporters.
- Vitest discovery is limited to `apps/**/*.spec.ts` and `packages/**/*.spec.ts` in `vitest.config.ts`; Playwright files under `tests/` are intentionally outside unit coverage.
- `@vitest/coverage-v8` is not declared in `package.json` or `pnpm-lock.yaml`, and no coverage script exists in `package.json`; coverage reporting is therefore configured but not part of the current quality gate.

**View Coverage:**
```bash
# No repository-supported coverage command is currently defined.
# The intended Vitest form after the configured V8 provider is installed is:
pnpm exec vitest run --coverage
```

## Test Types

**Unit Tests:**
- Cover authorization primitives in `packages/authorization/src/*.spec.ts`, API guards/controllers in `apps/api/src/**/*.spec.ts`, i18n helpers in `apps/web/app/i18n/config.spec.ts`, and the worker status in `apps/worker/src/worker.spec.ts`.
- `pnpm test` currently discovers 10 files and 20 tests under the include patterns in `vitest.config.ts`; the suite passes on the analyzed working tree.
- Prefer boundary and denial cases for security-sensitive code, as shown by cross-tenant rejection in `apps/api/src/tenancy/tenant.guard.spec.ts` and least-privilege checks in `packages/authorization/src/policy.spec.ts`.

**Integration Tests:**
- `packages/database/scripts/test-migrations.ts` verifies that all committed migrations apply to a fresh PostgreSQL database and that expected tables exist.
- `tests/e2e/auth-tenancy.spec.ts` is an integration-heavy Playwright suite: it inserts real database fixtures, calls the API, checks session-cookie properties and tenant authorization, and signs in through the web UI.
- `tests/e2e/foundation.spec.ts` verifies routing, locale persistence, translated UI, and the live API health endpoint.

**E2E Tests:**
- Playwright uses one `chromium` desktop project for functional E2E in `playwright.config.ts`.
- The E2E web servers start `@uckg/api` on port 3001 and `@uckg/web` on port 3000 via `playwright.config.ts`; package builds and database migrations are prerequisites in `.github/workflows/ci.yml`.
- E2E tests are fully parallel by default, except `tests/e2e/auth-tenancy.spec.ts`, which configures its stateful suite as serial.
- CI retries functional tests twice, records a trace on first retry, and uses the GitHub reporter according to `playwright.config.ts`.

## Visual Quality Gate

**Scope:**
- `tests/visual/login.visual.spec.ts` covers the login page in Brazilian Portuguese, English, and Spanish.
- `playwright.visual.config.ts` runs Chromium desktop at 1440×1000, Firefox desktop at 1440×1000, Chromium mobile at 390×844, and Chromium narrow at 320×800.
- Platform- and project-specific baselines are committed under `tests/visual/__snapshots__/darwin/` and `tests/visual/__snapshots__/linux/`.

**Determinism and comparison:**
- Wait for `networkidle` and `document.fonts.ready`, and hide the Next.js development portal before capturing screenshots, following `tests/visual/login.visual.spec.ts`.
- Keep light color scheme and reduced motion, disable animations, hide the caret, and reject screenshot differences above `maxDiffPixelRatio: 0.005`, as configured in `playwright.visual.config.ts`.
- Capture full-page screenshots named by locale in `tests/visual/login.visual.spec.ts`.

**Layout assertions:**
- Reject horizontal overflow by comparing root `scrollWidth` with `clientWidth` in `tests/visual/login.visual.spec.ts`.
- Require the locale selector, primary button, and password toggle to be at least 44×44 pixels in `tests/visual/login.visual.spec.ts` and `AGENTS.md`.
- Measure input placeholders/values and selected locale labels against available control width to detect clipping in `tests/visual/login.visual.spec.ts`.
- Confirm the locale combobox value and visible localized language label before screenshot comparison in `tests/visual/login.visual.spec.ts`.

**Review workflow:**
- For UI-affecting changes, run functional checks, then `pnpm test:e2e`, and run `pnpm test:visual` last, as required by `AGENTS.md`.
- Inspect every actual/diff image in `test-results/` before accepting a changed rendering, as required by `AGENTS.md` and documented in `README.md`.
- Run `pnpm test:visual:update` only after confirming the rendering change is intentional, then commit the reviewed baseline images with the UI change, per `AGENTS.md`.
- Use `pnpm check:full` as the final local handoff gate, per `AGENTS.md` and `package.json`.

## Common Patterns

**Async Testing:**
```typescript
// Unit pattern from packages/authorization/src/password.spec.ts
await expect(verifyPassword(password, hash)).resolves.toBe(true);
await expect(hashPassword('short')).rejects.toThrow('between 6 and 128');

// Browser/API pattern from tests/e2e/foundation.spec.ts
const response = await request.get('http://localhost:3001/health');
expect(response.ok()).toBe(true);
await expect(response.json()).resolves.toEqual({
  service: 'api',
  status: 'ok',
});
```

**Error Testing:**
```typescript
// Pattern from apps/api/src/tenancy/permissions.guard.spec.ts
expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

// Pattern from apps/api/src/tenancy/tenant.guard.spec.ts
await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
  UnauthorizedException,
);
```

**CI Gate:**
- The `quality` job in `.github/workflows/ci.yml` runs format checking, linting, type checking, unit tests, migration tests, and builds against PostgreSQL 16.
- The `e2e` job in `.github/workflows/ci.yml` builds workspace packages, migrates PostgreSQL, installs Chromium and Firefox, then runs functional E2E before visual tests.
- On E2E-job failure, CI uploads `test-results/` for 14 days via `.github/workflows/ci.yml` so traces and screenshot diffs can be inspected.

---

*Testing analysis: 2026-08-03*
