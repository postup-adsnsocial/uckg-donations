---
phase: 01
slug: tenant-and-production-safety-foundation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-03
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4, PostgreSQL 16 integration scripts, Playwright 1.54.1 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `playwright.production-safety.config.ts`, `playwright.visual.config.ts` |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm check:full` |
| **Estimated runtime** | Measure during Wave 0 and record in summaries |

---

## Sampling Rate

- **After every task commit:** Run the task's targeted Vitest or PostgreSQL integration command.
- **After every plan wave:** Run `pnpm test && pnpm test:migrations && pnpm --filter @uckg/database test:tenancy`.
- **Before `$gsd-verify-work`:** `pnpm check:full` must be green.
- **Max feedback latency:** 120 seconds for focused checks; longer browser/full gates run at wave boundaries.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | TEN-01, TEN-02 | harness/red | `pnpm test:migrations && (pnpm --filter @uckg/database test:tenancy; test $? -ne 0)` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | TEN-02 | migration/catalog | `pnpm test:migrations` | ✅ extend | ⬜ pending |
| 01-01-03 | 01 | 1 | TEN-01, TEN-02 | PostgreSQL integration | `pnpm --filter @uckg/database test:tenancy && pnpm test:migrations` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 2 | TEN-01, TEN-02 | unit | `pnpm exec vitest run apps/api/src/database/tenant-unit-of-work.spec.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 2 | TEN-01 | unit/integration | `pnpm exec vitest run apps/api/src/database apps/api/src/tenancy` | ⚠️ extend | ⬜ pending |
| 01-03-01 | 03 | 3 | TEN-03 | unit | `pnpm exec vitest run apps/api/src/tenancy/permissions.guard.spec.ts` | ✅ extend | ⬜ pending |
| 01-03-02 | 03 | 3 | TEN-03 | inventory | `pnpm exec vitest run apps/api/src/tenancy/route-policy-inventory.spec.ts apps/api/src/tenancy/permissions.guard.spec.ts packages/authorization/src/policy.spec.ts` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | SEC-01 | unit | `pnpm exec vitest run apps/api/src/config/api-config.spec.ts` | ❌ W0 | ⬜ pending |
| 01-04-02 | 04 | 2 | SEC-01, SEC-02 | unit/type | `pnpm exec vitest run apps/api/src/config apps/api/src/database && pnpm --filter @uckg/api typecheck` | ⚠️ extend | ⬜ pending |
| 01-05-01 | 05 | 4 | SEC-02 | unit | `pnpm exec vitest run apps/api/src/security/login-attempt-store.spec.ts apps/api/src/security/login-source-throttler.guard.spec.ts` | ❌ W0 | ⬜ pending |
| 01-05-02 | 05 | 4 | SEC-02 | unit | `pnpm exec vitest run apps/api/src/security apps/api/src/auth packages/authorization/src/password.spec.ts` | ⚠️ extend | ⬜ pending |
| 01-06-01 | 06 | 4 | SEC-02, SEC-03 | unit | `pnpm exec vitest run apps/api/src/observability/logger.config.spec.ts` | ❌ W0 | ⬜ pending |
| 01-06-02 | 06 | 4 | SEC-03 | unit | `pnpm exec vitest run apps/api/src/health apps/api/src/observability apps/api/src/tenancy/route-policy-inventory.spec.ts` | ❌ W0 | ⬜ pending |
| 01-06-03 | 06 | 4 | SEC-02, SEC-03 | type/unit | `pnpm --filter @uckg/api typecheck && pnpm exec vitest run apps/api/src/observability apps/api/src/health` | ❌ W0 | ⬜ pending |
| 01-07-01 | 07 | 5 | SEC-01, SEC-03 | fixture/list | `pnpm --filter @uckg/api build && pnpm test:production-safety -- --list` | ❌ W0 | ⬜ pending |
| 01-07-02 | 07 | 5 | TEN-01, TEN-02, TEN-03, SEC-01, SEC-02, SEC-03 | targeted production E2E | `pnpm test:production-safety` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/database/scripts/test-tenant-isolation.ts` and `test:tenancy` script — real runtime role, forced RLS, composite-FK, and pool-reuse attacks.
- [ ] Shared isolated PostgreSQL database/role harness extracted without discarding the existing members migration assertions.
- [ ] `apps/api/src/config/api-config.spec.ts` — production fail-fast matrix.
- [ ] `apps/api/src/tenancy/route-policy-inventory.spec.ts` — all routes classified; all domain routes carry a known non-empty permission.
- [ ] `apps/api/src/security/login-attempt-store.spec.ts` and `apps/api/src/security/login-source-throttler.guard.spec.ts` — failed-account TTL/reset flow, independent source keys, proxy behavior and generic throttling.
- [ ] `apps/api/src/observability/logger.config.spec.ts` — JSON redaction canaries.
- [ ] `apps/api/src/observability/metrics.service.spec.ts` — metric/label allowlist and sensitive canaries.
- [ ] Extend health tests for independent liveness/readiness and generic database failure.
- [ ] `playwright.production-safety.config.ts` and `tests/e2e/production-safety.spec.ts` — isolated production-runtime fixture plus headers, CORS, body limit, throttling, correlation, health and protected metrics.
- [ ] CI/local PostgreSQL provisioning uses separate migrator and real runtime credentials.

---

## Manual-Only Verifications

All phase behaviors have automated verification. Provider-console configuration and private metrics ingress remain launch-readiness work until a hosting account is provisioned; repository tests assert required environment contracts and token protection.

---

## Validation Sign-Off

- [x] All planned task areas have a focused automated command or Wave 0 dependency.
- [x] Sampling continuity: no three consecutive task areas lack automated verification.
- [x] Wave 0 covers all missing test references.
- [x] No watch-mode flags.
- [x] Focused feedback target is under 120 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** approved 2026-08-03
