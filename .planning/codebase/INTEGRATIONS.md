# External Integrations

**Analysis Date:** 2026-08-03

## APIs & External Services

**Internal HTTP API:**
- NestJS API - The Next.js frontend calls the repository-owned API rather than a third-party service.
  - SDK/Client: Native `fetch` wrapper in `apps/web/app/lib/api.ts`.
  - Base URL: `NEXT_PUBLIC_API_URL` in `apps/web/app/lib/api.ts`, defaulting to the local API on port 3001.
  - Auth: Browser session cookie is included with `credentials: 'include'` by `apps/web/app/lib/api.ts`.
- API routes are implemented by controllers in `apps/api/src/auth/auth.controller.ts`, `apps/api/src/churches/churches.controller.ts`, `apps/api/src/members/members.controller.ts`, and `apps/api/src/health/health.controller.ts`.

**Third-Party APIs:**
- Not detected. No payment gateway, email/SMS provider, cloud SDK, analytics service, CRM, identity SaaS, or other external API client is declared in any `package.json` or imported under `apps/` and `packages/`.

**Asynchronous Services:**
- No message broker or queue integration is detected. `apps/worker/src/main.ts` only emits the ready status returned by `apps/worker/src/worker.ts`; `apps/worker/package.json` declares no runtime dependencies.

## Data Storage

**Databases:**
- PostgreSQL 16 - Primary and only detected persistent data store.
  - Connection: `DATABASE_URL` is consumed in `apps/api/src/database/database.service.ts`, `packages/database/drizzle.config.ts`, `packages/database/scripts/migrate.ts`, `packages/database/scripts/test-migrations.ts`, and `apps/api/src/seed.ts`.
  - Client: `pg` 8.16.3 connection pool wrapped by Drizzle ORM 0.44.4 in `packages/database/src/index.ts`.
  - Schema: Churches, administrative users, memberships, sessions, and members are defined in `packages/database/src/schema.ts`.
  - Migrations: Versioned SQL is stored under `packages/database/migrations/`; execution and verification live in `packages/database/scripts/migrate.ts` and `packages/database/scripts/test-migrations.ts`.
  - Local/CI service: PostgreSQL 16 Alpine is declared in `docker-compose.yml` and `.github/workflows/ci.yml`.

**File Storage:**
- Local repository assets only. The web app serves `apps/web/public/universal-logo.png`; no object-storage client, upload endpoint, or persisted file-attachment model is detected in `apps/web/`, `apps/api/`, or `packages/database/src/schema.ts`.

**Caching:**
- None detected. No Redis, Memcached, framework cache adapter, or caching dependency appears in the package manifests; API state is read directly from PostgreSQL in services such as `apps/api/src/auth/auth.service.ts` and `apps/api/src/members/members.service.ts`.

## Authentication & Identity

