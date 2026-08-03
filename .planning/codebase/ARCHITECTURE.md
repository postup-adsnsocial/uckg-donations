# Architecture

**Analysis Date:** 2026-08-03

## Pattern Overview

**Overall:** Modular monolith in a pnpm monorepo, split into independently runnable web, HTTP API, and worker processes with shared library packages.

**Key Characteristics:**
- Keep deployable process boundaries in `apps/web/`, `apps/api/`, and `apps/worker/`; the intended system shape is documented in `docs/architecture.md`.
- Organize the NestJS API by feature module under `apps/api/src/`, with controllers handling HTTP concerns and injectable services handling persistence-backed use cases.
- Put cross-process domain primitives in `packages/`: authorization rules in `packages/authorization/src/`, runtime contracts in `packages/contracts/src/`, and PostgreSQL schema/access in `packages/database/src/`.
- Enforce tenant selection and role permissions before domain controllers run through the ordered guard chain in `apps/api/src/tenancy/`.
- Keep the browser as an API client: Next.js routes and components in `apps/web/app/` call the NestJS API through `apps/web/app/lib/api.ts` rather than importing database code.
- Keep tenant ownership explicit on domain rows and in queries; the current member flow passes `tenant.church.id` from `apps/api/src/members/members.controller.ts` into tenant-filtered operations in `apps/api/src/members/members.service.ts`.

## Layers

**Web Presentation Layer:**
- Purpose: Render localized login and dashboard experiences, maintain browser interaction state, and call the HTTP API.
- Location: `apps/web/app/`
- Contains: Next.js App Router layouts/pages, client components, CSS, localization dictionaries, formatters, and the fetch wrapper in `apps/web/app/lib/api.ts`.
- Depends on: Next.js and React from `apps/web/package.json`, the public API base URL in `apps/web/app/lib/api.ts`, and static assets in `apps/web/public/`.
- Used by: Browser users entering through `apps/web/app/page.tsx` or localized routes beneath `apps/web/app/[locale]/`.

**HTTP Composition Layer:**
- Purpose: Bootstrap NestJS, configure CORS and shutdown behavior, and compose application modules.
- Location: `apps/api/src/main.ts` and `apps/api/src/app.module.ts`
- Contains: The Nest application entry point, root module imports, and the root health controller registration.
- Depends on: Feature modules in `apps/api/src/auth/`, `apps/api/src/churches/`, `apps/api/src/members/`, `apps/api/src/tenancy/`, and the global database module in `apps/api/src/database/`.
- Used by: The API runtime started through scripts in `apps/api/package.json`.

**API Feature Modules:**
- Purpose: Expose cohesive HTTP endpoints and coordinate feature-specific use cases.
- Location: `apps/api/src/auth/`, `apps/api/src/churches/`, and `apps/api/src/members/`
- Contains: Nest modules, controllers, injectable services, decorators, feature-local types, and feature-local helpers.
- Depends on: Cross-cutting tenancy/database services in `apps/api/src/tenancy/` and `apps/api/src/database/`, plus workspace packages imported as `@uckg/*`.
- Used by: `apps/api/src/app.module.ts`, which imports each top-level feature module.

**Authentication and Tenant Authorization Layer:**
- Purpose: Resolve session identity, validate the selected church, attach request context, and enforce role permissions.
- Location: `apps/api/src/auth/`, `apps/api/src/tenancy/`, and `packages/authorization/src/`
- Contains: `SessionAuthGuard`, `TenantGuard`, `PermissionsGuard`, request decorators, `TenantService`, session/password helpers, and permission policy definitions.
- Depends on: Database tables exported from `packages/database/src/schema.ts`, request validation from `packages/contracts/src/index.ts`, and Nest execution context/metadata.
- Used by: Protected controllers such as `apps/api/src/churches/churches.controller.ts` and `apps/api/src/members/members.controller.ts`.

