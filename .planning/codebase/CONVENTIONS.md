# Coding Conventions

**Analysis Date:** 2026-08-03

## Naming Patterns

**Files:**
- Use lowercase kebab-case for TypeScript module names, such as `apps/api/src/auth/session-auth.guard.ts`, `apps/api/src/tenancy/current-tenant.decorator.ts`, and `apps/web/app/components/locale-switcher.tsx`.
- Co-locate Vitest files with the source and name them `<module>.spec.ts`, as in `apps/api/src/tenancy/tenant.guard.spec.ts` and `packages/authorization/src/password.spec.ts`.
- Use Playwright suffixes to distinguish browser suites: `tests/e2e/auth-tenancy.spec.ts` for functional E2E and `tests/visual/login.visual.spec.ts` for screenshot tests.
- Use NestJS role suffixes consistently: `.module.ts`, `.controller.ts`, `.service.ts`, `.guard.ts`, and `.decorator.ts` in directories such as `apps/api/src/auth/` and `apps/api/src/tenancy/`.
- Use Next.js App Router reserved filenames (`page.tsx`, `layout.tsx`) beneath `apps/web/app/`; place reusable UI in descriptive kebab-case component files under `apps/web/app/components/`.

**Functions:**
- Use camelCase verbs for functions and methods: `hashPassword` in `packages/authorization/src/password.ts`, `createDatabase` in `packages/database/src/index.ts`, and `loadChurch` in `apps/web/app/dashboard/page.tsx`.
- Use `is...` names for type predicates and boolean checks, such as `isLocale` in `apps/web/app/i18n/config.ts` and `isUniqueViolation` in `apps/api/src/members/members.service.ts`.
- Name React event handlers `handle...` or action verbs scoped to the component, as shown by `handleSubmit` in `apps/web/app/login/login-form.tsx` and `changeLocale` in `apps/web/app/components/locale-switcher.tsx`.
- Keep Nest controller methods terse and aligned with the route action (`login`, `logout`, `me`, `list`, `create`) in `apps/api/src/auth/auth.controller.ts` and `apps/api/src/members/members.controller.ts`.

**Variables:**
- Use camelCase for local values and module constants, including `sessionDurationMilliseconds` in `apps/api/src/auth/auth.service.ts` and `databaseUrl` in `tests/e2e/auth-tenancy.spec.ts`.
- Use descriptive names for database rows and returned values (`record`, `membership`, `member`, `connection`) rather than abbreviations in `apps/api/src/auth/auth.service.ts`, `apps/api/src/tenancy/tenant.service.ts`, and `packages/database/src/index.ts`.
- Use `const` by default; use `let` only for state that is assigned later, such as fixture IDs in `tests/e2e/auth-tenancy.spec.ts`.
- Keep serialized database column names in snake_case at the SQL boundary while exposing camelCase TypeScript properties, as defined in `packages/database/src/schema.ts`.

**Types:**
- Use PascalCase for interfaces, type aliases, classes, and React prop types: `AuthenticatedAdmin` in `apps/api/src/auth/auth.types.ts`, `LoginResult` in `apps/api/src/auth/auth.service.ts`, and `LocaleSwitcherProps` in `apps/web/app/components/locale-switcher.tsx`.
- Prefer interfaces for object-shaped public contracts and component props, as in `WorkerStatus` in `apps/worker/src/worker.ts` and `LoginFormProps` in `apps/web/app/login/login-form.tsx`.
- Derive contract types from Zod schemas instead of duplicating request definitions, as `LoginRequest`, `CreateMemberRequest`, and `MemberResponse` do in `packages/contracts/src/index.ts`.
- Derive database entity types from Drizzle tables via `$inferSelect`, as done for `Church`, `AdminUser`, and `Member` in `packages/database/src/schema.ts`.
- Use literal unions and `as const` for closed sets such as `Locale` in `apps/web/app/i18n/config.ts` and the locale fixtures in `tests/visual/login.visual.spec.ts`.

