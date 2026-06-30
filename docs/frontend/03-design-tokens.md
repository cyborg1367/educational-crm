# Design Tokens — Educational CRM

**Phase 4 of 10 — Frontend Design & Build Roadmap**
**Status:** Draft v1.0
**Depends on:** `02-ux-guidelines-design-principles.md` (Phase 2/3) — specifically §1 (RTL, Jalali, digit rules) and §3.2 (confirmation-depth tiers)
**Feeds into:** Phase 5 (Design System — token→component mapping rules), Phase 6 (Component Library)
**Companion file:** `tokens.json` (machine-readable token source)

---

## 0. Token Architecture

Two-tier system, deliberately not three-tier — a CRM with ~30 components doesn't need component-specific token overrides yet, and adding that layer prematurely is exactly the kind of complexity this whole roadmap exists to avoid.

```
Primitive tokens  →  raw values (color.blue.500, space.4, font.size.base)
        ↓
Semantic tokens   →  meaning-bound names (color.status.paid, space.card-padding)
```

Components (Phase 6) consume **semantic tokens only**, never primitives directly. This is the enforcement mechanism for Design Principle 3 ("one pattern, many contexts") — if a component reaches for a primitive, that's a signal the semantic layer is missing a token, not a license to skip it.

---

## 1. Color Tokens

### 1.1 Primitive Palette
Standard neutral + brand scales (10-step, 50→900), kept deliberately conventional — the differentiation in this product is in the *semantic status system* (§1.2), not in a distinctive brand palette. A CRM's color budget should go toward making financial/lifecycle state instantly scannable, not toward visual flair.

- `color.neutral.{50–900}` — backgrounds, borders, text hierarchy
- `color.brand.{50–900}` — primary actions, active nav, focus rings
- `color.red/amber/green/blue.{50–900}` — raw hues feeding the semantic status layer below

### 1.2 Semantic Status Colors — Mapped to Actual Backend Enums

This is the table that matters most in this phase. Every status badge in the product (Design Principle 1: "state is shown, not edited") draws from this table, never an ad-hoc color choice per screen.

| Backend value | Entity | Semantic token | Visual weight |
|---|---|---|---|
| `prospect`, `pending`, `open` (task), `planned` (class) | Person/Task/Class | `color.status.neutral` | Low — informational |
| `lead` | Person | `color.status.info` | Low |
| `student`, `active`, `paid` | Person/Enrollment/Class/Invoice | `color.status.success` | — |
| `partially_paid` | Invoice/Installment | `color.status.warning` | Mid |
| `pre_enroll` | Enrollment | `color.status.info` | Low |
| `overdue` | Installment | `color.status.danger` | Mid–high |
| `dormant` | Person | `color.status.warning-muted` | Low (passive, not urgent) |
| `completed`, `done` | Enrollment/Journey/Task | `color.status.success-muted` | Low (resolved, past-tense) |
| `cancelled` | Installment/Task | `color.status.neutral-muted` | Low (inert, not alarming) |
| `dropped` | Enrollment | `color.status.danger-strong` | **High — Tier 3 weight** |
| `alumni` | Person | `color.status.brand-muted` | Low |

**Rule:** `dropped` and `overdue` are the only two states that should ever pull a viewer's eye from across a list. Every other status is deliberately quieter. If a future status addition seems to need urgent red, check this table first — it's a sign the urgency belongs in the action (a banner, a task) rather than the badge.

### 1.3 Confirmation-Tier Colors (from UX Guidelines §3.2)
- **Tier 2 dialogs** (lightweight confirm): `color.status.warning` border/accent — single sentence, contained risk.
- **Tier 3 dialogs** (Drop Enrollment, Refund): `color.status.danger-strong` accent, plus a distinct dialog background tint (`color.surface.danger-subtle`) — this is what visually separates "cancel a task" from "cancel every installment and refund money," per the Phase 1 concern about Drop/Refund looking too similar.

### 1.4 Dark Mode
Out of scope for v1 — not because it's unimportant, but because an educational-institute back-office tool is overwhelmingly used in well-lit daytime admin contexts, and building dual-mode semantic tokens now would roughly double Phase 4/6 effort for a feature with low usage likelihood for this specific user base. Token names use a `light.` prefix internally in `tokens.json` so a `dark.` set can be added later without renaming anything.

---

## 2. Typography Tokens

### 2.1 Font Family
Primary: **Vazirmatn** (open-source, purpose-built for Persian/Latin mixed UI text, excellent number-glyph support for both Persian and Latin digits — directly relevant to the digit-rendering rule in UX Guidelines §1.3). Fallback stack: `Vazirmatn, "Segoe UI", Tahoma, sans-serif`.

