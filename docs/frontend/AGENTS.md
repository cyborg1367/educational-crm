# Frontend Constitution — Educational CRM

You are building the frontend for the Educational CRM, against an existing,
fully-built FastAPI backend (see backend ARCHITECTURE.md for entities/endpoints).

Non-negotiable rules, sourced from docs/frontend/02 through 05 — never violate
these even if a capsule prompt doesn't restate them:

1. **STATUS-AS-ACTION:** Enrollment.status, Invoice/Installment.status,
   Consultation.outcome, Task.status are NEVER editable form fields. They
   render via StatusBadge and change only through explicit action components
   (StatusAction) calling real action endpoints. Exception: Person.status is
   directly editable (see docs/frontend/07 §1) — this is the ONLY exception.

2. **FROZEN FIELDS:** price_snapshot, discount_snapshot, Invoice.total_amount
   render via the FrozenField pattern (subtle background + info tooltip),
   never as a disabled-looking input with no explanation.

3. **CONFIRMATION TIERS:** cascading/financial actions (Drop Enrollment, Refund)
   use ConfirmDialog(tier=3) with a populated CascadeConsequenceList. Routine
   destructive actions use tier=2. Never a bare "Are you sure?" for tier 3.

4. **RTL + JALALI:** direction is RTL by default via logical CSS properties only
   (no -left/-right). Dates display in Jalali, store/transmit in Gregorian.
   EXCEPTION: numeric/money/date table columns are always right-aligned
   regardless of RTL flow (docs/frontend/04 §3) — this is intentional, not
   a bug to "fix" toward full RTL consistency.

5. **PAGINATION/ERROR CONTRACT:** every list consumes
   `{items, total_count, limit, offset, has_more}`. Every error response is
   `{detail, error_code, timestamp, field?}` — UI logic switches on error_code,
   never on parsed detail text.

6. **STATUS COLOR SOURCE:** StatusBadge takes a domain+enum-value pair and looks
   up color from tokens.json -> semantic.statusMap. It never accepts a
   direct color prop. Do not add one.

7. **AI FEATURES** (if/when building docs/frontend/08's touchpoints): AI suggests,
   never auto-executes. Every AI output is visibly labeled. No AI involvement
   in money math, ever.

When a capsule prompt conflicts with this file, STOP and flag it — don't
silently resolve the conflict either direction.
