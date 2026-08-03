# Feature Landscape

**Project:** UCKG Donations  
**Domain:** Professional multi-church member and donation administration  
**Researched:** 2026-08-03  
**Overall confidence:** HIGH for the milestone core; MEDIUM for post-MVP differentiators

## Product Boundary

This milestone should deliver a dependable **system of record for manually recorded church donations**, not a payment processor or a general-purpose church management suite. Operators work in one explicitly selected church at a time. Members and donations are tenant-owned records; a donation may optionally reference a member so anonymous or unidentified giving remains representable.

The feature classification below is a synthesis of the project requirements and current official documentation from Planning Center and Tithely. Both mature products expose funds/designations, manual or batch entry, donor history, date/fund/payment filters, statement generation, and exports. That convergence is strong evidence for the operational core, but competitor presence alone does not make adjacent features appropriate for this milestone.

## Table Stakes

Missing these features would make the product incomplete or unsafe for routine church-office use.

### Member Management

| Feature | Why Expected | Complexity | Dependencies / Notes |
|---|---|---:|---|
| Tenant-scoped member directory | Operators need a canonical list for the active church without exposing another congregation's people. | Medium | Existing tenant context; every read/write filtered by `church_id`; adversarial cross-tenant tests. |
| Paginated list with deterministic sort | A professional directory must remain usable as congregations grow; the current unbounded list is a known scaling defect. | Medium | Cursor contract, capped page size, `(church_id, full_name, id)`-compatible query/index. |
| Search by name, email, or phone | Fast lookup is essential during donation entry and ordinary record maintenance. Tithely documents the same identifiers for transaction/member lookup. | Medium | Normalization rules; indexed strategy chosen from measured volume; search must remain tenant-scoped. |
| Create, view, and edit a member | Correcting contact data is a basic lifecycle need. | Medium | Shared request/response schemas; runtime response serialization; `updated_at` maintained reliably. |
| Active/inactive lifecycle with reactivation | Former or unavailable members should leave default workflows without destroying historical donation links. | Medium | Status filter; reason/actor/timestamp in audit trail; no hard delete in normal UI. |
| Minimal contact model | Full name plus optional normalized email and E.164 phone matches the current schema and avoids collecting unnecessary profile data. | Low | Preserve `null` semantics; localized validation; per-church email uniqueness. |
| Duplicate warning at creation/edit | Duplicate people split giving histories and produce incorrect statement totals; official Tithely guidance explicitly requires duplicate cleanup before statements. | Medium | Tenant-scoped candidate matching; warn and allow authorized override; do not auto-merge. |
| Member donation history | Staff must see a person's recorded donations and totals from the member detail view. | Medium | Donation ledger first; date range, currency, timezone; permission to view financial data must be separate from ordinary member access. |
| Role-correct visibility and actions | Member PII and financial totals must follow least privilege. | Medium | Add an explicit `finance:read` capability; define who may view giving on a profile, record gifts, correct gifts, and export. |

### Donation Recording

| Feature | Why Expected | Complexity | Dependencies / Notes |
|---|---|---:|---|
| Record a positive monetary donation | Core value of the product. Required fields should include stable ID, amount, received/gift date, church, fund/designation, payment method/source, creator, and timestamps. | High | Exact money representation (integer minor units or exact decimal), church currency, shared contracts, tenant-scoped persistence. |
| Optional member association | Churches must support known donors and anonymous/unidentified gifts without creating fake members. | Medium | Nullable `member_id`; referenced member must belong to the same church; explicit “anonymous/unidentified” state in UI and reports. |
| Funds/designations | Mature giving products treat funds such as general, tithe, missions, and building as a primary reporting dimension. | Medium | Church-scoped fund catalog; default fund; active/archived lifecycle; old donations retain their original fund. |
| Payment method/source classification | Cash, check, card/transfer recorded elsewhere, and other sources must be distinguishable for operational totals. Planning Center and Tithely expose payment sources/types in reports. | Medium | Church-configurable but controlled vocabulary; archive rather than delete; external processor details remain out of scope. |
| Efficient manual batch entry | Collection counting produces many offline donations at once. Mature products use batches for this workflow. | High | Draft batch, church/date/fund/method defaults, fast donor lookup, running item count and amount total, validation before posting. |
| Draft → posted batch lifecycle | Unfinished counts should not contaminate official histories or statements; Planning Center similarly excludes uncommitted batches from statements. | High | Transaction boundary; permissioned post action; immutable posted metadata; posted totals exactly equal item totals. |
| Donation detail and stable reference | Each gift needs a unique ID and complete context for investigation, correction, and export. | Medium | Runtime response schema; human-copyable reference in addition to UUID if operators need it. |
| Safe correction/reversal workflow | Financial mistakes are inevitable. Correcting amount, date, donor, fund, or method must preserve who changed what and why. | High | Append-only audit event; reason required; prefer reversal/superseding record after posting; never silently overwrite or hard-delete posted gifts. |
| Duplicate-entry defense | Double entry is a common manual-data risk and directly corrupts totals. | Medium | Idempotency key for API writes; UI warning on same church/member-or-anonymous/amount/date/method/reference; authorized confirmation, not automatic rejection. |
| Immediate localized confirmation | After save/post, operators need an unambiguous success state showing amount, currency, date, donor/anonymous state, fund, and reference. | Low | PT-BR/EN/ES strings; locale formatting; responsive and visual-regression coverage. |

