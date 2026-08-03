# Codebase Structure

**Analysis Date:** 2026-08-03

## Directory Layout

```text
uckg-donations/
├── apps/
│   ├── api/                         # NestJS HTTP API and administrative seed process
│   │   └── src/
│   │       ├── auth/                # Sessions, identity resolution, cookies, current-user context
│   │       ├── churches/            # Tenant-aware church endpoints
│   │       ├── database/            # Nest lifecycle wrapper around shared database factory
│   │       ├── health/              # API health endpoint
│   │       ├── members/             # Tenant-scoped member feature module
│   │       ├── tenancy/             # Tenant resolution and permission guards/decorators
│   │       ├── testing/             # API unit-test helpers
│   │       ├── app.module.ts         # API module composition root
│   │       ├── main.ts               # API runtime entry point
│   │       └── seed.ts               # Administrative bootstrap entry point
│   ├── web/                         # Next.js App Router frontend
│   │   ├── app/
│   │   │   ├── [locale]/             # Localized route tree and locale layout
│   │   │   ├── components/           # Reusable presentation components
│   │   │   ├── dashboard/            # Shared dashboard page implementation
│   │   │   ├── i18n/                 # Locale config, typed dictionaries, Intl formatters
│   │   │   ├── lib/                  # Browser-side infrastructure helpers
│   │   │   ├── login/                # Shared login page and form implementation
│   │   │   ├── layout.tsx            # Root HTML layout
│   │   │   ├── page.tsx              # Locale-aware root redirect
│   │   │   └── styles.css             # Global frontend styles
│   │   └── public/                   # Static web assets
│   └── worker/                      # Separate asynchronous-process boundary
│       └── src/                      # Worker entry point, logic, and colocated test
├── packages/
│   ├── authorization/               # Shared policies, password hashing, session tokens
│   ├── contracts/                   # Shared Zod schemas and inferred contract types
│   └── database/                    # Drizzle schema, connection factory, migrations, scripts
├── tests/
│   ├── e2e/                         # Playwright API/browser end-to-end flows
│   └── visual/                      # Playwright visual tests and committed snapshots
├── docs/                            # Maintained system architecture notes
├── .github/workflows/ci.yml         # CI quality and end-to-end jobs
├── AGENTS.md                        # Repository-specific UI quality requirements
├── package.json                     # Root scripts, engines, and tooling dependencies
├── pnpm-workspace.yaml              # Workspace membership
├── tsconfig.base.json               # Shared strict TypeScript defaults
├── vitest.config.ts                 # Unit-test discovery and workspace aliases
├── playwright.config.ts             # Functional E2E configuration
└── playwright.visual.config.ts      # Visual regression matrix and snapshots
```

## Directory Purposes

