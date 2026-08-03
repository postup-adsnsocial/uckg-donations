# Technology Stack

**Analysis Date:** 2026-08-03

## Languages

**Primary:**
- TypeScript 5.9.2 - All application, shared-package, configuration, migration-script, and test code under `apps/`, `packages/`, `tests/`, and the root `*.config.ts` files. The repository enforces strict TypeScript settings through `tsconfig.base.json`.
- TSX (TypeScript with React JSX) - Next.js App Router pages and components under `apps/web/app/`, including `apps/web/app/login/login-form.tsx` and `apps/web/app/dashboard/page.tsx`.

**Secondary:**
- SQL (PostgreSQL dialect) - Versioned schema migrations in `packages/database/migrations/0000_dizzy_ricochet.sql` and `packages/database/migrations/0001_confused_dragon_man.sql`.
- CSS - Global web styling in `apps/web/app/styles.css`; no CSS framework dependency is declared in `apps/web/package.json`.
- JavaScript/ECMAScript modules - Tooling configuration in `eslint.config.mjs`; server and shared packages compile TypeScript to ESM because `apps/api/package.json`, `apps/worker/package.json`, and the package manifests declare `"type": "module"`.

## Runtime

**Environment:**
- Node.js 22.13.0 or newer is required by `package.json`; GitHub Actions runs Node.js 22 in `.github/workflows/ci.yml`.
- Server-side TypeScript targets ES2022 and uses NodeNext module resolution through `tsconfig.base.json`, `apps/api/tsconfig.json`, and `apps/worker/tsconfig.json`.
- Browser execution is provided by React/Next.js under `apps/web/app/`; supported test browsers are Chromium and Firefox in `playwright.config.ts` and `playwright.visual.config.ts`.

**Package Manager:**
- pnpm 11.9.0 is pinned by `package.json`; the declared minimum is pnpm 10.0.0.
- Lockfile: present at `pnpm-lock.yaml` using lockfile format 9.0.
- Workspace: `pnpm-workspace.yaml` includes `apps/*` and `packages/*`.

## Frameworks

**Core:**
- NestJS 11.1.6 - HTTP API, dependency injection, controllers, modules, and request guards in `apps/api/src/`; the process is bootstrapped with the Express adapter in `apps/api/src/main.ts`.
- Next.js 16.2.12 - Web application using the App Router in `apps/web/app/`; `apps/web/next.config.ts` enables standalone production output.
- React 19.2.6 and React DOM 19.2.6 - Client and server UI rendering for components and pages in `apps/web/app/`.
- Drizzle ORM 0.44.4 - Typed PostgreSQL schema and queries in `packages/database/src/schema.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/members/members.service.ts`, and `apps/api/src/tenancy/tenant.service.ts`.
- Zod 4.0.14 - Shared API input and response contracts in `packages/contracts/src/index.ts`.

**Testing:**
- Vitest 3.2.4 - Unit-test runner for `apps/**/*.spec.ts` and `packages/**/*.spec.ts`, configured in `vitest.config.ts`.
- Playwright Test 1.54.1 - Browser end-to-end tests in `tests/e2e/` and visual regression tests in `tests/visual/`, configured by `playwright.config.ts` and `playwright.visual.config.ts`.
- PostgreSQL migration harness - `packages/database/scripts/test-migrations.ts` creates an isolated temporary database, applies all migrations, verifies expected tables, and drops the database.

**Build/Dev:**
- TypeScript compiler 5.9.2 - Builds the API, worker, and shared packages through their `tsconfig.build.json` files; root orchestration is defined in `package.json`.
- Next.js build 16.2.12 - Produces the standalone web artifact configured in `apps/web/next.config.ts`.
- tsx 4.20.3 - Runs API and worker watch processes plus database/seed scripts from `apps/api/package.json`, `apps/worker/package.json`, and `packages/database/package.json`.
- Drizzle Kit 0.31.4 - Generates SQL migrations from `packages/database/src/schema.ts` using `packages/database/drizzle.config.ts`.
- concurrently 9.2.0 - Runs the API, web, and worker development processes together via the root `dev` script in `package.json`.
- ESLint 9.32.0 with typescript-eslint 8.65.0 and Next.js rules 16.2.12 - Static analysis configured in `eslint.config.mjs`.
- Prettier 3.6.2 - Formatting configured by `.prettierrc.json` and invoked through root scripts in `package.json`.

## Key Dependencies