**Application Service Layer:**
- Purpose: Execute database-backed application operations after controllers and guards establish validated input and context.
- Location: `apps/api/src/auth/auth.service.ts`, `apps/api/src/tenancy/tenant.service.ts`, and `apps/api/src/members/members.service.ts`
- Contains: Login/session operations, membership and church resolution, tenant-filtered member list/create operations, and result projection.
- Depends on: `apps/api/src/database/database.service.ts`, Drizzle query helpers, `packages/database/src/schema.ts`, and authorization/contract types.
- Used by: API controllers and guards in their corresponding modules.

**Shared Contract Layer:**
- Purpose: Define reusable runtime validation schemas and inferred TypeScript request/response types.
- Location: `packages/contracts/src/index.ts`
- Contains: Zod schemas for health, login, church identifiers, member creation, and member responses.
- Depends on: Zod declared in `packages/contracts/package.json`.
- Used by: API boundary code such as `apps/api/src/auth/auth.controller.ts` and `apps/api/src/members/members.controller.ts`; future consumers should import through `@uckg/contracts`.

**Shared Authorization Layer:**
- Purpose: Centralize password hashing, session-token generation/hashing, church roles, and permission policy decisions.
- Location: `packages/authorization/src/`
- Contains: `password.ts`, `session-token.ts`, `policy.ts`, and the public barrel `index.ts`.
- Depends on: Node cryptography APIs and local authorization types.
- Used by: `apps/api/src/auth/auth.service.ts`, `apps/api/src/tenancy/permissions.guard.ts`, `apps/api/src/seed.ts`, and end-to-end setup in `tests/e2e/auth-tenancy.spec.ts`.

**Persistence Layer:**
- Purpose: Define the PostgreSQL model, create typed Drizzle connections, and own schema migration tooling.
- Location: `packages/database/src/`, `packages/database/migrations/`, and `packages/database/scripts/`
- Contains: Table/enum/index/check definitions in `packages/database/src/schema.ts`, the database factory in `packages/database/src/index.ts`, generated SQL migrations, and migration runners.
- Depends on: Drizzle ORM, node-postgres, and PostgreSQL as configured in `packages/database/package.json` and `packages/database/drizzle.config.ts`.
- Used by: `apps/api/src/database/database.service.ts`, `apps/api/src/seed.ts`, and database-aware tests such as `tests/e2e/auth-tenancy.spec.ts`.

**Asynchronous Worker Layer:**
- Purpose: Provide a separate process boundary for background work.
- Location: `apps/worker/src/`
- Contains: The process entry point `apps/worker/src/main.ts` and the current readiness abstraction `apps/worker/src/worker.ts`.
- Depends on: No workspace package yet; the runtime scripts are declared in `apps/worker/package.json`.
- Used by: The root concurrent development command in `package.json` and a unit test in `apps/worker/src/worker.spec.ts`.

## Data Flow

**Localized Browser Navigation:**

1. `apps/web/app/page.tsx` reads the `uckg_locale` cookie and redirects `/` to `/{locale}/login` using helpers from `apps/web/app/i18n/config.ts`.
2. `apps/web/app/[locale]/layout.tsx` validates the locale, generates localized metadata from `apps/web/app/i18n/dictionaries.ts`, and mounts `apps/web/app/components/document-locale.tsx`.
3. Localized page files such as `apps/web/app/[locale]/login/page.tsx` re-export the shared implementations in `apps/web/app/login/page.tsx` and `apps/web/app/dashboard/page.tsx`.
4. `apps/web/app/components/locale-switcher.tsx` persists locale selection in a cookie and navigates to the equivalent localized path.

**Administrative Login:**

1. `apps/web/app/login/login-form.tsx` sends credentials to `/auth/login` through `apps/web/app/lib/api.ts` with browser credentials enabled.
2. `apps/api/src/auth/auth.controller.ts` validates the unknown request body with `loginRequestSchema` from `packages/contracts/src/index.ts`.
3. `apps/api/src/auth/auth.service.ts` normalizes the email, queries `admin_users`, verifies the password through `packages/authorization/src/password.ts`, creates a token through `packages/authorization/src/session-token.ts`, and stores only its hash in `admin_sessions`.
4. `apps/api/src/auth/auth.controller.ts` returns the opaque token as an HTTP-only, `SameSite=Strict` cookie; `apps/web/app/login/login-form.tsx` navigates to the localized dashboard.