### Essential Financial Reporting

| Feature | Why Expected | Complexity | Dependencies / Notes |
|---|---|---:|---|
| Donation ledger | Searchable, paginated history is the primary operational report. | High | Posted donations by default; explicit filter if reversed items are shown; stable deterministic pagination. |
| Mandatory date range plus useful presets | Time-bounded reporting improves clarity and performance; Tithely defaults transaction views to bounded date ranges. | Low | Church timezone defines day boundaries; presets such as today, this week, this month, this year, custom. |
| Filters by fund, payment method/source, member/anonymous, status, batch, and creator | These are the dimensions needed to investigate counts and reconcile collection activity. | Medium | Filter contract, indexes based on real query patterns, visible active-filter chips. |
| Summary totals | At minimum show gross amount, donation count, and unique identified donors for the selected filters, with breakdowns by fund and payment method/source. | Medium | One canonical reporting query/definition reused by UI and export; define whether reversed records are excluded. |
| Member giving totals and history | Staff need individual history over a date range; official products expose donor-level reports and statements. | Medium | `finance:read`; do not expose to roles with only `members:read`. |
| CSV export that matches active filters | Export is the interoperability boundary for accounting and further analysis. Both Planning Center and Tithely document CSV/print outputs. | Medium | Stable column schema, UTF-8/BOM decision, locale-independent machine values, permissioned export, audit event. |
| Printable/PDF summary | Finance reviewers need a shareable human-readable record without spreadsheet work. | Medium | Server-side or deterministic browser rendering; church identity, timezone, currency, filter scope, generated-at timestamp. |
| Individual donor statement for a date range | Donor statements are standard in mature giving systems and make the record useful beyond internal totals. | High | Member address is not in the present schema; MVP can provide a clearly labeled contribution summary, while country-specific tax receipt status remains deferred. Version/reissue behavior must be defined. |
| Locale, timezone, and currency correctness | A trilingual multi-church product cannot use browser defaults for financial meaning. | High | Per-church IANA timezone, ISO 4217 currency, display locale; store instants consistently and derive reporting dates in church timezone. |
| Report provenance | Every report/export should state church, filters, timezone, currency, generated time, and generating operator. | Low | Authenticated operator context; export audit log. |

### Cross-Cutting Quality and Safety

| Feature | Why Expected | Complexity | Dependencies / Notes |
|---|---|---:|---|
| Explicit active-church context on every domain screen | Prevents operators from recording or interpreting data under the wrong congregation. | Low | Existing tenant selector; church name remains visible near titles/actions, especially in donation entry. |
| Deny-by-default permissions | Financial read, write, correction, posting, reporting, export, and audit access should not collapse into one broad role. | High | Permission matrix and route-metadata inventory tests; current policy lacks `finance:read`. |
| Append-only domain audit trail | Member status/contact changes, donation creation/correction/reversal, batch posting, and exports need actor, time, church, action, subject, and safe before/after metadata. | High | Audit schema and viewer; redact unnecessary PII; never log credentials/session tokens. |
| Empty, loading, error, and retry states | Operational screens must fail clearly without losing draft work or inviting duplicate submission. | Medium | Request cancellation/sequencing, idempotency, localized copy. |
| Trilingual responsive UI with visual gates | This is an explicit product requirement, not polish to defer. | Medium | Every new string in PT-BR/EN/ES; supported breakpoints; functional E2E followed by visual tests. |

## Differentiators

These features are valuable because they make a relatively focused tool feel safer and more professional. They should follow—not displace—the table-stakes ledger.

