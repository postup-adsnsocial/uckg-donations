<!-- GSD:project-start source:PROJECT.md -->

## Project

**UCKG Donations**

UCKG Donations é uma plataforma web administrativa multi-igreja para cadastro de membros, gestão
de doações e acompanhamento financeiro das congregações da Universal. Operadores trabalham sempre
dentro de uma igreja selecionada, com permissões por função, rastreabilidade e uma experiência
profissional em português brasileiro, inglês e espanhol.

**Core Value:** Cada igreja consegue registrar e acompanhar suas contribuições com segurança, clareza e isolamento
total dos dados de outras congregações.

### Constraints

- **Arquitetura**: manter monólito modular no monorepo pnpm — evita complexidade prematura
- **Tenancy**: todo registro de domínio possui `church_id` e toda query é filtrada pela igreja ativa — impede acesso cross-tenant
- **Segurança**: negar acesso por padrão, aplicar privilégio mínimo e nunca versionar credenciais — há dados pessoais e financeiros
- **Internacionalização**: textos novos entram nos três dicionários no mesmo change set — evita experiências incompletas por idioma
- **Qualidade visual**: mudanças de UI executam `pnpm test:visual` depois dos testes funcionais — acabamento faz parte da correção
- **Compatibilidade**: Node.js 22.13+, pnpm, PostgreSQL 16, Next.js 16 e NestJS 11 — stack já estabelecida
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 5.9.2 - All application, shared-package, configuration, migration-script, and test code under `apps/`, `packages/`, `tests/`, and the root `*.config.ts` files. The repository enforces strict TypeScript settings through `tsconfig.base.json`.
- TSX (TypeScript with React JSX) - Next.js App Router pages and components under `apps/web/app/`, including `apps/web/app/login/login-form.tsx` and `apps/web/app/dashboard/page.tsx`.
- SQL (PostgreSQL dialect) - Versioned schema migrations in `packages/database/migrations/0000_dizzy_ricochet.sql` and `packages/database/migrations/0001_confused_dragon_man.sql`.
- CSS - Global web styling in `apps/web/app/styles.css`; no CSS framework dependency is declared in `apps/web/package.json`.
- JavaScript/ECMAScript modules - Tooling configuration in `eslint.config.mjs`; server and shared packages compile TypeScript to ESM because `apps/api/package.json`, `apps/worker/package.json`, and the package manifests declare `"type": "module"`.

## Runtime

- Node.js 22.13.0 or newer is required by `package.json`; GitHub Actions runs Node.js 22 in `.github/workflows/ci.yml`.
- Server-side TypeScript targets ES2022 and uses NodeNext module resolution through `tsconfig.base.json`, `apps/api/tsconfig.json`, and `apps/worker/tsconfig.json`.
- Browser execution is provided by React/Next.js under `apps/web/app/`; supported test browsers are Chromium and Firefox in `playwright.config.ts` and `playwright.visual.config.ts`.
- pnpm 11.9.0 is pinned by `package.json`; the declared minimum is pnpm 10.0.0.
- Lockfile: present at `pnpm-lock.yaml` using lockfile format 9.0.
- Workspace: `pnpm-workspace.yaml` includes `apps/*` and `packages/*`.

## Frameworks