**`apps/api/`:**
- Purpose: Own the deployable NestJS HTTP application and API-specific operational scripts.
- Contains: TypeScript source in `apps/api/src/`, package scripts in `apps/api/package.json`, and build/typecheck configuration in `apps/api/tsconfig.json` and `apps/api/tsconfig.build.json`.
- Key files: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/seed.ts`.

**`apps/api/src/auth/`:**
- Purpose: Own administrative authentication, session lifecycle, and authenticated-user request context.
- Contains: `auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `session-auth.guard.ts`, `current-user.decorator.ts`, `cookies.ts`, `auth.types.ts`, and colocated guard tests.
- Key files: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/session-auth.guard.ts`.

**`apps/api/src/tenancy/`:**
- Purpose: Resolve church access and apply declarative tenant permissions to protected routes.
- Contains: Tenant/permission guards, the tenant service, decorators, module registration, and colocated guard tests.
- Key files: `apps/api/src/tenancy/tenant.guard.ts`, `apps/api/src/tenancy/tenant.service.ts`, `apps/api/src/tenancy/permissions.guard.ts`, `apps/api/src/tenancy/permissions.decorator.ts`.

**`apps/api/src/churches/`:**
- Purpose: Expose tenant-scoped church information and settings authorization checks.
- Contains: `apps/api/src/churches/churches.module.ts` and `apps/api/src/churches/churches.controller.ts`.
- Key files: `apps/api/src/churches/churches.controller.ts`.

**`apps/api/src/members/`:**
- Purpose: Own the member domain HTTP and persistence behavior while keeping every operation scoped to a church.
- Contains: `apps/api/src/members/members.module.ts`, `apps/api/src/members/members.controller.ts`, and `apps/api/src/members/members.service.ts`.
- Key files: `apps/api/src/members/members.controller.ts`, `apps/api/src/members/members.service.ts`.

**`apps/api/src/database/`:**
- Purpose: Adapt the shared database package to Nest dependency injection and lifecycle management.
- Contains: The global `DatabaseModule` and injectable `DatabaseService`.
- Key files: `apps/api/src/database/database.module.ts`, `apps/api/src/database/database.service.ts`.

**`apps/api/src/health/`:**
- Purpose: Provide a minimal API liveness endpoint and its unit test.
- Contains: `apps/api/src/health/health.controller.ts` and `apps/api/src/health/health.controller.spec.ts`.
- Key files: `apps/api/src/health/health.controller.ts`.

**`apps/api/src/testing/`:**
- Purpose: Hold reusable API-specific test construction helpers rather than production runtime code.
- Contains: The Nest execution-context factory in `apps/api/src/testing/execution-context.ts`.
- Key files: `apps/api/src/testing/execution-context.ts`.

**`apps/web/`:**
- Purpose: Own the deployable Next.js frontend and its route/component tree.
- Contains: App Router source in `apps/web/app/`, static assets in `apps/web/public/`, standalone output configuration in `apps/web/next.config.ts`, and TypeScript configuration in `apps/web/tsconfig.json`.
- Key files: `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/styles.css`, `apps/web/next.config.ts`.

**`apps/web/app/[locale]/`:**
- Purpose: Make locale an explicit URL segment and provide locale-specific metadata/document context.
- Contains: The locale layout plus thin page re-exports for login and dashboard.
- Key files: `apps/web/app/[locale]/layout.tsx`, `apps/web/app/[locale]/login/page.tsx`, `apps/web/app/[locale]/dashboard/page.tsx`.

**`apps/web/app/login/` and `apps/web/app/dashboard/`:**
- Purpose: Hold shared page implementations used by the localized route files.
- Contains: Client-rendered route UI and local interaction state.
- Key files: `apps/web/app/login/page.tsx`, `apps/web/app/login/login-form.tsx`, `apps/web/app/dashboard/page.tsx`.

**`apps/web/app/components/`:**
- Purpose: Hold reusable presentation components shared across pages.
- Contains: Brand, locale switcher, and document-language components.
- Key files: `apps/web/app/components/brand-panel.tsx`, `apps/web/app/components/brand-wordmark.tsx`, `apps/web/app/components/locale-switcher.tsx`, `apps/web/app/components/document-locale.tsx`.

**`apps/web/app/i18n/`:**
- Purpose: Centralize supported locales, translation shape/content, route localization, and locale-sensitive formatting.
- Contains: `apps/web/app/i18n/config.ts`, `apps/web/app/i18n/dictionaries.ts`, `apps/web/app/i18n/format.ts`, and colocated unit tests.
- Key files: `apps/web/app/i18n/config.ts`, `apps/web/app/i18n/dictionaries.ts`, `apps/web/app/i18n/format.ts`.

**`apps/web/app/lib/`:**
- Purpose: Hold browser infrastructure shared by frontend features.
- Contains: The credentialed fetch wrapper and API base URL in `apps/web/app/lib/api.ts`.
- Key files: `apps/web/app/lib/api.ts`.

**`apps/worker/`:**
- Purpose: Preserve a separately runnable boundary for future asynchronous processing.
- Contains: Runtime/build configuration and source files in `apps/worker/src/`.
- Key files: `apps/worker/src/main.ts`, `apps/worker/src/worker.ts`, `apps/worker/src/worker.spec.ts`.

**`packages/authorization/`:**
- Purpose: Publish shared, framework-neutral authorization and credential primitives as `@uckg/authorization`.
- Contains: Library source and colocated tests under `packages/authorization/src/`, plus package/build configuration.
- Key files: `packages/authorization/src/index.ts`, `packages/authorization/src/policy.ts`, `packages/authorization/src/password.ts`, `packages/authorization/src/session-token.ts`.

**`packages/contracts/`:**
- Purpose: Publish runtime-validated cross-boundary contracts as `@uckg/contracts`.
- Contains: Zod schemas and inferred TypeScript types in `packages/contracts/src/index.ts`.
- Key files: `packages/contracts/src/index.ts`.

**`packages/database/`:**
- Purpose: Publish typed persistence primitives as `@uckg/database` and own the PostgreSQL migration lifecycle.
- Contains: Drizzle schema/factory in `packages/database/src/`, committed SQL/meta artifacts in `packages/database/migrations/`, operational scripts in `packages/database/scripts/`, and `packages/database/drizzle.config.ts`.
- Key files: `packages/database/src/schema.ts`, `packages/database/src/index.ts`, `packages/database/scripts/migrate.ts`, `packages/database/scripts/test-migrations.ts`.

**`tests/e2e/`:**
- Purpose: Verify full API and browser workflows against running web/API processes and PostgreSQL.
- Contains: Playwright specifications configured by `playwright.config.ts`.
- Key files: `tests/e2e/auth-tenancy.spec.ts`, `tests/e2e/foundation.spec.ts`.

**`tests/visual/`:**
- Purpose: Verify localized frontend rendering, viewport constraints, and screenshot stability.
- Contains: `tests/visual/login.visual.spec.ts` and committed platform/project snapshots under `tests/visual/__snapshots__/`.
- Key files: `tests/visual/login.visual.spec.ts`, `playwright.visual.config.ts`.

**`docs/`:**
- Purpose: Record the intended current system boundaries and non-negotiable tenancy/i18n rules.
- Contains: `docs/architecture.md`.
- Key files: `docs/architecture.md`.

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts`: Starts the NestJS API process.
- `apps/api/src/app.module.ts`: Composes API modules and root controllers.
- `apps/web/app/layout.tsx`: Defines the root Next.js HTML shell.
- `apps/web/app/page.tsx`: Redirects the root request into the locale route tree.
- `apps/web/app/[locale]/layout.tsx`: Validates locale segments and provides localized metadata.
- `apps/worker/src/main.ts`: Starts the worker process.
- `apps/api/src/seed.ts`: Runs the administrative bootstrap operation.
- `packages/database/scripts/migrate.ts`: Applies the database migration chain.
- `packages/database/scripts/test-migrations.ts`: Verifies migrations in a temporary database.