**Authenticated Tenant Request:**

1. `apps/web/app/dashboard/page.tsx` calls `/auth/me`, selects a church membership, and persists the selected identifier in browser local storage.
2. Subsequent requests include `x-church-id` through `apps/web/app/lib/api.ts` call options, as shown by the `/churches/current` request in `apps/web/app/dashboard/page.tsx`.
3. `SessionAuthGuard` in `apps/api/src/auth/session-auth.guard.ts` reads the session cookie, resolves the active user through `apps/api/src/auth/auth.service.ts`, and attaches `authUser` to the request.
4. `TenantGuard` in `apps/api/src/tenancy/tenant.guard.ts` validates `x-church-id`, calls `apps/api/src/tenancy/tenant.service.ts`, and attaches a `TenantContext` only for an active accessible church.
5. `PermissionsGuard` in `apps/api/src/tenancy/permissions.guard.ts` reads metadata set by `RequirePermissions` and delegates the decision to `packages/authorization/src/policy.ts`.
6. The protected controller receives the established tenant through `CurrentTenant` from `apps/api/src/tenancy/current-tenant.decorator.ts`.

**Tenant-Scoped Member Operation:**

1. `apps/api/src/members/members.controller.ts` applies `SessionAuthGuard`, `TenantGuard`, and `PermissionsGuard` at controller level.
2. The `GET /members` handler requires `members:read`; the `POST /members` handler requires `members:write` and validates input with `createMemberRequestSchema` from `packages/contracts/src/index.ts`.
3. `apps/api/src/members/members.controller.ts` passes `tenant.church.id` explicitly into `apps/api/src/members/members.service.ts`; do not accept a tenant ID from a member request body.
4. `apps/api/src/members/members.service.ts` filters reads by `schema.members.churchId` and supplies the same church ID when inserting.
5. `packages/database/src/schema.ts` reinforces tenancy with the `members.church_id` foreign key and church-scoped indexes/uniqueness.

**Schema Migration:**

1. Schema changes are authored in `packages/database/src/schema.ts`.
2. Drizzle Kit configuration in `packages/database/drizzle.config.ts` emits ordered migration artifacts to `packages/database/migrations/`.
3. `packages/database/scripts/migrate.ts` creates the shared database connection and applies every migration in order.
4. `packages/database/scripts/test-migrations.ts` creates an isolated temporary PostgreSQL database, applies the chain, verifies expected tables, and drops the database.

**State Management:**
- Keep server-persisted identity, sessions, memberships, churches, and members in PostgreSQL through `packages/database/src/schema.ts`.
- Keep authenticated request-scoped state on `AuthenticatedRequest.authUser` and `AuthenticatedRequest.tenant` as defined in `apps/api/src/auth/auth.types.ts`.
- Keep page-local UI state in React hooks inside client components such as `apps/web/app/login/login-form.tsx` and `apps/web/app/dashboard/page.tsx`.
- Keep durable browser preferences limited to the locale cookie managed by `apps/web/app/i18n/config.ts`/`apps/web/app/components/locale-switcher.tsx` and the selected church key managed by `apps/web/app/dashboard/page.tsx`.

## Key Abstractions

**Nest Feature Module:**
- Purpose: Encapsulate controllers, providers, and dependencies for one API capability.
- Examples: `apps/api/src/auth/auth.module.ts`, `apps/api/src/churches/churches.module.ts`, `apps/api/src/members/members.module.ts`, `apps/api/src/tenancy/tenancy.module.ts`.
- Pattern: Create a sibling `*.module.ts`, `*.controller.ts`, and `*.service.ts` where persistence is needed; import shared modules explicitly and register the feature once in `apps/api/src/app.module.ts`.

