# UX Guidelines & Design Principles — Educational CRM

**Phase 2/3 of 10 — Frontend Design & Build Roadmap**
**Status:** Draft v1.0
**Depends on:** `01-frontend-architecture.md` (Phase 1)
**Feeds into:** Phase 4 (Design Tokens), Phase 6 (Component Library)

---

## 0. Purpose

Phase 1 defined *where things live*. This document defines *how things behave* — the rules a component must follow regardless of which screen it appears on. Phase 4 (tokens) cannot start until §1 below is settled, since calendar system and digit rendering directly determine formatting tokens.

---

## 1. Resolved Decisions (carried from Phase 1 §6)

Each item below states a recommendation with rationale. These are product decisions, not aesthetic ones — flagged clearly so they can be overridden before Phase 4 locks them into tokens.

### 1.1 Calendar System: **Jalali (Shamsi) display, Gregorian storage**
**Recommendation: Adopt.**
Backend stores and validates dates in Gregorian (confirmed in fixtures and migrations) — this does not change. The frontend applies a **display-only transform**: every date render (due dates, class schedules, created_at) shows Shamsi by default. Every date *input* (date pickers) also operates in Shamsi, converting to Gregorian only at the API boundary. This is standard practice for Iranian enterprise software (compare: most Iranian SaaS/ERP products) and avoids forcing admission/finance staff into mental date conversion during daily work. A persistent per-user toggle (Shamsi/Gregorian) is a nice-to-have, not required for v1.

### 1.2 Direction: **RTL default, logical CSS properties**
**Recommendation: Adopt.**
The product is Persian-first. RTL is not a "mode" bolted onto an LTR design — it is the default direction. This means: use CSS logical properties (`margin-inline-start`, not `margin-left`) from Phase 4 onward, never mirror an LTR design after the fact. LTR support (e.g., for English-only future markets) becomes a flip of direction tokens, not a redesign, *if* this rule is followed strictly from token-creation onward.

### 1.3 Digit Rendering: **Persian numerals for reading, Latin numerals for input**
**Recommendation: Adopt, with a precise split.**
- **Display** (table cells, money amounts, dates, phone numbers shown read-only): Persian digits (۰۱۲۳...), matching how Persian-speaking staff scan numbers fastest.
- **Input fields** (typing an amount, typing a phone number, typing a date manually): accept both Persian and Latin digit entry transparently (normalize on keystroke), but the field itself doesn't need to force-render Persian while typing — that's a known source of cursor-jump bugs in RTL number inputs. Normalize, don't force.
- This rule applies uniformly to money, phone, and ID-like fields. No per-field exceptions.

### 1.4 Merged Activity + Communication Timeline: **Adopt as a frontend-only composition**
Confirmed from Phase 1. The backend keeps Activity and Communication as separate tables (`/activities`, `/communications`); the frontend's Person-detail Timeline component fetches both and interleaves by `created_at` into one visual stream, with a small icon distinguishing system-activity from human-communication entries. This is purely a rendering decision — no backend change, no new endpoint needed for v1 (client-side merge of two paginated lists is acceptable at current data volumes; revisit only if a person accumulates thousands of timeline entries).

### 1.5 Stale-Lead Visual Flag: **Adopt as a lightweight client-side computed indicator**
Since Person lifecycle (`prospect→lead→student`) is manual, the frontend computes a "stale" flag wherever a Person/Journey is rendered: `status == lead AND no Activity/Communication in last N days` (N configurable, default 14). Rendered as a small warning dot/badge on list rows and the detail header — never as a blocking interaction, just a visibility aid for Admission staff to self-prioritize. This is explicitly **not** a backend feature; it's a UI compensation for a known process gap, and should be revisited/removed if lifecycle automation ships later.

---

## 2. Core Design Principles

These five principles govern every component decision through the remaining phases. Each pattern in the component library (Phase 6) should be traceable to at least one of these.

1. **State is shown, not edited directly.** Anything backend-derived (status, computed totals, snapshots) is a badge or read-only value with explicit actions to change it — never a form field bound to that value. (Formalized further in §3.1.)

2. **Consequential actions show their consequences before confirming.** A confirm dialog that just repeats the action name ("Are you sure you want to drop this enrollment?") is insufficient when the action cascades (cancels installments, triggers refunds, cancels tasks). The dialog states the cascade.

3. **One pattern, many contexts — not one screen, one pattern.** Before building a new visual treatment for a problem, check whether an existing pattern (Phase 6 inventory) already solves it in a different entity. This is the project's primary defense against UI sprawl across 16 backend modules.

4. **Numbers are read fast or not at all.** Money, dates, and counts follow strict, consistent formatting (§1.3, §3.3) — financial-data screens are scanned, not read line-by-line, and inconsistent formatting is where scanning breaks down.

5. **Permission boundaries are visible before they're hit.** A Teacher should see *why* a "Record Payment" button is absent (not just its absence) when it matters for their understanding of the record — via a read-only banner, not a silent omission, on T1 detail pages where role-based view differences are significant (Enrollment, Invoice).

---

## 3. Interaction Rules

### 3.1 Status-as-Action (hard rule, not a guideline)
Any field with backend-managed lifecycle is rendered as a **badge** plus an **action affordance**, never a dropdown bound to that field:

| Field | Badge states | Action(s) available |
|---|---|---|
| Enrollment.status | pre_enroll / active / completed / dropped | "Drop Enrollment" (with cascade dialog, §3.2) |
| Invoice.status / Installment.status | pending / partially_paid / paid / overdue / cancelled | "Record Payment", "Refund" (on the relevant installment/payment) |
| Consultation.outcome | null until set | "Set Outcome" wizard (the five outcome paths) |
| Task.status | open / done / cancelled | "Mark Complete", "Reassign" |