**Configuration:**
- `package.json`: Defines root lifecycle, quality, build, database, E2E, and visual-test commands.
- `pnpm-workspace.yaml`: Includes every direct child of `apps/` and `packages/` as a workspace project.
- `tsconfig.base.json`: Enforces shared strict TypeScript and NodeNext defaults.
- `apps/api/tsconfig.json`: Enables Nest decorator metadata and API typechecking.
- `apps/web/tsconfig.json`: Configures Next.js bundler resolution, JSX, DOM libraries, and generated route types.
- `apps/worker/tsconfig.json`: Configures the NodeNext worker source set.
- `packages/database/drizzle.config.ts`: Points Drizzle Kit at `packages/database/src/schema.ts` and `packages/database/migrations/`.
- `vitest.config.ts`: Discovers colocated unit tests and maps `@uckg/*` imports directly to package source.
- `playwright.config.ts`: Starts API/web servers and runs functional E2E tests under `tests/e2e/`.
- `playwright.visual.config.ts`: Defines the browser/viewport screenshot matrix under `tests/visual/`.
- `.github/workflows/ci.yml`: Runs quality, migration, E2E, and visual gates in CI.
- `AGENTS.md`: Defines required local UI verification order and visual acceptance constraints.

**Core Logic:**
- `apps/api/src/auth/auth.service.ts`: Administrative login, session authentication/logout, and membership listing.
- `apps/api/src/tenancy/tenant.service.ts`: Active church and membership resolution.
- `apps/api/src/tenancy/permissions.guard.ts`: Converts route permission metadata into access decisions.
- `apps/api/src/members/members.service.ts`: Tenant-scoped member listing and creation.
- `packages/authorization/src/policy.ts`: Role-to-permission policy matrix.
- `packages/contracts/src/index.ts`: Runtime request/response validation schemas.
- `packages/database/src/schema.ts`: PostgreSQL domain model and invariants.
- `apps/web/app/dashboard/page.tsx`: Client-side session/church loading and dashboard state.
- `apps/web/app/i18n/dictionaries.ts`: Typed copy for every supported interface locale.

**Testing:**
- `apps/api/src/**/*.spec.ts`: Colocated API unit tests.
- `apps/worker/src/worker.spec.ts`: Colocated worker unit test.
- `packages/authorization/src/*.spec.ts`: Colocated shared authorization tests.
- `apps/web/app/i18n/config.spec.ts`: Colocated localization unit tests.
- `tests/e2e/*.spec.ts`: Cross-process functional tests.
- `tests/visual/login.visual.spec.ts`: Visual and responsive login checks.
- `tests/visual/__snapshots__/`: Reviewed screenshot baselines.

## Naming Conventions