**Guard-Enriched Request Context:**
- Purpose: Turn an untrusted HTTP request into an authenticated, tenant-scoped, permission-checked request.
- Examples: `apps/api/src/auth/session-auth.guard.ts`, `apps/api/src/tenancy/tenant.guard.ts`, `apps/api/src/tenancy/permissions.guard.ts`, `apps/api/src/auth/auth.types.ts`.
- Pattern: Preserve guard order `SessionAuthGuard`, `TenantGuard`, `PermissionsGuard`; later guards depend on properties attached by earlier guards.

**Request Parameter Decorators:**
- Purpose: Read established request context without repeating Express request plumbing in controllers.
- Examples: `apps/api/src/auth/current-user.decorator.ts` and `apps/api/src/tenancy/current-tenant.decorator.ts`.
- Pattern: Use `@CurrentUser()` only after `SessionAuthGuard` and `@CurrentTenant()` only after the full tenant guard chain.

**Declarative Permission Metadata:**
- Purpose: Keep route permission requirements visible beside handlers while centralizing policy evaluation.
- Examples: `apps/api/src/tenancy/permissions.decorator.ts`, `apps/api/src/tenancy/permissions.guard.ts`, and `packages/authorization/src/policy.ts`.
- Pattern: Add permissions to the `ChurchPermission` union and role matrix first, then annotate handlers with `@RequirePermissions(...)`.

**Runtime Contract Plus Inferred Type:**
- Purpose: Validate unknown boundary data and derive the corresponding compile-time type from one definition.
- Examples: `loginRequestSchema`/`LoginRequest` and `createMemberRequestSchema`/`CreateMemberRequest` in `packages/contracts/src/index.ts`.
- Pattern: Validate unknown controller input with `safeParse`; pass `parsed.data` into typed services only after successful validation.

**Typed Database Factory:**
- Purpose: Pair a node-postgres pool with a schema-aware Drizzle client.
- Examples: `createDatabase` and `Database` in `packages/database/src/index.ts`; lifecycle adaptation in `apps/api/src/database/database.service.ts`.
- Pattern: Let the process own pool lifecycle; API providers close the pool through Nest shutdown hooks, while scripts use `try/finally`.

**Typed Localization Dictionary:**
- Purpose: Keep every supported language aligned to one UI copy shape.
- Examples: `Dictionary`, `dictionaries`, and `getDictionary` in `apps/web/app/i18n/dictionaries.ts`; locale routing helpers in `apps/web/app/i18n/config.ts`.
- Pattern: Add each new user-facing string to the `Dictionary` interface and all `pt-BR`, `en`, and `es` dictionary values in the same change.

## Entry Points

**Web Root Route:**
- Location: `apps/web/app/page.tsx`
- Triggers: Browser request to `/`.
- Responsibilities: Read the locale preference and redirect to the localized login route.

**Web Root Layout:**
- Location: `apps/web/app/layout.tsx`
- Triggers: Every Next.js App Router render.
- Responsibilities: Define root metadata, HTML/body structure, and load global styles from `apps/web/app/styles.css`.

**Localized Web Layout:**
- Location: `apps/web/app/[locale]/layout.tsx`
- Triggers: Requests under `/{locale}/...`.
- Responsibilities: Reject unsupported locales, generate locale-specific metadata, and synchronize the document language.

**Login and Dashboard Routes:**
- Location: `apps/web/app/[locale]/login/page.tsx`, `apps/web/app/login/page.tsx`, `apps/web/app/[locale]/dashboard/page.tsx`, and `apps/web/app/dashboard/page.tsx`
- Triggers: Browser navigation to localized login or dashboard URLs.
- Responsibilities: Render authentication UI, manage login/session calls, select a church, and present tenant context.

**API Runtime:**
- Location: `apps/api/src/main.ts`
- Triggers: `dev` or `start` scripts in `apps/api/package.json`.
- Responsibilities: Create `AppModule`, configure credentialed CORS, enable shutdown hooks, and listen on the configured port.