Why not a Latin-first font with a Persian fallback: this product is Persian-first per UX Guidelines §1.2, and font-fallback mismatches between Persian and Latin glyphs (different weight, different x-height) are a visible quality tell in RTL products. One font family, used for both scripts, avoids that entirely.

### 2.2 Type Scale
Persian (Perso-Arabic) script needs **taller line-height** than Latin-only scales at equivalent font sizes — descenders and diacritical positioning need more vertical room, or text feels cramped. This scale reflects that:

| Token | Size | Line-height | Use |
|---|---|---|---|
| `font.size.xs` | 12px | 1.6 | Captions, table meta text |
| `font.size.sm` | 14px | 1.6 | Table body, form labels |
| `font.size.base` | 16px | 1.7 | Default body text |
| `font.size.lg` | 18px | 1.7 | Card titles, emphasized body |
| `font.size.xl` | 22px | 1.5 | Section headers |
| `font.size.2xl` | 28px | 1.4 | Page titles |

### 2.3 Font Weight
`font.weight.{regular(400), medium(500), semibold(600), bold(700)}` — four steps only. A CRM doesn't need a 9-weight variable-font scale; this is enough to distinguish body / emphasized / heading / badge-label.

---

## 3. Spacing Tokens

8px base grid, exposed as a numeric scale rather than named sizes (more flexible for component-internal use in Phase 6):

`space.{0, 1(4px), 2(8px), 3(12px), 4(16px), 5(20px), 6(24px), 8(32px), 10(40px), 12(48px), 16(64px)}`

**Critical rule (from UX Guidelines §1.2):** every spacing token is consumed through **logical CSS properties** — `padding-inline-start`, `margin-inline-end`, `inset-inline-start` — never `-left`/`-right`. This is what makes RTL the default rather than a mirrored afterthought. This rule is non-negotiable starting now, because retrofitting physical-property spacing into logical properties later means touching every component, not just flipping a token.

---

## 4. Radius & Elevation

- `radius.{sm(4px), md(8px), lg(12px), full(9999px)}` — `sm` for inputs/badges, `md` for cards, `lg` for dialogs/drawers, `full` for avatar/status dots.
- `elevation.{0,1,2,3}` — shadow tokens for resting cards (0–1), dropdowns/popovers (2), modals/drawers (3). Kept to 4 steps; more than that and elevation stops communicating hierarchy.

---

## 5. Motion Tokens

Used sparingly — dialogs, drawers, toasts only. Not for page transitions (a CRM back-office should feel instant, not animated).

- `motion.duration.{fast(120ms), base(200ms), slow(320ms)}`
- `motion.easing.standard` — single easing curve, reused everywhere a transition exists, so motion feels consistent rather than each component inventing its own timing.

---

## 6. Z-Index Scale

Given the pattern inventory's heavy use of dialogs, drawers, dropdowns, and toasts simultaneously possible (e.g., a confirm dialog opened from within a drawer), an explicit layering scale prevents ad-hoc z-index wars in Phase 6:

`z.{dropdown(10), drawer(20), modal(30), toast(40)}`

---

## 7. Locale & Format Tokens

These aren't visual, but they're tokens in the same sense — fixed, named, reused values that Phase 6 components reference instead of reimplementing:

| Token | Value | Source |
|---|---|---|
| `locale.calendar` | `jalali` | UX Guidelines §1.1 |
| `locale.calendar.storage` | `gregorian` | backend contract — never changes |
| `locale.digits.display` | `persian` | UX Guidelines §1.3 |
| `locale.digits.input` | `normalize-both` | UX Guidelines §1.3 |
| `locale.currency.unit` | `toman` (integer, no decimals) | backend money invariant |
| `locale.direction` | `rtl` | UX Guidelines §1.2 |

**These four rows are the actual hard dependency Phase 6 has on this phase.** A date picker, a money input, and a status badge component cannot be built correctly without these being settled — which is why Phase 4 couldn't start before Phase 2/3 resolved them.

---

## 8. Machine-Readable Source

The companion `tokens.json` (delivered alongside this document) encodes §1–§7 in a flat, two-tier (primitive → semantic) structure suitable for direct consumption by a CSS-variable generator or Tailwind config in Phase 6. This document is the *rationale*; `tokens.json` is the *source of truth* for values — if they ever disagree, the JSON wins and this document should be updated to match.

---

## 9. What This Document Deliberately Excludes

No component specs (Phase 6 — e.g., exactly how a Badge component consumes `color.status.*`). No screen-level composition (Phase 8). No icon set selection (a Phase 5/6 decision, not a token-layer one).

---

## 10. Next Step

**Phase 5 — Design System**, which defines the *mapping rules* between these tokens and component states (e.g., "a disabled input always uses `color.neutral.300` text on `color.neutral.50` background, regardless of which component" / "every Tier-3 dialog uses `elevation.3` + `color.surface.danger-subtle` together, never separately").