| Feature | Value Proposition | Complexity | Recommendation / Dependencies |
|---|---|---:|---|
| Batch control totals and discrepancy gate | A counter enters expected cash/check totals and cannot post until item totals reconcile, reducing collection-count mistakes. | Medium | Best first differentiator; depends on batch entry and posted lifecycle. Allow authorized override only with reason and audit event. |
| Two-person review for high-risk posts/corrections | Separates entry from approval for large batches or material corrections. | High | Add only if UCKG operations require dual control; configurable threshold and role separation. |
| Reversal-first immutable ledger UX | Makes corrections understandable to non-accountants while preserving the original event and its replacement. | High | Strong professional differentiator; depends on audit model and correction permissions. |
| Tenant-isolation proof as a release gate | Automated cross-church tests for every member, donation, report, and export path turn the core promise into demonstrable quality. | Medium | Build alongside each slice, not as a final hardening exercise. |
| Smart duplicate warnings | Explain why a member or donation looks duplicated and let authorized staff safely continue. | Medium | Deterministic rules first; no opaque AI matching in this milestone. |
| Privacy-preserving anonymous giving | Anonymous records remain first-class, with no fabricated person and no leakage through donor counts or exports. | Medium | Define anonymous vs temporarily unidentified; permissioned later reassignment with audit. |
| Saved report views | Named reusable filter/column sets speed recurring monthly workflows; Tithely documents this pattern. | Medium | Defer until filters and export semantics stabilize. Views are church- and user-scoped. |
| Report-definition consistency tests | Prove that dashboard cards, ledger totals, CSV, PDF, and donor history agree for the same filters. | Medium | Golden fixtures spanning timezone boundaries, reversals, anonymous gifts, and archived funds. |
| Country-aware statement templates | Makes a global platform adaptable without hard-coding one jurisdiction's tax language. | High | Post-MVP; requires explicit country/legal requirements and reviewed templates. Planning Center itself varies statement behavior by country. |

## Anti-Features

These are deliberate boundaries for the current milestone. Some may be future products, but building them now would expand legal, operational, or technical scope before the core ledger is trustworthy.

| Anti-Feature | Why Avoid Now | What to Do Instead |
|---|---|---|
| Online payment processing, stored payment methods, refunds, chargebacks, and payouts | External payment integrations are explicitly out of scope and add PCI/payment-processor lifecycle complexity. | Record the payment method/source and external reference; reconcile through CSV/manual workflows. |
| Recurring gifts and donor-facing giving form | Requires payment processing, donor identity, consent, retry, and notification workflows. | Keep this release administrative and manual-entry focused. |
| Full general ledger, bank reconciliation, budgeting, payroll, or expense management | A donation register is not an accounting system; imitating one creates false completeness. | Provide reliable filtered exports for the church's accounting workflow. |
| Universal “tax receipt” compliance | Required wording, numbering, eligible gifts, and reissue rules vary by jurisdiction; official products expose country-specific behavior and disclaim accounting advice. | Generate a neutral contribution summary first; implement reviewed country-specific templates only from concrete requirements. |
| Hard deletion of posted donations, funds with history, or members with giving history | Deletion destroys traceability and can change historical totals silently. | Reverse/supersede donations and archive members/funds, with audited exceptional data-retention workflows outside normal UI. |
| Silent in-place edits to posted financial facts | Users cannot explain changed totals after the fact. | Require correction reason and preserve original plus correction/reversal history. |
| Cross-church “all data” mode for ordinary operators | Undermines the core tenant-isolation promise and increases wrong-church entry risk. | Require explicit active church. Any future platform-wide view must be separately permissioned, read-only by default, and visibly scoped. |
| Treating members as administrator accounts | The project explicitly separates congregation people from system operators; combining lifecycles creates privilege and privacy hazards. | Keep member profiles non-authenticating and admin identity in the existing identity domain. |
| Fake member records for anonymous donors | Pollutes the directory, skews people counts, and makes donor identity ambiguous. | Use nullable member association with an explicit anonymous/unidentified state. |
| Free-form currency per donation | Permits incomparable totals inside one church and invites data-entry errors. | Configure one ISO currency per church for this milestone; research multi-currency accounting only when required. |
| In-kind donation valuation | Non-cash gifts have different data and jurisdiction-specific statement treatment; Planning Center manages them separately. | Defer to a dedicated researched phase; do not overload the monetary amount field. |
| Pledges, campaigns, fundraising goals, and donor engagement automation | Useful in broader giving suites but not required to record and report received donations. | Stabilize members, funds, ledger, statements, and exports first. |
| Households/joint giving and profile merge | Both affect statement ownership and historical attribution; competitor documentation shows merge behavior can be irreversible and operationally subtle. | Warn about duplicates now. Research reversible merge and household statement semantics before implementation. |
| Custom report builder or arbitrary formulas | High implementation and support cost before core report definitions are trusted. | Ship a small set of canonical reports with filters and CSV export. |
| Predictive “generosity scores,” leaderboards, or gamification | Creates privacy, pastoral, and explainability risks without supporting the core administrative job. | Use descriptive aggregates only. |
| Native mobile apps, microservices, or an operational job platform without a concrete need | Explicitly outside the current product/architecture boundary; the current worker is only a stub. | Deliver responsive web flows in the modular monolith; introduce background jobs only for proven workloads such as large exports. |