- NestJS 11.1.6 - HTTP API, dependency injection, controllers, modules, and request guards in `apps/api/src/`; the process is bootstrapped with the Express adapter in `apps/api/src/main.ts`.
- Next.js 16.2.12 - Web application using the App Router in `apps/web/app/`; `apps/web/next.config.ts` enables standalone production output.
- React 19.2.6 and React DOM 19.2.6 - Client and server UI rendering for components and pages in `apps/web/app/`.
- Drizzle ORM 0.44.4 - Typed PostgreSQL schema and queries in `packages/database/src/schema.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/members/members.service.ts`, and `apps/api/src/tenancy/tenant.service.ts`.
- Zod 4.0.14 - Shared API input and response contracts in `packages/contracts/src/index.ts`.
- Vitest 3.2.4 - Unit-test runner for `apps/**/*.spec.ts` and `packages/**/*.spec.ts`, configured in `vitest.config.ts`.
- Playwright Test 1.54.1 - Browser end-to-end tests in `tests/e2e/` and visual regression tests in `tests/visual/`, configured by `playwright.config.ts` and `playwright.visual.config.ts`.
- PostgreSQL migration harness - `packages/database/scripts/test-migrations.ts` creates an isolated temporary database, applies all migrations, verifies expected tables, and drops the database.
- TypeScript compiler 5.9.2 - Builds the API, worker, and shared packages through their `tsconfig.build.json` files; root orchestration is defined in `package.json`.
- Next.js build 16.2.12 - Produces the standalone web artifact configured in `apps/web/next.config.ts`.
- tsx 4.20.3 - Runs API and worker watch processes plus database/seed scripts from `apps/api/package.json`, `apps/worker/package.json`, and `packages/database/package.json`.
- Drizzle Kit 0.31.4 - Generates SQL migrations from `packages/database/src/schema.ts` using `packages/database/drizzle.config.ts`.
- concurrently 9.2.0 - Runs the API, web, and worker development processes together via the root `dev` script in `package.json`.
- ESLint 9.32.0 with typescript-eslint 8.65.0 and Next.js rules 16.2.12 - Static analysis configured in `eslint.config.mjs`.
- Prettier 3.6.2 - Formatting configured by `.prettierrc.json` and invoked through root scripts in `package.json`.

## Key Dependencies

- `@nestjs/common`, `@nestjs/core`, and `@nestjs/platform-express` 11.1.6 - Define the HTTP application and its Express transport in `apps/api/package.json` and `apps/api/src/main.ts`.
- `next` 16.2.12, `react` 19.2.6, and `react-dom` 19.2.6 - Provide the complete frontend runtime declared in `apps/web/package.json`.
- `drizzle-orm` 0.44.4 - Shared database model and API query layer declared in `packages/database/package.json` and `apps/api/package.json`.
- `pg` 8.16.3 - PostgreSQL connection pooling used by `packages/database/src/index.ts` and exposed through `apps/api/src/database/database.service.ts`.
- `zod` 4.0.14 - Runtime validation for login, tenant IDs, member payloads, and response types in `packages/contracts/src/index.ts`.
- `reflect-metadata` 0.2.2 and `rxjs` 7.8.2 - NestJS runtime support declared in `apps/api/package.json`; metadata is initialized by `apps/api/src/main.ts`.
- PostgreSQL 16 Alpine - Local and CI database service declared in `docker-compose.yml` and `.github/workflows/ci.yml`.
- `@uckg/authorization` - Internal workspace package for scrypt password hashing, opaque session tokens, and church permission policy in `packages/authorization/src/`.
- `@uckg/contracts` - Internal workspace package for Zod schemas shared by API consumers and handlers in `packages/contracts/src/index.ts`.
- `@uckg/database` - Internal workspace package for the Drizzle schema and PostgreSQL connection factory in `packages/database/src/`.

## Configuration