## Code Style

**Formatting:**
- Run Prettier 3.6.2 through `pnpm format` or `pnpm format:check`; both scripts are defined in `package.json`.
- Follow Prettier defaults because no `.prettierrc` or alternate formatter configuration is present; the resulting style uses single quotes, semicolons, trailing commas, and wrapped multiline calls throughout `apps/` and `packages/`.
- Use two-space indentation in TypeScript, TSX, JSON, and configuration files, as represented by `apps/api/src/auth/auth.service.ts`, `apps/web/app/login/login-form.tsx`, and `vitest.config.ts`.

**Linting:**
- Run `pnpm lint`; `package.json` invokes ESLint with `--max-warnings=0`, so warnings fail the gate.
- Follow the ESLint recommended JavaScript and TypeScript rule sets configured in `eslint.config.mjs`.
- For `apps/web/**/*.{js,jsx,ts,tsx}`, follow Next.js recommended and Core Web Vitals rules configured in `eslint.config.mjs`; only `@next/next/no-html-link-for-pages` is disabled.
- Keep formatting rules delegated to Prettier through `eslint-config-prettier` in `eslint.config.mjs`.
- Preserve strict compiler safety from `tsconfig.base.json`, especially `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, and consistent filename casing.

## Import Organization

**Order:**
1. Place side-effect imports first when required, as with `reflect-metadata` in `apps/api/src/main.ts`.
2. Group framework, workspace-package, third-party, and Node built-in imports at the top, as in `apps/api/src/auth/auth.service.ts` and `packages/authorization/src/password.ts`.
3. Insert a blank line before relative application imports, as in `apps/api/src/tenancy/tenant.guard.ts`, `apps/web/app/login/login-form.tsx`, and `packages/database/src/index.ts`.
4. Use `type` imports for symbols erased at runtime, either inline or import-only, as in `type ChurchRole` in `apps/api/src/auth/auth.service.ts` and `import type { Response }` in `apps/api/src/auth/auth.controller.ts`.

**Path Aliases:**
- Import shared workspace packages through `@uckg/authorization`, `@uckg/contracts`, and `@uckg/database`; their source aliases for tests are configured in `vitest.config.ts` and their package exports are declared in `packages/*/package.json`.
- In NodeNext ESM code under `apps/api/`, `apps/worker/`, and `packages/`, include `.js` on relative imports even when the source file is TypeScript, as in `apps/api/src/main.ts` and `packages/authorization/src/policy.ts`.
- In Next.js code under `apps/web/`, use extensionless relative imports, as in `apps/web/app/dashboard/page.tsx` and `apps/web/app/login/login-form.tsx`.
- No application-wide `@/` alias is configured in `apps/web/tsconfig.json`; continue using relative paths inside the web app.

## Error Handling

**Patterns:**
- At HTTP boundaries, validate untrusted bodies and headers with Zod `safeParse`, then throw an explicit Nest exception; examples are `apps/api/src/auth/auth.controller.ts`, `apps/api/src/members/members.controller.ts`, and `apps/api/src/tenancy/tenant.guard.ts`.
- Use Nest exception classes to preserve HTTP semantics: `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, and `ConflictException` are applied in `apps/api/src/auth/`, `apps/api/src/tenancy/`, and `apps/api/src/members/`.
- Preserve unexpected errors by rethrowing them after handling only a recognized condition, as the PostgreSQL `23505` branch does in `apps/api/src/members/members.service.ts`.
- Return `null` for an expected lookup miss and let the guard/service caller translate it into policy behavior, as in `apps/api/src/auth/auth.service.ts` and `apps/api/src/tenancy/tenant.service.ts`.
- In client UI, map anticipated HTTP status codes to localized user messages and use `try`/`catch`/`finally` to restore submission state, as in `apps/web/app/login/login-form.tsx`.
- When an invariant makes progress impossible, throw a descriptive `Error`, as in fixture creation in `tests/e2e/auth-tenancy.spec.ts` and insert-return validation in `apps/api/src/members/members.service.ts`.

## Logging

**Framework:** Console only; no structured logging dependency or project logger wrapper is configured in `package.json`.

**Patterns:**
- Let Nest provide runtime server logging from the bootstrap in `apps/api/src/main.ts`; application services and controllers do not emit routine console output.
- Use `console.info` only for command-line operational confirmation, as in `packages/database/scripts/test-migrations.ts`.
- Do not log passwords, session tokens, or complete authentication payloads; these sensitive values flow through `apps/api/src/auth/auth.service.ts` and `apps/api/src/auth/auth.controller.ts` without logging.

## Comments

**When to Comment:**
- Prefer expressive names and small helpers over explanatory comments; production modules such as `packages/authorization/src/password.ts` and `apps/api/src/tenancy/tenant.guard.ts` are effectively self-documenting.
- Add comments only for non-obvious constraints or intent that cannot be expressed by types or names. There are no recurring TODO/FIXME conventions in the inspected source tree.

**JSDoc/TSDoc:**
- Not used in current application code. Keep public APIs self-describing through explicit interfaces, schemas, and return types, following `packages/contracts/src/index.ts` and `packages/authorization/src/policy.ts`.

## Function Design

**Size:**
- Keep domain utilities focused on one operation, as in `hashPassword` and `verifyPassword` in `packages/authorization/src/password.ts`.
- Split reusable or nested behavior into a private helper when it improves the main flow, as `deriveKey` does in `packages/authorization/src/password.ts` and `toAuthenticatedAdmin` does in `apps/api/src/auth/auth.service.ts`.
- For React components with multiple async flows, keep each flow as a named local function/callback and render explicit loading/error/ready branches, as in `apps/web/app/dashboard/page.tsx`.

**Parameters:**
- Prefer typed positional parameters for short domain operations (`hasPermission` in `packages/authorization/src/policy.ts`) and destructured props for React components (`LoginForm` in `apps/web/app/login/login-form.tsx`).
- Accept `unknown` at untrusted request boundaries and narrow it using a schema, as in `apps/api/src/auth/auth.controller.ts` and `apps/api/src/members/members.controller.ts`.
- Inject Nest dependencies through constructors and mark them `private readonly`, as in `apps/api/src/auth/auth.service.ts` and `apps/api/src/tenancy/tenant.service.ts`.

**Return Values:**
- Add explicit return types to shared utilities and policy functions, as in `packages/authorization/src/password.ts`, `packages/authorization/src/policy.ts`, and `apps/web/app/lib/api.ts`.
- Allow local controller/service return types to be inferred when the implementation directly returns a validated or queried value, as in `apps/api/src/auth/auth.controller.ts` and `apps/api/src/members/members.service.ts`.
- Model expected absence as `T | null` and side-effect-only async operations as `Promise<void>`, following `apps/api/src/auth/auth.service.ts` and `apps/api/src/tenancy/tenant.service.ts`.

## Module Design

**Exports:**
- Use named exports for shared functions, types, schemas, services, guards, and components throughout `packages/authorization/src/`, `packages/contracts/src/`, and `apps/api/src/`.
- Use default exports only where Next.js or configuration conventions require them, such as route components in `apps/web/app/**/page.tsx` and configs in `vitest.config.ts`, `playwright.config.ts`, and `eslint.config.mjs`.
- Keep Nest feature boundaries explicit through a colocated module/controller/service trio, as in `apps/api/src/members/` and `apps/api/src/auth/`.

**Barrel Files:**
- Use package-root barrels for public workspace APIs: `packages/authorization/src/index.ts`, `packages/database/src/index.ts`, and `packages/contracts/src/index.ts`.
- Do not create barrels inside application feature folders; import the concrete relative module directly, following `apps/api/src/auth/auth.controller.ts` and `apps/web/app/dashboard/page.tsx`.

---

*Convention analysis: 2026-08-03*