**API Composition Root:**
- Location: `apps/api/src/app.module.ts`
- Triggers: NestJS application bootstrap from `apps/api/src/main.ts`.
- Responsibilities: Register the database, authentication, tenancy, churches, and members modules plus the health controller.

**Worker Runtime:**
- Location: `apps/worker/src/main.ts`
- Triggers: `dev` or `start` scripts in `apps/worker/package.json` and the root `dev` script in `package.json`.
- Responsibilities: Start the worker process; the current implementation reports readiness through `apps/worker/src/worker.ts`.

**Administrative Seed Script:**
- Location: `apps/api/src/seed.ts`
- Triggers: `pnpm db:seed` from `package.json`.
- Responsibilities: Validate bootstrap configuration, upsert a church and administrative user, and create/update the church membership in one transaction.

**Migration Entrypoints:**
- Location: `packages/database/scripts/migrate.ts` and `packages/database/scripts/test-migrations.ts`
- Triggers: `pnpm db:migrate` and `pnpm test:migrations` from `package.json`.
- Responsibilities: Apply committed migrations and verify the entire migration chain against an isolated PostgreSQL database.

## Error Handling

**Strategy:** Convert expected HTTP failures into Nest exceptions at the API boundary, keep service failures explicit, render coarse localized failure states in the client, and guarantee resource cleanup in standalone scripts.

**Patterns:**
- Throw `BadRequestException` for failed Zod parsing in `apps/api/src/auth/auth.controller.ts` and `apps/api/src/members/members.controller.ts`.
- Throw `UnauthorizedException` for missing/invalid sessions in `apps/api/src/auth/session-auth.guard.ts` and invalid credentials in `apps/api/src/auth/auth.service.ts`.
- Throw `ForbiddenException` for invalid tenant selection or denied permissions in `apps/api/src/tenancy/tenant.guard.ts` and `apps/api/src/tenancy/permissions.guard.ts`.
- Translate PostgreSQL unique violation code `23505` into `ConflictException` in `apps/api/src/members/members.service.ts`; rethrow unknown failures unchanged.
- Use `try/catch/finally` around browser requests in `apps/web/app/login/login-form.tsx` and `apps/web/app/dashboard/page.tsx`, mapping failures to localized UI states.
- Use `try/finally` to close pools and clean temporary databases in `apps/api/src/seed.ts`, `packages/database/scripts/migrate.ts`, and `packages/database/scripts/test-migrations.ts`.

## Cross-Cutting Concerns

**Logging:** Use process-level `console.info` only at operational entry points such as `apps/api/src/seed.ts`, `packages/database/scripts/migrate.ts`, `packages/database/scripts/test-migrations.ts`, and `apps/worker/src/main.ts`; no application-wide logger abstraction is present.

**Validation:** Validate untrusted HTTP bodies and tenant headers with Zod schemas from `packages/contracts/src/index.ts`; reinforce domain invariants with checks, unique indexes, foreign keys, and enums in `packages/database/src/schema.ts`.

**Authentication:** Use opaque 256-bit session tokens from `packages/authorization/src/session-token.ts`; store SHA-256 hashes in `admin_sessions`, deliver raw tokens only by the HTTP-only cookie configured in `apps/api/src/auth/auth.controller.ts`, and resolve users via `apps/api/src/auth/session-auth.guard.ts`.

**Tenancy:** Require explicit church context through `x-church-id`, resolve it in `apps/api/src/tenancy/tenant.service.ts`, attach it via `apps/api/src/tenancy/tenant.guard.ts`, and pass `tenant.church.id` explicitly into domain queries such as `apps/api/src/members/members.service.ts`.

**Internationalization:** Route all UI through locale segments and typed dictionaries in `apps/web/app/i18n/`; use shared `Intl` helpers from `apps/web/app/i18n/format.ts` for dates and currency.

---

*Architecture analysis: 2026-08-03*