## Feature Dependencies

```text
Existing identity + explicit church selection + role checks
  -> tenant-scoped member repository
      -> paginated member directory + create/detail/edit/status
      -> fast member lookup during donation entry

Church locale + IANA timezone + ISO currency
  -> funds/payment-method catalogs
  -> exact donation money/date model
      -> draft batch + donation items
          -> validated posting transaction
              -> immutable correction/reversal + audit trail
              -> donation ledger and canonical report query
                  -> dashboard totals/breakdowns
                  -> member giving history
                  -> CSV export and printable/PDF summary
                  -> individual contribution statements

Explicit finance:read/write/post/correct/export permissions
  -> financial UI, reports, donor history, exports, and audit viewer

Canonical report semantics + fixtures
  -> consistency tests across UI, CSV, PDF, and statements
```

## Recommended Delivery Slices

1. **Finish the member lifecycle** — paginated/searchable directory, create/detail/edit, active/inactive transitions, strict tenant/permission tests, shared response contracts, and trilingual responsive UI.
2. **Define donation primitives** — church currency/timezone, fund and payment-method catalogs, exact money/date semantics, optional same-tenant member association, permissions, and audit event model.
3. **Ship safe manual entry** — draft batches, quick member lookup, anonymous gifts, running totals, duplicate defense, atomic posting, and localized confirmation.
4. **Add ledger and corrections** — donation detail, bounded filters, stable pagination, reversal/superseding workflow, and audit viewer.
5. **Deliver essential reports** — canonical totals and breakdowns, member history, CSV, printable/PDF summary, and report provenance.
6. **Add contribution statements** — neutral date-range statement first; research country-specific tax receipt behavior separately before labeling output tax-compliant.
7. **Harden the complete flow** — cross-tenant, permission inventory, timezone/currency boundary, report-consistency, E2E, and three-locale visual regression gates.

### Ordering Rationale

- Members precede donations because donor association is optional but must be safe when used.
- Money, timezone, funds, permissions, and audit semantics precede UI-heavy donation work because changing them later would rewrite both records and reports.
- Posting and correction semantics precede reporting; otherwise totals and exports acquire unstable definitions.
- Statements come after duplicate warnings, member history, and canonical totals because errors there are donor-visible.
- Hardening is continuous per slice, with a final end-to-end gate—not a security phase postponed until the end.

## MVP Recommendation

Prioritize:

1. Complete tenant-safe member CRUD-with-status, search, and pagination.
2. Church-scoped funds and payment methods plus exact money/timezone/currency rules.
3. Manual batch recording for identified and anonymous gifts with atomic posting.
4. Immutable correction/reversal and domain audit history.
5. Bounded ledger, canonical summary totals, member history, CSV, and printable/PDF summary.
6. Neutral individual contribution statements after totals are proven consistent.

Defer saved views, dual approval, country-specific tax receipts, profile merge, households, in-kind gifts, pledges, campaigns, donor portals, online payments, and full accounting.

## Evidence and Confidence