- Use environment variables at process boundaries; access is direct through `process.env` rather than a configuration framework. The API reads `DATABASE_URL`, `API_PORT`, `WEB_URL`, and `NODE_ENV` in `apps/api/src/database/database.service.ts`, `apps/api/src/main.ts`, and `apps/api/src/auth/auth.controller.ts`.
- The web client reads `NEXT_PUBLIC_API_URL` in `apps/web/app/lib/api.ts`; because it is a `NEXT_PUBLIC_*` value, treat it as public build/runtime configuration rather than a secret.
- Administrative bootstrap reads `DATABASE_URL`, `SEED_CHURCH_NAME`, `SEED_CHURCH_SLUG`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_DISPLAY_NAME`, `SEED_ADMIN_PASSWORD`, and optional `SEED_ADMIN_ROLE` in `apps/api/src/seed.ts`.
- Visual tests optionally target a deployed frontend with `VISUAL_BASE_URL` in `playwright.visual.config.ts`; `CI` changes retry, reporter, and server-reuse behavior in both Playwright configs.
- An environment example file is present at `.env.example`, and `.env`/`.env.local` are excluded in `.gitignore`; environment file contents are intentionally not included in this analysis.
- Development defaults exist for local ports and PostgreSQL URLs in `apps/api/src/main.ts`, `apps/api/src/database/database.service.ts`, `apps/web/app/lib/api.ts`, and `packages/database/drizzle.config.ts`.
- Root task orchestration and quality gates are defined in `package.json`; use `pnpm build`, `pnpm check`, or the full `pnpm check:full` pipeline described in `AGENTS.md`.
- Shared strict compiler options live in `tsconfig.base.json`; each application/package extends them through its own `tsconfig.json`, and emitted Node packages use `tsconfig.build.json`.
- Next.js standalone output and monorepo file tracing are configured in `apps/web/next.config.ts`.
- Database migration generation uses `packages/database/drizzle.config.ts`; migration execution uses `packages/database/scripts/migrate.ts`.
- Unit, functional browser, and visual test builds are configured in `vitest.config.ts`, `playwright.config.ts`, and `playwright.visual.config.ts`.

## Platform Requirements

- Install Node.js 22.13.0+, pnpm 10+, and Docker Desktop as documented in `README.md`; pnpm 11.9.0 is the reproducible package-manager version from `package.json`.
- Run PostgreSQL 16 locally through the `postgres` service in `docker-compose.yml`, then apply migrations with the `db:migrate` script from `package.json`.
- Install Chromium and Firefox binaries for the browser gates documented in `README.md`; the exact Playwright projects are in `playwright.config.ts` and `playwright.visual.config.ts`.
- The repository produces three separate Node.js deployables: NestJS API output from `apps/api/tsconfig.build.json`, Next.js standalone web output from `apps/web/next.config.ts`, and worker output from `apps/worker/tsconfig.build.json`.
- The API and worker start with Node.js using `dist/main.js` in `apps/api/package.json` and `apps/worker/package.json`; the web starts with `next start` in `apps/web/package.json`.
- A production hosting platform, container image, process manager, managed database provider, and deployment pipeline are not detected. `.github/workflows/ci.yml` performs validation only and does not deploy.
- Production requires a reachable PostgreSQL database supplied through `DATABASE_URL`; the application does not provision production infrastructure in the repository.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Use lowercase kebab-case for TypeScript module names, such as `apps/api/src/auth/session-auth.guard.ts`, `apps/api/src/tenancy/current-tenant.decorator.ts`, and `apps/web/app/components/locale-switcher.tsx`.
- Co-locate Vitest files with the source and name them `<module>.spec.ts`, as in `apps/api/src/tenancy/tenant.guard.spec.ts` and `packages/authorization/src/password.spec.ts`.
- Use Playwright suffixes to distinguish browser suites: `tests/e2e/auth-tenancy.spec.ts` for functional E2E and `tests/visual/login.visual.spec.ts` for screenshot tests.
- Use NestJS role suffixes consistently: `.module.ts`, `.controller.ts`, `.service.ts`, `.guard.ts`, and `.decorator.ts` in directories such as `apps/api/src/auth/` and `apps/api/src/tenancy/`.
- Use Next.js App Router reserved filenames (`page.tsx`, `layout.tsx`) beneath `apps/web/app/`; place reusable UI in descriptive kebab-case component files under `apps/web/app/components/`.
- Use camelCase verbs for functions and methods: `hashPassword` in `packages/authorization/src/password.ts`, `createDatabase` in `packages/database/src/index.ts`, and `loadChurch` in `apps/web/app/dashboard/page.tsx`.
- Use `is...` names for type predicates and boolean checks, such as `isLocale` in `apps/web/app/i18n/config.ts` and `isUniqueViolation` in `apps/api/src/members/members.service.ts`.
- Name React event handlers `handle...` or action verbs scoped to the component, as shown by `handleSubmit` in `apps/web/app/login/login-form.tsx` and `changeLocale` in `apps/web/app/components/locale-switcher.tsx`.
- Keep Nest controller methods terse and aligned with the route action (`login`, `logout`, `me`, `list`, `create`) in `apps/api/src/auth/auth.controller.ts` and `apps/api/src/members/members.controller.ts`.
- Use camelCase for local values and module constants, including `sessionDurationMilliseconds` in `apps/api/src/auth/auth.service.ts` and `databaseUrl` in `tests/e2e/auth-tenancy.spec.ts`.
- Use descriptive names for database rows and returned values (`record`, `membership`, `member`, `connection`) rather than abbreviations in `apps/api/src/auth/auth.service.ts`, `apps/api/src/tenancy/tenant.service.ts`, and `packages/database/src/index.ts`.
- Use `const` by default; use `let` only for state that is assigned later, such as fixture IDs in `tests/e2e/auth-tenancy.spec.ts`.
- Keep serialized database column names in snake_case at the SQL boundary while exposing camelCase TypeScript properties, as defined in `packages/database/src/schema.ts`.
- Use PascalCase for interfaces, type aliases, classes, and React prop types: `AuthenticatedAdmin` in `apps/api/src/auth/auth.types.ts`, `LoginResult` in `apps/api/src/auth/auth.service.ts`, and `LocaleSwitcherProps` in `apps/web/app/components/locale-switcher.tsx`.
- Prefer interfaces for object-shaped public contracts and component props, as in `WorkerStatus` in `apps/worker/src/worker.ts` and `LoginFormProps` in `apps/web/app/login/login-form.tsx`.
- Derive contract types from Zod schemas instead of duplicating request definitions, as `LoginRequest`, `CreateMemberRequest`, and `MemberResponse` do in `packages/contracts/src/index.ts`.
- Derive database entity types from Drizzle tables via `$inferSelect`, as done for `Church`, `AdminUser`, and `Member` in `packages/database/src/schema.ts`.
- Use literal unions and `as const` for closed sets such as `Locale` in `apps/web/app/i18n/config.ts` and the locale fixtures in `tests/visual/login.visual.spec.ts`.

## Code Style

- Run Prettier 3.6.2 through `pnpm format` or `pnpm format:check`; both scripts are defined in `package.json`.
- Follow Prettier defaults because no `.prettierrc` or alternate formatter configuration is present; the resulting style uses single quotes, semicolons, trailing commas, and wrapped multiline calls throughout `apps/` and `packages/`.
- Use two-space indentation in TypeScript, TSX, JSON, and configuration files, as represented by `apps/api/src/auth/auth.service.ts`, `apps/web/app/login/login-form.tsx`, and `vitest.config.ts`.
- Run `pnpm lint`; `package.json` invokes ESLint with `--max-warnings=0`, so warnings fail the gate.
- Follow the ESLint recommended JavaScript and TypeScript rule sets configured in `eslint.config.mjs`.
- For `apps/web/**/*.{js,jsx,ts,tsx}`, follow Next.js recommended and Core Web Vitals rules configured in `eslint.config.mjs`; only `@next/next/no-html-link-for-pages` is disabled.
- Keep formatting rules delegated to Prettier through `eslint-config-prettier` in `eslint.config.mjs`.
- Preserve strict compiler safety from `tsconfig.base.json`, especially `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, and consistent filename casing.

