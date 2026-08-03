# Phase 1: Tenant and Production-Safety Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves why no product interview was needed.

**Date:** 2026-08-03
**Phase:** 01-tenant-and-production-safety-foundation
**Areas analyzed:** tenant boundary, authorization defaults, production security, observability,
verification and UI impact

---

## Discussion disposition

The user instructed the agent to proceed after the project roadmap was created. Codebase scouting and
the Phase 1 acceptance criteria showed no unresolved product or visual choice: this is a foundational
infrastructure phase whose observable behavior is already fixed by TEN-01, TEN-02, TEN-03, SEC-01,
SEC-02 and SEC-03. The workflow therefore used the pure-infrastructure skip path instead of asking the
user to choose technical implementation details.

## Decisions carried forward

| Existing decision | Source | Applied here |
| --- | --- | --- |
| Every domain record and query is scoped to an explicit active church | `.planning/PROJECT.md`, `docs/architecture.md` | Required tenant context, transaction-local enforcement and forced RLS |
| Access is denied by default and follows least privilege | `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` | Missing route permission metadata denies access |
| Administrative sessions use opaque cookies and last 12 hours | `docs/architecture.md` | Session model is preserved while request security is hardened |
| Administrative passwords accept 6–128 characters | `.planning/PROJECT.md` | Minimum remains 6; this phase does not reverse the product decision |
| UI quality and PT-BR/EN/ES are correctness gates | `AGENTS.md`, `.planning/PROJECT.md` | Any rendered change triggers E2E and visual review |

## Technical alternatives delegated to planning

| Area | Fixed outcome | Delegated alternatives |
| --- | --- | --- |
| Tenant database enforcement | Runtime role cannot access another church | Exact Drizzle helper/module organization and migration sequence |
| Login throttling | Combined origin/account protection without enumeration | Initial windows, limits and backoff values |
| Observability | Correlated, redacted logs and low-cardinality metrics | Metric names, correlation format and internal endpoint details |
| Request security | Validated production config, safe headers and bounded input | Compatible package wiring and conservative defaults |

## the agent's Discretion

- Internal module boundaries and compatible library selection.
- Conservative, configurable operational thresholds backed by tests and documentation.
- Exact implementation sequence inside the phase plan, including expand/validate ordering for RLS.

## Deferred Ideas

- Domain audit belongs to Phase 2.
- Members UI and lifecycle belong to Phase 3; existing uncommitted work must be preserved.
- Durable jobs, deployment and recovery completion belong to Phase 6.