**Files:**
- Use lowercase kebab-case for multiword TypeScript source names, as in `apps/api/src/auth/session-auth.guard.ts`, `apps/web/app/components/locale-switcher.tsx`, and `packages/authorization/src/session-token.ts`.
- Use Nest role suffixes for API classes: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.guard.ts`, and `*.decorator.ts` under `apps/api/src/`.
- Name colocated unit tests `*.spec.ts`, as in `apps/api/src/tenancy/tenant.guard.spec.ts`; place cross-process specs in `tests/e2e/*.spec.ts` or `tests/visual/*.visual.spec.ts`.
- Use Next.js App Router reserved filenames `page.tsx` and `layout.tsx` under `apps/web/app/`; place substantial shared route implementations in a named parent segment such as `apps/web/app/login/page.tsx` and expose them through `apps/web/app/[locale]/login/page.tsx`.
- Use `index.ts` as the public package entry point, as in `packages/authorization/src/index.ts`, `packages/contracts/src/index.ts`, and `packages/database/src/index.ts`.
- Keep generated Drizzle migrations numbered and descriptive under `packages/database/migrations/`, for example `packages/database/migrations/0001_confused_dragon_man.sql`.

**Directories:**
- Use lowercase feature nouns for API modules, as in `apps/api/src/auth/`, `apps/api/src/churches/`, `apps/api/src/members/`, and `apps/api/src/tenancy/`.
- Use lowercase concern nouns for frontend support code, as in `apps/web/app/components/`, `apps/web/app/i18n/`, and `apps/web/app/lib/`.
- Use bracketed dynamic segments only for Next.js routing, as in `apps/web/app/[locale]/`.
- Use package names matching the published workspace namespace: directory `packages/authorization/` publishes `@uckg/authorization` through `packages/authorization/package.json`.

**Symbols:**
- Use PascalCase for Nest classes, React components, interfaces, and inferred domain types, as shown in `apps/api/src/members/members.service.ts`, `apps/web/app/login/login-form.tsx`, and `packages/contracts/src/index.ts`.
- Use camelCase for functions, variables, schema objects, and decorator constants, as shown in `packages/database/src/index.ts`, `apps/web/app/i18n/config.ts`, and `apps/api/src/tenancy/permissions.decorator.ts`.
- Name Zod values with a `Schema` suffix and derive the adjacent PascalCase type, as in `createMemberRequestSchema`/`CreateMemberRequest` in `packages/contracts/src/index.ts`.

## Where to Add New Code

**New API Feature:**
- Primary code: Create `apps/api/src/<feature>/<feature>.module.ts`, `apps/api/src/<feature>/<feature>.controller.ts`, and `apps/api/src/<feature>/<feature>.service.ts` when persistence/business logic is required; mirror `apps/api/src/members/`.
- Registration: Import the new module once in `apps/api/src/app.module.ts`.
- Tests: Co-locate unit tests as `apps/api/src/<feature>/*.spec.ts`; add cross-process flows to `tests/e2e/` when routing, database, authentication, or tenancy behavior spans boundaries.
- Authorization: Reuse `apps/api/src/auth/auth.module.ts` and `apps/api/src/tenancy/tenancy.module.ts`; apply the guard chain used in `apps/api/src/members/members.controller.ts` for tenant-owned data.

**New Tenant-Owned Domain Entity:**
- Schema: Define the table, foreign key to `churches`, indexes, constraints, and inferred type in `packages/database/src/schema.ts`.
- Migration: Generate and commit SQL plus metadata under `packages/database/migrations/`; update the expected table assertions in `packages/database/scripts/test-migrations.ts` when a new table is added.
- Contract: Add boundary schemas and inferred types to `packages/contracts/src/index.ts`.
- API: Pass the church ID from `CurrentTenant` in the controller to the service, following `apps/api/src/members/members.controller.ts` and `apps/api/src/members/members.service.ts`.
- Policy: Add new permissions and role mappings in `packages/authorization/src/policy.ts`, then apply them with `RequirePermissions` from `apps/api/src/tenancy/permissions.decorator.ts`.

**New Web Page:**
- Localized route: Add `apps/web/app/[locale]/<route>/page.tsx`.
- Shared implementation: If the page uses `useParams` to derive locale like current pages, keep the implementation in `apps/web/app/<route>/page.tsx` and re-export it from the localized route, following `apps/web/app/[locale]/dashboard/page.tsx`.
- Copy: Extend the `Dictionary` interface and all locales in `apps/web/app/i18n/dictionaries.ts`.
- Styling: Add shared global rules to `apps/web/app/styles.css`; reusable UI belongs in `apps/web/app/components/`.
- API access: Use `apiRequest` from `apps/web/app/lib/api.ts`; do not import `packages/database/` into the web app.
- Tests: Add functional coverage under `tests/e2e/` and visual coverage/snapshots under `tests/visual/` when rendered UI changes.

**New Shared Contract:**
- Implementation: Add the Zod schema and inferred type to `packages/contracts/src/index.ts` and import it via `@uckg/contracts`.
- Tests: Co-locate a new `*.spec.ts` in `packages/contracts/src/` when transformation or validation behavior warrants direct coverage; Vitest discovers `packages/**/*.spec.ts` through `vitest.config.ts`.

**New Authorization Capability:**
- Implementation: Add focused framework-neutral logic under `packages/authorization/src/` and export it from `packages/authorization/src/index.ts`.
- Tests: Co-locate the corresponding `*.spec.ts` beside the implementation under `packages/authorization/src/`.
- API adapter: Keep Nest-specific guards/decorators under `apps/api/src/auth/` or `apps/api/src/tenancy/`, not in the shared package.

**New Background Job:**
- Implementation: Add job/handler modules under `apps/worker/src/` and invoke their registration from `apps/worker/src/main.ts`.
- Shared dependencies: Put reusable contracts, policies, or database primitives in the corresponding `packages/` workspace rather than importing API internals from `apps/api/src/`.
- Tests: Co-locate worker unit tests as `apps/worker/src/*.spec.ts` following `apps/worker/src/worker.spec.ts`.

**Utilities:**
- Shared frontend helpers: Add browser/UI utilities under `apps/web/app/lib/` or the focused concern directory `apps/web/app/i18n/`.
- Shared API test helpers: Add them under `apps/api/src/testing/`.
- Cross-process domain utilities: Add them to an existing focused package under `packages/`, expose them through that package's `src/index.ts`, and consume them by the `@uckg/*` workspace name.

## Special Directories

**`packages/database/migrations/`:**
- Purpose: Stores ordered Drizzle SQL migrations and schema snapshots derived from `packages/database/src/schema.ts`.
- Generated: Yes, through Drizzle Kit configured in `packages/database/drizzle.config.ts`.
- Committed: Yes; migration SQL and `packages/database/migrations/meta/` are repository artifacts required by deployment and migration tests.

**`tests/visual/__snapshots__/`:**
- Purpose: Stores approved screenshots for locales, browsers, platforms, and viewports configured by `playwright.visual.config.ts`.
- Generated: Yes, by Playwright snapshot update runs.
- Committed: Yes; `AGENTS.md` requires reviewing and committing intentional visual reference changes.

**`apps/*/dist/` and `packages/*/dist/`:**
- Purpose: Stores emitted JavaScript/declarations/source maps from package and application builds.
- Generated: Yes, through build scripts in each workspace `package.json` and `tsconfig.build.json`.
- Committed: No; `dist/` is ignored by `.gitignore`.

**`apps/web/.next/`:**
- Purpose: Stores Next.js build output, route types, and development cache.
- Generated: Yes, by Next.js commands from `apps/web/package.json`.
- Committed: No; `.next/` is ignored by `.gitignore`.

**`node_modules/`:**
- Purpose: Stores pnpm-installed workspace dependencies.
- Generated: Yes, by `pnpm install` using `pnpm-lock.yaml` and `pnpm-workspace.yaml`.
- Committed: No; `node_modules/` is ignored by `.gitignore`.

**`test-results/` and `playwright-report/`:**
- Purpose: Stores Playwright traces, failure artifacts, diffs, and reports produced from `playwright.config.ts` and `playwright.visual.config.ts`.
- Generated: Yes, by Playwright test runs.
- Committed: No; both are ignored by `.gitignore`, while CI uploads `test-results/` as an artifact from `.github/workflows/ci.yml` on failure.

**`coverage/`:**
- Purpose: Stores V8 coverage reports configured in `vitest.config.ts`.
- Generated: Yes, by Vitest coverage runs.
- Committed: No; `coverage/` is ignored by `.gitignore`.

**`.planning/codebase/`:**
- Purpose: Stores GSD codebase reference documents used by later planning and execution workflows.
- Generated: Yes, by codebase mapping.
- Committed: Expected as planning documentation; the current architecture map files are `.planning/codebase/ARCHITECTURE.md` and `.planning/codebase/STRUCTURE.md`.

---

*Structure analysis: 2026-08-03*