**Auth Provider:**
- Custom first-party administrative authentication; no external identity provider is used.
  - Implementation: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.service.ts`, and `apps/api/src/auth/session-auth.guard.ts` implement login, logout, current-user lookup, and session enforcement.
  - Password storage: Node.js `scrypt` with random salt and timing-safe comparison in `packages/authorization/src/password.ts`; password hashes are stored in the `admin_users` table defined by `packages/database/src/schema.ts`.
  - Session tokens: 32 random bytes are encoded as opaque tokens, then SHA-256 hashed before persistence by `packages/authorization/src/session-token.ts`; sessions are stored in `admin_sessions` in `packages/database/src/schema.ts`.
  - Browser transport: The `uckg_session` cookie is `HttpOnly`, `SameSite=Strict`, scoped to `/`, and `Secure` when `NODE_ENV=production`, as configured in `apps/api/src/auth/auth.controller.ts` and named in `apps/api/src/auth/cookies.ts`.
  - Expiration: Sessions last 12 hours and update `lastSeenAt` during authentication in `apps/api/src/auth/auth.service.ts`.
  - Authorization: Requests first authenticate with `SessionAuthGuard`, then select a tenant using the `x-church-id` header in `apps/api/src/tenancy/tenant.guard.ts`, and finally apply role permissions via `apps/api/src/tenancy/permissions.guard.ts` and `packages/authorization/src/policy.ts`.
  - Bootstrap: Initial church and administrator creation is performed with environment-supplied `SEED_*` values by `apps/api/src/seed.ts`.

## Monitoring & Observability

**Error Tracking:**
- None detected. No Sentry, OpenTelemetry, hosted APM, metrics exporter, or error-reporting SDK is declared in `package.json` or application package manifests.

**Logs:**
- NestJS provides default API startup/request error logging through the app created in `apps/api/src/main.ts`; no custom logger transport is configured.
- The worker writes a JSON ready-status record with `console.info` in `apps/worker/src/main.ts`.
- Database migration and administrative seed scripts write completion messages with `console.info` in `packages/database/scripts/migrate.ts`, `packages/database/scripts/test-migrations.ts`, and `apps/api/src/seed.ts`.
- The API exposes a basic `GET /health` response in `apps/api/src/health/health.controller.ts`; it does not probe PostgreSQL or external dependencies.

## CI/CD & Deployment

**Hosting:**
- Not detected. No production Dockerfile, Kubernetes manifest, infrastructure-as-code, serverless adapter, or platform-specific hosting configuration exists in the tracked repository files.
- `apps/web/next.config.ts` enables Next.js standalone output, making the web artifact portable, but it does not identify a hosting provider.
- `apps/api/package.json`, `apps/web/package.json`, and `apps/worker/package.json` define production start commands for the three processes without deployment automation.

**CI Pipeline:**
- GitHub Actions is configured in `.github/workflows/ci.yml` for pushes to `main` and pull requests.
- The `quality` job provisions PostgreSQL 16, installs with the frozen `pnpm-lock.yaml`, and runs formatting, lint, type checking, unit tests, migration tests, and builds from scripts in `package.json`.
- The `e2e` job provisions PostgreSQL 16, applies migrations, installs Chromium and Firefox, runs `tests/e2e/`, and runs the visual suite in `tests/visual/`; failed Playwright results are uploaded as an artifact by `.github/workflows/ci.yml`.
- No continuous-deployment job is present in `.github/workflows/ci.yml`.

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string for production API, migration, seed, and migration-test processes; consumers are `apps/api/src/database/database.service.ts`, `packages/database/drizzle.config.ts`, `packages/database/scripts/migrate.ts`, `packages/database/scripts/test-migrations.ts`, and `apps/api/src/seed.ts`. A development default exists, but production should always provide this value.
- `WEB_URL` - Allowed CORS origin for credentialed browser requests in `apps/api/src/main.ts`; a localhost default exists.
- `NEXT_PUBLIC_API_URL` - Public API origin used by the browser fetch wrapper in `apps/web/app/lib/api.ts`; a localhost default exists.
- `API_PORT` - API listening port in `apps/api/src/main.ts`; defaults to 3001.
- `NODE_ENV` - Enables the session cookie's `Secure` flag in `apps/api/src/auth/auth.controller.ts`; production deployment must set it to `production`.
- `SEED_CHURCH_NAME`, `SEED_CHURCH_SLUG`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_DISPLAY_NAME`, and `SEED_ADMIN_PASSWORD` - Required only while running the administrative bootstrap in `apps/api/src/seed.ts`.
- `SEED_ADMIN_ROLE` - Optional bootstrap church role in `apps/api/src/seed.ts`; defaults to `church_admin`.
- `VISUAL_BASE_URL` - Optional target URL for visual tests in `playwright.visual.config.ts`; when absent, Playwright starts the local web app.
- `CI` - Supplied by the CI environment and used by `playwright.config.ts` and `playwright.visual.config.ts` to select retries, reporting, and server reuse.

**Secrets location:**
- Local environment configuration is represented by `.env.example`; `.env` and `.env.local` are excluded from version control by `.gitignore`. Do not commit actual values.
- CI currently supplies the test database connection inside `.github/workflows/ci.yml`; no production-secret store or production deployment configuration is detected.
- Remove `SEED_ADMIN_PASSWORD` after bootstrap as directed by `README.md`; the code reads it only at runtime in `apps/api/src/seed.ts`.

## Webhooks & Callbacks

**Incoming:**
- None detected. NestJS controllers under `apps/api/src/` expose interactive application routes only; there are no webhook-signature validators, provider callback controllers, or webhook-named routes.

**Outgoing:**
- None detected. The only network client call in application code is the frontend-to-internal-API `fetch` in `apps/web/app/lib/api.ts`; no application source under `apps/` or `packages/` sends provider callbacks or outbound webhooks.

---

*Integration audit: 2026-08-03*
