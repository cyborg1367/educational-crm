# AI Frontend Specification — Educational CRM

**Phase 9 of 10 — Frontend Design & Build Roadmap**
**Status:** Draft v1.0
**Depends on:** `02-ux-guidelines-design-principles.md` §6 (baseline AI guardrails), `05-component-library.md` §4 (`AISummaryPanel` shell), `07-screen-templates.md` §2.1/§2.5 (where AI touchpoints were referenced but not detailed)
**Feeds into:** Phase 10 (Cursor Prompt Library)

---

## 0. Purpose

Phase 2/3 §6 set two non-negotiable guardrails: AI suggests, humans confirm; AI output is clearly labeled. This phase expands those into a complete rule set, then specifies the four concrete AI touchpoints that earlier phases referenced without detailing: the Person-detail Summary Panel, Consultation outcome suggestion, Command Palette natural-language search, and Department Manager task-queue triage.

**Scope discipline:** this phase specifies exactly four touchpoints — the ones already implied by Phases 1–8. It deliberately does not expand the AI surface area further (no churn prediction, no AI-drafted SMS, no autonomous task creation beyond what the existing scheduled jobs already do). §6 makes this exclusion explicit so it isn't quietly relitigated during Phase 10 or implementation.

---

## 1. Expanded AI Design Rules

Six rules — the two from Phase 2/3 §6, plus four new ones this phase adds:

1. **AI suggests, humans confirm** *(carried forward)* — no AI output ever changes Enrollment, Invoice, Payment, or Task state without an explicit human accept/confirm action.
2. **AI output is visibly labeled** *(carried forward)* — distinct visual treatment, never mistaken for a factual record entry (e.g., never rendered inside the `Timeline` component's normal event styling).
3. **Explainability:** every AI suggestion states *which existing data it drew on* — e.g., the outcome suggestion shows "Based on: stated goal, recommended course, 0 prior consultations" beneath its suggestion, not just the suggestion alone. This is what makes a wrong suggestion immediately diagnosable by the human reviewing it, rather than a black box to either blindly trust or blindly distrust.
4. **No new data:** AI features only synthesize data already visible to the user through normal screens (per their role/org scope) — never introduce external facts, never speculate beyond what's in the record. A Person summary can say "no contact in 18 days" (computed from Activity/Communication) but never infer something like likely intent not evidenced in the data.
5. **Graceful degradation:** every AI surface is additive. If the underlying AI service is slow, errored, or disabled, the screen functions identically minus that one panel/widget — never a loading blocker on core workflow. (Concretely: Person Detail renders fully with Overview/Enrollments/Timeline tabs whether or not the Summary Panel ever resolves.)
6. **Dismissibility:** every suggestion can be dismissed with zero friction and no required justification — dismissing an outcome suggestion just lets the human pick manually, with no nag, no "are you sure," no tracked penalty.

---

## 2. Architectural Note: Where AI Calls Happen

Not a frontend-only decision, but stated here because it constrains how these four components are built: **AI requests are proxied through a backend endpoint, never called directly from the frontend to a third-party AI provider.** Two reasons, both non-negotiable: (a) org-scoping — only the backend can reliably enforce that an AI call only ever sees data the requesting user's org/role is permitted to see, matching the tenancy model already established in the backend `ARCHITECTURE.md`; (b) credentials — an AI provider API key must never be shipped to the client. This means each of the four touchpoints below assumes a corresponding backend endpoint (e.g., `POST /people/{id}/ai-summary`, `POST /consultations/{id}/ai-suggest-outcome`) that does not yet exist in the 30-capsule backend and would need to be a future capsule — flagged here as a dependency, not assumed already available.

---

## 3. Touchpoint Specs

### 3.1 AI Summary Panel (Person Detail)
**Where:** Person Detail Overview tab (Phase 8 §2.1) · **Shell:** `AISummaryPanel` (Phase 6 §4)

- **Trigger:** loads on tab view, asynchronously, non-blocking (Rule 5).
- **Input data:** this person's Activity + Communication timeline, Enrollment statuses, Task history — all already-fetched/fetchable data the user could otherwise read manually; the panel's only job is synthesis, not access to anything new.
- **Output:** 2–3 sentence synthesis (e.g., "Active student in Python Basics, payment up to date. Last contacted 3 days ago about class schedule. One overdue follow-up task.").
- **Labeling:** small "AI-generated" tag + sparkle-style icon (distinct from any status/badge iconography elsewhere in the system, so it's never confused with a data field), per Rule 2.
- **Failure mode:** panel quietly shows a "Summary unavailable" placeholder, never an error state that competes visually with the page's real content (Rule 5).
- **No action attached:** this is the one touchpoint that is purely informational — no accept/dismiss flow needed, since it doesn't propose a change to anything.

### 3.2 AI-Assisted Consultation Outcome Suggestion
**Where:** Consultation Outcome Wizard, Step 1 (Phase 8 §2.5)

- **Trigger:** on wizard load, once consultation context (`current_level`, `goal`, `recommended_course_id`, prior consultation count for this person) is available.
- **Output:** a pre-highlighted suggested outcome option within the existing outcome `Select` — **not a separate AI-only control** — plus the explainability line from Rule 3 directly beneath it.
- **Human action required:** the wizard's outcome field starts on the suggestion but is a normal, fully-editable `Select` — the human still actively proceeds through Step 2 and submits; nothing routes (no Enrollment, Task, or Journey gets created) until that explicit submission, satisfying Rule 1 even though the suggestion is pre-filled rather than blank.
- **Dismissal:** changing the `Select` away from the suggestion requires no confirmation, no warning — per Rule 6, second-guessing the AI must be exactly as easy as accepting it.
- **Failure mode:** if the suggestion call fails, Step 1 simply renders with the `Select` unfocused/empty, exactly as it would have without this feature at all — zero degradation to the underlying wizard from Phase 8.

### 3.3 Natural-Language Command Palette
**Where:** Global `CommandPalette` (Phase 6 §5), extending its existing structured search

- **Trigger:** typed query that doesn't match a direct entity-name/ID pattern gets interpreted as a natural-language filter request (e.g., "overdue installments for Python courses").
- **Output:** **not a generated answer** — the palette translates the query into a real, role-scoped filtered view (e.g., navigates to `/invoices` with the appropriate filter state already applied) and shows what filter it inferred ("Showing: Installments, status=overdue, course=Python Basics") so the human can see and correct the interpretation before trusting the results.
- **Scope enforcement:** results are filtered server-side through the same org/role-scoped endpoints every other screen uses — the NL layer only changes how a query string becomes a filter, never how data access is authorized. This keeps Phase 2/3 §3.5's role-scoped search rule intact without exception.
- **Failure/ambiguity mode:** if the query can't be confidently mapped to a filter, the palette falls back to its existing plain-text entity search (Phase 6 §5's original behavior) rather than guessing — an unresolved NL query degrades to the feature that already worked, never to an error state.

### 3.4 AI Task-Queue Triage (Department Manager)
**Where:** Department Manager's Tasks view / dashboard Action-Needed widget (Phase 7 §4, Phase 8 §2.8 context)

- **Trigger:** on viewing the Tasks list when the auto-generated task volume (from the backend's 5 scheduled jobs) exceeds a threshold (e.g., >15 open tasks) — this feature exists specifically because automated task generation can outpace a manager's ability to prioritize manually, which is a real risk surfaced back in Phase 1's pattern analysis.
- **Output:** a non-destructive **suggested ordering/grouping** of the existing task list (e.g., grouping by urgency-adjacent signal: overdue-installment-linked tasks first, then dormant-followup, then referrals) — the underlying `DataTable` data doesn't change, only presentation order, and a manager can always revert to default sort.
- **Human action required:** none, strictly speaking — reordering a list for review is lower-stakes than the other three touchpoints, so Rule 1 is satisfied trivially (no state changes at all). Still must obey Rule 2 (labeled as "AI-suggested order") so a manager isn't confused about why the list isn't in createdat order.
- **Failure mode:** falls back to default list ordering (due date ascending), per Rule 5.

---

## 4. Privacy & Data Boundary Summary

All four touchpoints inherit the backend's existing tenancy enforcement (org_id scoping) automatically, because of the architectural rule in §2 — there is no separate "AI privacy layer" to design, because the AI proxy endpoints sit behind the same auth/role checks every other endpoint does. The one privacy-adjacent decision worth recording: **AI Summary Panel content (3.1) is never persisted** — it's generated fresh per view, not stored as a record, so it can't go stale and silently misrepresent a person's current state if circumstances change between visits.

---

## 5. Explicitly Out of Scope for v1

Recorded here to prevent quiet scope creep later:

- No AI-drafted SMS message content (the four notification templates in the backend's `notifications/service.py` remain fixed, human-written templates).
- No predictive churn/dropout scoring.
- No autonomous task creation beyond the five existing backend-scheduled jobs — the triage feature (3.4) reorders, it never creates.
- No AI involvement in financial calculations (invariant validation, installment math) — those remain exact, deterministic backend logic, never AI-assisted, for the obvious reason that money math must be exact.

---

## 6. Next Step

**Phase 10 — Prompt Library for AI UI Generation**: the final phase, translating Phases 1–9 into concrete, reusable prompts (matching this project's established Cursor-capsule workflow) for generating the actual frontend codebase — components first (Phase 6 inventory), then skeletons (Phase 7), then screens (Phase 8), with the AI touchpoints (this phase) and their backend-endpoint dependencies flagged as a distinct, later capsule rather than bundled into initial screen generation.