**Critical:**
- `@nestjs/common`, `@nestjs/core`, and `@nestjs/platform-express` 11.1.6 - Define the HTTP application and its Express transport in `apps/api/package.json` and `apps/api/src/main.ts`.
- `next` 16.2.12, `react` 19.2.6, and `react-dom` 19.2.6 - Provide the complete frontend runtime declared in `apps/web/package.json`.
- `drizzle-orm` 0.44.4 - Shared database model and API query layer declared in `packages/database/package.json` and `apps/api/package.json`.
- `pg` 8.16.3 - PostgreSQL connection pooling used by `packages/database/src/index.ts` and exposed through `apps/api/src/database/database.service.ts`.
- `zod` 4.0.14 - Runtime validation for login, tenant IDs, member payloads, and response types in `packages/contracts/src/index.ts`.
- `reflect-metadata` 0.2.2 and `rxjs` 7.8.2 - NestJS runtime support declared in `apps/api/package.json`; metadata is initialized by `apps/api/src/main.ts`.

**Infrastructure:**
- PostgreSQL 16 Alpine - Local and CI database service declared in `docker-compose.yml` and `.github/workflows/ci.yml`.
- `@uckg/authorization` - Internal workspace package for scrypt password hashing, opaque session tokens, and church permission policy in `packages/authorization/src/`.
- `@uckg/contracts` - Internal workspace package for Zod schemas shared by API consumers and handlers in `packages/contracts/src/index.ts`.
- `@uckg/database` - Internal workspace package for the Drizzle schema and PostgreSQL connection factory in `packages/database/src/`.

## Configuration

**Environment:**
- Use environment variables at process boundaries; access is direct through `process.env` rather than a configuration framework. The API reads `DATABASE_URL`, `API_PORT`, `WEB_URL`, and `NODE_ENV` in `apps/api/src/database/database.service.ts`, `apps/api/src/main.ts`, and `apps/api/src/auth/auth.controller.ts`.
- The web client reads `NEXT_PUBLIC_API_URL` in `apps/web/app/lib/api.ts`; because it is a `NEXT_PUBLIC_*` value, treat it as public build/runtime configuration rather than a secret.
- Administrative bootstrap reads `DATABASE_URL`, `SEED_CHURCH_NAME`, `SEED_CHURCH_SLUG`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_DISPLAY_NAME`, `SEED_ADMIN_PASSWORD`, and optional `SEED_ADMIN_ROLE` in `apps/api/src/seed.ts`.
- Visual tests optionally target a deployed frontend with `VISUAL_BASE_URL` in `playwright.visual.config.ts`; `CI` changes retry, reporter, and server-reuse behavior in both Playwright configs.
- An environment example file is present at `.env.example`, and `.env`/`.env.local` are excluded in `.gitignore`; environment file contents are intentionally not included in this analysis.
- Development defaults exist for local ports and PostgreSQL URLs in `apps/api/src/main.ts`, `apps/api/src/database/database.service.ts`, `apps/web/app/lib/api.ts`, and `packages/database/drizzle.config.ts`.

**Build:**
- Root task orchestration and quality gates are defined in `package.json`; use `pnpm build`, `pnpm check`, or the full `pnpm check:full` pipeline described in `AGENTS.md`.
- Shared strict compiler options live in `tsconfig.base.json`; each application/package extends them through its own `tsconfig.json`, and emitted Node packages use `tsconfig.build.json`.
- Next.js standalone output and monorepo file tracing are configured in `apps/web/next.config.ts`.
- Database migration generation uses `packages/database/drizzle.config.ts`; migration execution uses `packages/database/scripts/migrate.ts`.
- Unit, functional browser, and visual test builds are configured in `vitest.config.ts`, `playwright.config.ts`, and `playwright.visual.config.ts`.

## Platform Requirements

**Development:**
- Install Node.js 22.13.0+, pnpm 10+, and Docker Desktop as documented in `README.md`; pnpm 11.9.0 is the reproducible package-manager version from `package.json`.
- Run PostgreSQL 16 locally through the `postgres` service in `docker-compose.yml`, then apply migrations with the `db:migrate` script from `package.json`.
- Install Chromium and Firefox binaries for the browser gates documented in `README.md`; the exact Playwright projects are in `playwright.config.ts` and `playwright.visual.config.ts`.

**Production:**
- The repository produces three separate Node.js deployables: NestJS API output from `apps/api/tsconfig.build.json`, Next.js standalone web output from `apps/web/next.config.ts`, and worker output from `apps/worker/tsconfig.build.json`.
- The API and worker start with Node.js using `dist/main.js` in `apps/api/package.json` and `apps/worker/package.json`; the web starts with `next start` in `apps/web/package.json`.
- A production hosting platform, container image, process manager, managed database provider, and deployment pipeline are not detected. `.github/workflows/ci.yml` performs validation only and does not deploy.
- Production requires a reachable PostgreSQL database supplied through `DATABASE_URL`; the application does not provision production infrastructure in the repository.

---

*Stack analysis: 2026-08-03*