## Import Organization

- Import shared workspace packages through `@uckg/authorization`, `@uckg/contracts`, and `@uckg/database`; their source aliases for tests are configured in `vitest.config.ts` and their package exports are declared in `packages/*/package.json`.
- In NodeNext ESM code under `apps/api/`, `apps/worker/`, and `packages/`, include `.js` on relative imports even when the source file is TypeScript, as in `apps/api/src/main.ts` and `packages/authorization/src/policy.ts`.
- In Next.js code under `apps/web/`, use extensionless relative imports, as in `apps/web/app/dashboard/page.tsx` and `apps/web/app/login/login-form.tsx`.
- No application-wide `@/` alias is configured in `apps/web/tsconfig.json`; continue using relative paths inside the web app.

## Error Handling

- At HTTP boundaries, validate untrusted bodies and headers with Zod `safeParse`, then throw an explicit Nest exception; examples are `apps/api/src/auth/auth.controller.ts`, `apps/api/src/members/members.controller.ts`, and `apps/api/src/tenancy/tenant.guard.ts`.
- Use Nest exception classes to preserve HTTP semantics: `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, and `ConflictException` are applied in `apps/api/src/auth/`, `apps/api/src/tenancy/`, and `apps/api/src/members/`.
- Preserve unexpected errors by rethrowing them after handling only a recognized condition, as the PostgreSQL `23505` branch does in `apps/api/src/members/members.service.ts`.
- Return `null` for an expected lookup miss and let the guard/service caller translate it into policy behavior, as in `apps/api/src/auth/auth.service.ts` and `apps/api/src/tenancy/tenant.service.ts`.
- In client UI, map anticipated HTTP status codes to localized user messages and use `try`/`catch`/`finally` to restore submission state, as in `apps/web/app/login/login-form.tsx`.
- When an invariant makes progress impossible, throw a descriptive `Error`, as in fixture creation in `tests/e2e/auth-tenancy.spec.ts` and insert-return validation in `apps/api/src/members/members.service.ts`.

## Logging

- Let Nest provide runtime server logging from the bootstrap in `apps/api/src/main.ts`; application services and controllers do not emit routine console output.
- Use `console.info` only for command-line operational confirmation, as in `packages/database/scripts/test-migrations.ts`.
- Do not log passwords, session tokens, or complete authentication payloads; these sensitive values flow through `apps/api/src/auth/auth.service.ts` and `apps/api/src/auth/auth.controller.ts` without logging.

## Comments

- Prefer expressive names and small helpers over explanatory comments; production modules such as `packages/authorization/src/password.ts` and `apps/api/src/tenancy/tenant.guard.ts` are effectively self-documenting.
- Add comments only for non-obvious constraints or intent that cannot be expressed by types or names. There are no recurring TODO/FIXME conventions in the inspected source tree.
- Not used in current application code. Keep public APIs self-describing through explicit interfaces, schemas, and return types, following `packages/contracts/src/index.ts` and `packages/authorization/src/policy.ts`.

## Function Design

- Keep domain utilities focused on one operation, as in `hashPassword` and `verifyPassword` in `packages/authorization/src/password.ts`.
- Split reusable or nested behavior into a private helper when it improves the main flow, as `deriveKey` does in `packages/authorization/src/password.ts` and `toAuthenticatedAdmin` does in `apps/api/src/auth/auth.service.ts`.
- For React components with multiple async flows, keep each flow as a named local function/callback and render explicit loading/error/ready branches, as in `apps/web/app/dashboard/page.tsx`.
- Prefer typed positional parameters for short domain operations (`hasPermission` in `packages/authorization/src/policy.ts`) and destructured props for React components (`LoginForm` in `apps/web/app/login/login-form.tsx`).
- Accept `unknown` at untrusted request boundaries and narrow it using a schema, as in `apps/api/src/auth/auth.controller.ts` and `apps/api/src/members/members.controller.ts`.
- Inject Nest dependencies through constructors and mark them `private readonly`, as in `apps/api/src/auth/auth.service.ts` and `apps/api/src/tenancy/tenant.service.ts`.
- Add explicit return types to shared utilities and policy functions, as in `packages/authorization/src/password.ts`, `packages/authorization/src/policy.ts`, and `apps/web/app/lib/api.ts`.
- Allow local controller/service return types to be inferred when the implementation directly returns a validated or queried value, as in `apps/api/src/auth/auth.controller.ts` and `apps/api/src/members/members.service.ts`.
- Model expected absence as `T | null` and side-effect-only async operations as `Promise<void>`, following `apps/api/src/auth/auth.service.ts` and `apps/api/src/tenancy/tenant.service.ts`.

## Module Design

- Use named exports for shared functions, types, schemas, services, guards, and components throughout `packages/authorization/src/`, `packages/contracts/src/`, and `apps/api/src/`.
- Use default exports only where Next.js or configuration conventions require them, such as route components in `apps/web/app/**/page.tsx` and configs in `vitest.config.ts`, `playwright.config.ts`, and `eslint.config.mjs`.
- Keep Nest feature boundaries explicit through a colocated module/controller/service trio, as in `apps/api/src/members/` and `apps/api/src/auth/`.
- Use package-root barrels for public workspace APIs: `packages/authorization/src/index.ts`, `packages/database/src/index.ts`, and `packages/contracts/src/index.ts`.
- Do not create barrels inside application feature folders; import the concrete relative module directly, following `apps/api/src/auth/auth.controller.ts` and `apps/web/app/dashboard/page.tsx`.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## Pattern Overview

- Keep deployable process boundaries in `apps/web/`, `apps/api/`, and `apps/worker/`; the intended system shape is documented in `docs/architecture.md`.
- Organize the NestJS API by feature module under `apps/api/src/`, with controllers handling HTTP concerns and injectable services handling persistence-backed use cases.
- Put cross-process domain primitives in `packages/`: authorization rules in `packages/authorization/src/`, runtime contracts in `packages/contracts/src/`, and PostgreSQL schema/access in `packages/database/src/`.
- Enforce tenant selection and role permissions before domain controllers run through the ordered guard chain in `apps/api/src/tenancy/`.
- Keep the browser as an API client: Next.js routes and components in `apps/web/app/` call the NestJS API through `apps/web/app/lib/api.ts` rather than importing database code.
- Keep tenant ownership explicit on domain rows and in queries; the current member flow passes `tenant.church.id` from `apps/api/src/members/members.controller.ts` into tenant-filtered operations in `apps/api/src/members/members.service.ts`.

## Layers

- Purpose: Render localized login and dashboard experiences, maintain browser interaction state, and call the HTTP API.
- Location: `apps/web/app/`
- Contains: Next.js App Router layouts/pages, client components, CSS, localization dictionaries, formatters, and the fetch wrapper in `apps/web/app/lib/api.ts`.
- Depends on: Next.js and React from `apps/web/package.json`, the public API base URL in `apps/web/app/lib/api.ts`, and static assets in `apps/web/public/`.
- Used by: Browser users entering through `apps/web/app/page.tsx` or localized routes beneath `apps/web/app/[locale]/`.
- Purpose: Bootstrap NestJS, configure CORS and shutdown behavior, and compose application modules.
- Location: `apps/api/src/main.ts` and `apps/api/src/app.module.ts`
- Contains: The Nest application entry point, root module imports, and the root health controller registration.
- Depends on: Feature modules in `apps/api/src/auth/`, `apps/api/src/churches/`, `apps/api/src/members/`, `apps/api/src/tenancy/`, and the global database module in `apps/api/src/database/`.
- Used by: The API runtime started through scripts in `apps/api/package.json`.
- Purpose: Expose cohesive HTTP endpoints and coordinate feature-specific use cases.
- Location: `apps/api/src/auth/`, `apps/api/src/churches/`, and `apps/api/src/members/`
- Contains: Nest modules, controllers, injectable services, decorators, feature-local types, and feature-local helpers.
- Depends on: Cross-cutting tenancy/database services in `apps/api/src/tenancy/` and `apps/api/src/database/`, plus workspace packages imported as `@uckg/*`.
- Used by: `apps/api/src/app.module.ts`, which imports each top-level feature module.
- Purpose: Resolve session identity, validate the selected church, attach request context, and enforce role permissions.
- Location: `apps/api/src/auth/`, `apps/api/src/tenancy/`, and `packages/authorization/src/`
- Contains: `SessionAuthGuard`, `TenantGuard`, `PermissionsGuard`, request decorators, `TenantService`, session/password helpers, and permission policy definitions.
- Depends on: Database tables exported from `packages/database/src/schema.ts`, request validation from `packages/contracts/src/index.ts`, and Nest execution context/metadata.
- Used by: Protected controllers such as `apps/api/src/churches/churches.controller.ts` and `apps/api/src/members/members.controller.ts`.
- Purpose: Execute database-backed application operations after controllers and guards establish validated input and context.
- Location: `apps/api/src/auth/auth.service.ts`, `apps/api/src/tenancy/tenant.service.ts`, and `apps/api/src/members/members.service.ts`
- Contains: Login/session operations, membership and church resolution, tenant-filtered member list/create operations, and result projection.
- Depends on: `apps/api/src/database/database.service.ts`, Drizzle query helpers, `packages/database/src/schema.ts`, and authorization/contract types.
- Used by: API controllers and guards in their corresponding modules.
- Purpose: Define reusable runtime validation schemas and inferred TypeScript request/response types.
- Location: `packages/contracts/src/index.ts`
- Contains: Zod schemas for health, login, church identifiers, member creation, and member responses.
- Depends on: Zod declared in `packages/contracts/package.json`.
- Used by: API boundary code such as `apps/api/src/auth/auth.controller.ts` and `apps/api/src/members/members.controller.ts`; future consumers should import through `@uckg/contracts`.
- Purpose: Centralize password hashing, session-token generation/hashing, church roles, and permission policy decisions.
- Location: `packages/authorization/src/`
- Contains: `password.ts`, `session-token.ts`, `policy.ts`, and the public barrel `index.ts`.
- Depends on: Node cryptography APIs and local authorization types.
- Used by: `apps/api/src/auth/auth.service.ts`, `apps/api/src/tenancy/permissions.guard.ts`, `apps/api/src/seed.ts`, and end-to-end setup in `tests/e2e/auth-tenancy.spec.ts`.
- Purpose: Define the PostgreSQL model, create typed Drizzle connections, and own schema migration tooling.
- Location: `packages/database/src/`, `packages/database/migrations/`, and `packages/database/scripts/`
- Contains: Table/enum/index/check definitions in `packages/database/src/schema.ts`, the database factory in `packages/database/src/index.ts`, generated SQL migrations, and migration runners.
- Depends on: Drizzle ORM, node-postgres, and PostgreSQL as configured in `packages/database/package.json` and `packages/database/drizzle.config.ts`.
- Used by: `apps/api/src/database/database.service.ts`, `apps/api/src/seed.ts`, and database-aware tests such as `tests/e2e/auth-tenancy.spec.ts`.
- Purpose: Provide a separate process boundary for background work.
- Location: `apps/worker/src/`
- Contains: The process entry point `apps/worker/src/main.ts` and the current readiness abstraction `apps/worker/src/worker.ts`.
- Depends on: No workspace package yet; the runtime scripts are declared in `apps/worker/package.json`.
- Used by: The root concurrent development command in `package.json` and a unit test in `apps/worker/src/worker.spec.ts`.

## Data Flow

- Keep server-persisted identity, sessions, memberships, churches, and members in PostgreSQL through `packages/database/src/schema.ts`.
- Keep authenticated request-scoped state on `AuthenticatedRequest.authUser` and `AuthenticatedRequest.tenant` as defined in `apps/api/src/auth/auth.types.ts`.
- Keep page-local UI state in React hooks inside client components such as `apps/web/app/login/login-form.tsx` and `apps/web/app/dashboard/page.tsx`.
- Keep durable browser preferences limited to the locale cookie managed by `apps/web/app/i18n/config.ts`/`apps/web/app/components/locale-switcher.tsx` and the selected church key managed by `apps/web/app/dashboard/page.tsx`.

## Key Abstractions

- Purpose: Encapsulate controllers, providers, and dependencies for one API capability.
- Examples: `apps/api/src/auth/auth.module.ts`, `apps/api/src/churches/churches.module.ts`, `apps/api/src/members/members.module.ts`, `apps/api/src/tenancy/tenancy.module.ts`.
- Pattern: Create a sibling `*.module.ts`, `*.controller.ts`, and `*.service.ts` where persistence is needed; import shared modules explicitly and register the feature once in `apps/api/src/app.module.ts`.
- Purpose: Turn an untrusted HTTP request into an authenticated, tenant-scoped, permission-checked request.
- Examples: `apps/api/src/auth/session-auth.guard.ts`, `apps/api/src/tenancy/tenant.guard.ts`, `apps/api/src/tenancy/permissions.guard.ts`, `apps/api/src/auth/auth.types.ts`.
- Pattern: Preserve guard order `SessionAuthGuard`, `TenantGuard`, `PermissionsGuard`; later guards depend on properties attached by earlier guards.
- Purpose: Read established request context without repeating Express request plumbing in controllers.
- Examples: `apps/api/src/auth/current-user.decorator.ts` and `apps/api/src/tenancy/current-tenant.decorator.ts`.
- Pattern: Use `@CurrentUser()` only after `SessionAuthGuard` and `@CurrentTenant()` only after the full tenant guard chain.
- Purpose: Keep route permission requirements visible beside handlers while centralizing policy evaluation.
- Examples: `apps/api/src/tenancy/permissions.decorator.ts`, `apps/api/src/tenancy/permissions.guard.ts`, and `packages/authorization/src/policy.ts`.
- Pattern: Add permissions to the `ChurchPermission` union and role matrix first, then annotate handlers with `@RequirePermissions(...)`.
- Purpose: Validate unknown boundary data and derive the corresponding compile-time type from one definition.
- Examples: `loginRequestSchema`/`LoginRequest` and `createMemberRequestSchema`/`CreateMemberRequest` in `packages/contracts/src/index.ts`.
- Pattern: Validate unknown controller input with `safeParse`; pass `parsed.data` into typed services only after successful validation.
- Purpose: Pair a node-postgres pool with a schema-aware Drizzle client.
- Examples: `createDatabase` and `Database` in `packages/database/src/index.ts`; lifecycle adaptation in `apps/api/src/database/database.service.ts`.
- Pattern: Let the process own pool lifecycle; API providers close the pool through Nest shutdown hooks, while scripts use `try/finally`.
- Purpose: Keep every supported language aligned to one UI copy shape.
- Examples: `Dictionary`, `dictionaries`, and `getDictionary` in `apps/web/app/i18n/dictionaries.ts`; locale routing helpers in `apps/web/app/i18n/config.ts`.
- Pattern: Add each new user-facing string to the `Dictionary` interface and all `pt-BR`, `en`, and `es` dictionary values in the same change.

## Entry Points

- Location: `apps/web/app/page.tsx`
- Triggers: Browser request to `/`.
- Responsibilities: Read the locale preference and redirect to the localized login route.
- Location: `apps/web/app/layout.tsx`
- Triggers: Every Next.js App Router render.
- Responsibilities: Define root metadata, HTML/body structure, and load global styles from `apps/web/app/styles.css`.
- Location: `apps/web/app/[locale]/layout.tsx`
- Triggers: Requests under `/{locale}/...`.
- Responsibilities: Reject unsupported locales, generate locale-specific metadata, and synchronize the document language.
- Location: `apps/web/app/[locale]/login/page.tsx`, `apps/web/app/login/page.tsx`, `apps/web/app/[locale]/dashboard/page.tsx`, and `apps/web/app/dashboard/page.tsx`
- Triggers: Browser navigation to localized login or dashboard URLs.
- Responsibilities: Render authentication UI, manage login/session calls, select a church, and present tenant context.
- Location: `apps/api/src/main.ts`
- Triggers: `dev` or `start` scripts in `apps/api/package.json`.
- Responsibilities: Create `AppModule`, configure credentialed CORS, enable shutdown hooks, and listen on the configured port.
- Location: `apps/api/src/app.module.ts`
- Triggers: NestJS application bootstrap from `apps/api/src/main.ts`.
- Responsibilities: Register the database, authentication, tenancy, churches, and members modules plus the health controller.
- Location: `apps/worker/src/main.ts`
- Triggers: `dev` or `start` scripts in `apps/worker/package.json` and the root `dev` script in `package.json`.
- Responsibilities: Start the worker process; the current implementation reports readiness through `apps/worker/src/worker.ts`.
- Location: `apps/api/src/seed.ts`
- Triggers: `pnpm db:seed` from `package.json`.
- Responsibilities: Validate bootstrap configuration, upsert a church and administrative user, and create/update the church membership in one transaction.
- Location: `packages/database/scripts/migrate.ts` and `packages/database/scripts/test-migrations.ts`
- Triggers: `pnpm db:migrate` and `pnpm test:migrations` from `package.json`.
- Responsibilities: Apply committed migrations and verify the entire migration chain against an isolated PostgreSQL database.

## Error Handling

- Throw `BadRequestException` for failed Zod parsing in `apps/api/src/auth/auth.controller.ts` and `apps/api/src/members/members.controller.ts`.
- Throw `UnauthorizedException` for missing/invalid sessions in `apps/api/src/auth/session-auth.guard.ts` and invalid credentials in `apps/api/src/auth/auth.service.ts`.
- Throw `ForbiddenException` for invalid tenant selection or denied permissions in `apps/api/src/tenancy/tenant.guard.ts` and `apps/api/src/tenancy/permissions.guard.ts`.
- Translate PostgreSQL unique violation code `23505` into `ConflictException` in `apps/api/src/members/members.service.ts`; rethrow unknown failures unchanged.
- Use `try/catch/finally` around browser requests in `apps/web/app/login/login-form.tsx` and `apps/web/app/dashboard/page.tsx`, mapping failures to localized UI states.
- Use `try/finally` to close pools and clean temporary databases in `apps/api/src/seed.ts`, `packages/database/scripts/migrate.ts`, and `packages/database/scripts/test-migrations.ts`.

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.

<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.

<!-- GSD:profile-end -->