| Finding | Confidence | Evidence |
|---|---|---|
| Funds/designations, payment dimensions, donor-level history, summary reporting, and export are standard operational capabilities. | HIGH | Current official Planning Center and Tithely documentation independently show these dimensions. |
| Manual batches with a committed/posted boundary are a standard pattern for offline gifts. | HIGH | Official Planning Center documentation distinguishes uncommitted batches from statement-eligible records; current Tithely documentation describes admin batch giving. |
| Statements require careful duplicate, household, timezone, and revision semantics. | HIGH | Official Tithely guidance explicitly covers duplicate cleanup, household choice, timezone effects, and regenerated statements; Planning Center documents country-specific generation. |
| Reversal-first immutability and two-person review will differentiate this product. | MEDIUM | These are opinionated design recommendations derived from the project's auditability requirement, not claims that every competitor implements them. Validate against UCKG finance operations. |
| A neutral contribution summary is the correct pre-compliance output. | MEDIUM | Official vendors warn that legal/tax treatment varies; the exact UCKG jurisdictions and requirements are not yet documented. Obtain legal/accounting review before tax-compliant labels. |

## Sources

Primary/authoritative product documentation, accessed 2026-08-03:

- [Planning Center — Create and manage payment sources](https://pcogiving.zendesk.com/hc/en-us/articles/115012277207-Payment-Sources) — payment-source classification, batch defaults, receipt/statement and report dimensions (HIGH).
- [Planning Center — Introduction for reviewers](https://pcogiving.zendesk.com/hc/en-us/articles/1260803013250-Introduction-for-reviewers) — date-scoped dashboard totals, donor/donation counts, funds, channels, sources, and print export (HIGH).
- [Planning Center — Download individual statements](https://pcogiving.zendesk.com/hc/en-us/articles/23115113055899-Download-Individual-Statements) — date-range PDFs and country-specific statement behavior (HIGH).
- [Planning Center — End-of-year giving](https://pcogiving.zendesk.com/hc/en-us/articles/360052169094-End-of-year-giving) — uncommitted batches excluded from statements (HIGH).
- [Planning Center — In-kind donations](https://pcogiving.zendesk.com/hc/en-us/articles/25191013849371-New-In-Kind-Donations) — non-monetary gifts have distinct data, reporting, acknowledgment, and jurisdictional valuation behavior (HIGH).
- [Tithely — Getting started with Giving](https://help.tithe.ly/hc/en-us/articles/7279317115799-Getting-Started-with-Tithely-Giving-A-Useful-Checklist) — funds/designations, admin roles, transaction reports, CSV, statements (HIGH).
- [Tithely — Create a custom giving report](https://help.tithe.ly/hc/en-us/articles/7151442653335-Create-a-Custom-Giving-Report) — filters, report columns, permission requirement, CSV and PDF outputs (HIGH).
- [Tithely — Filter transactions, order columns, and save views](https://help.tithe.ly/hc/en-us/articles/7240564555287-How-to-Filter-Transactions-Order-Columns-and-Save-Views) — bounded date filters, pagination, saved views, summary, and large exports (HIGH).
- [Tithely — Add, edit, and archive funds](https://help.tithe.ly/hc/en-us/articles/7244446035991-Add-Edit-and-Archive-Funds-on-The-Giving-Form) — fund lifecycle and preservation in historical statements (HIGH).
- [Tithely — Donation and tax receipts](https://help.tithe.ly/hc/en-us/articles/37101200269207-Donation-Receipts-and-Tax-Receipts-For-Donors) — receipt fields, donor history, and organization responsibility for annual statements (HIGH).
- [Tithely — Complete guide to creating tax statements](https://help.tithe.ly/hc/en-us/articles/36457426975895-Complete-Guide-to-Creating-Tax-Statements-in-Tithely) — duplicate cleanup, household semantics, timezone effects, and location-scoped generation (HIGH).
- [Tithely — Issuing an updated tax statement](https://help.tithe.ly/hc/en-us/articles/27806890661783-Issuing-An-Updated-Tax-Statement) — statement revision/reissue behavior after gift changes (HIGH).
- [Tithely — Merging duplicates in People](https://help.tithe.ly/hc/en-us/articles/7472784192919-Merging-Duplicates-in-People) — irreversible merge and the complexities of keeping contact and giving histories consistent (HIGH).

## Gaps Requiring Product Input

- Which countries/jurisdictions will use statements, and is a neutral contribution summary sufficient for the first launch?
- What is each church's configured currency and IANA timezone, and can either change after donations exist?
- Which payment methods and fund types are required initially, and are they centrally governed or church-configurable?
- Is a two-person collection count or approval process required? If so, what thresholds and role separations apply?
- What member fields beyond name/email/phone are operationally necessary for statements (notably postal address), and what retention/privacy rules apply?
- Should “anonymous” and “unidentified” be distinct, allowing later audited assignment of an unidentified gift to a member?
- What correction policy does finance expect: reversal plus replacement for every posted change, or limited metadata edits with full audit history?