No exceptions. If a future entity introduces a new derived-status field, it follows this same table format before any screen is built for it.

### 3.2 Confirmation-Depth Tiers
Three tiers, escalating by consequence severity — not by entity type:

- **Tier 1 (no confirmation):** reversible, low-stakes — marking a task complete, editing a Department name.
- **Tier 2 (lightweight confirm, single sentence):** destructive but contained — cancelling a single task, archiving a Roadmap.
- **Tier 3 (consequence-summary dialog):** cascading or financial — **Drop Enrollment** (must list: installments cancelled, total amount refunded, tasks cancelled) and **Refund** (must show: remaining refundable balance after this refund, which installment it applies to). Tier 3 dialogs use a distinct visual treatment (stronger color, explicit cascade list) from Tier 2 — this is the direct fix for the "Drop vs Refund need different weight" issue flagged in Phase 1.

### 3.3 Money Input & Display
- Storage/transmission: integer Toman, always. No decimals anywhere in the frontend, ever (matches backend invariant).
- Display: Persian digits, thousand-separated (e.g., ۲٬۵۰۰٬۰۰۰), with "تومان" suffix in context where currency could be ambiguous (rare, since the product is single-currency, but include on financial summary cards for clarity).
- Input: numeric keypad-friendly input, accepts Latin or Persian digit entry (§1.3), live thousands-separator formatting as the user types, validated against backend constraints (`gt=0`, snapshot immutability) with the **frozen-field tooltip rule** below.

### 3.4 Frozen/Snapshot Field Treatment
Any field the backend treats as immutable post-creation (`price_snapshot`, `discount_snapshot`, `Invoice.total_amount`) renders as a **read-only value with a small info icon**, and hovering/tapping the icon explains why ("Price locked at enrollment date — course price changes don't affect existing enrollments"). This directly addresses the Phase 1 concern that a silently-disabled field reads as a bug.

### 3.5 Search Behavior
- Person search matches name OR phone, and phone matching must normalize Persian/Latin digit input before querying (§1.3) — a search box that fails on a Persian-typed phone number is a functional bug, not a polish issue.
- Global search (⌘K) is cross-entity but scoped to what the current role can see — it must not surface entities the user lacks permission to open (consistent with Principle 5, but enforced silently here since search results aren't "explaining an absence," they're filtering a result set).

### 3.6 Empty / Loading / Error Baseline
- **Loading:** skeleton matching the eventual content's shape (table-row skeleton for tables, card skeleton for cards) — never a generic spinner for content that has a known shape.
- **Empty:** always pairs a one-line explanation with a primary action where one exists (e.g., empty Course list → "No courses yet" + "Add Course"); purely informational empty states (e.g., empty Activity timeline) skip the CTA.
- **Error:** switches on `error_code` per the Phase 1 data-flow contract (§5 of Phase 1) — `VALIDATION_ERROR` renders inline near the offending field (using the `field` key when present), `NOT_FOUND`/`CONFLICT`/`PERMISSION_DENIED` render as page-or-section-level states, not field-level.

---

## 4. Content & Terminology Consistency

Backend enum values are not user-facing strings. A single lookup table (maintained once, referenced everywhere — this becomes a Phase 6 data file, not a per-component decision) maps backend values to Persian display labels:

| Backend value | Displayed as (example) |
|---|---|
| `pre_enroll` | پیش‌ثبت‌نام |
| `partially_paid` | پرداخت جزئی |
| `follow_up_registration` | پیگیری ثبت‌نام |
| `refer_other_dept` | ارجاع به بخش دیگر |

This table is a living artifact — every new enum value added to the backend gets a row here before any UI renders it. No screen should ever render a raw backend enum string directly.

---

## 5. Permission Visibility Principle

Per Architecture §5 (Phase 1): UI-level role hiding is convenience, never security. Two concrete behaviors follow:

- **Nav-level hiding:** entities/routes outside a role's normal journey aren't shown in nav (reduces noise) — but a direct URL to a permitted-but-unlisted resource still works if the backend allows it.
- **Action-level banners (not silent removal):** on shared T1 pages (Enrollment, Invoice) where multiple roles legitimately view the same record with different write access, the absent action is replaced with a small "view-only for your role" indicator rather than no trace of the action ever existing — supports Principle 5 without requiring a tooltip on every button.

---

## 6. AI Interaction Baseline Principles

(Full specification is Phase 9 — these are the guardrails that must hold regardless of later AI feature design.)

1. **AI suggests, humans confirm, for anything financial or status-changing.** An AI-suggested consultation outcome or task triage is a suggestion the human accepts/edits — never an auto-executed action on Enrollment, Invoice, or Payment data.
2. **AI summaries are clearly labeled as generated**, visually distinct from factual record data, so a Person-detail AI summary is never mistaken for an Activity log entry.

---

## 7. What This Document Deliberately Excludes

No actual color values, spacing scale, or font choices (Phase 4). No component visual specs (Phase 6). This document is behavioral law; Phase 4 supplies the visual vocabulary that implements it.

---

## 8. Next Step

**Phase 4 — Design Tokens**, now unblocked: calendar system, RTL/logical-property direction, and digit-rendering rules are resolved (§1), so color, spacing, typography, and the Persian/Jalali formatting tokens can be defined without re-litigating these decisions mid-phase.
