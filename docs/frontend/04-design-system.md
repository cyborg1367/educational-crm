# Design System — Educational CRM

**Phase 5 of 10 — Frontend Design & Build Roadmap**
**Status:** Draft v1.0
**Depends on:** `03-design-tokens.md` + `tokens.json` (Phase 4)
**Feeds into:** Phase 6 (Component Library) — every component spec in Phase 6 cites a rule from this document rather than inventing its own state behavior

---

## 0. Purpose

Phase 4 defined *what values exist*. This phase defines *the rules for applying them consistently* — so that "disabled," "focused," "urgent," and "primary action" mean the same thing everywhere, before any individual component (Button, Input, Badge, Dialog) is specified. Without this layer, Phase 6 would re-decide these rules 30 times, once per component, with inevitable drift.

---

## 1. Theming Mechanism

- Tokens are delivered as **CSS custom properties** generated from `tokens.json`, applied at `:root`. Components consume `var(--color-status-success)` style references — never hardcoded hex values, never inline primitive values.
- **Direction** is set once, at the document root: `<html dir="rtl">`. Every spacing/positioning token is consumed through logical properties (Phase 4 §3), so this single attribute is the only place RTL is "switched on" — no component should contain its own direction-conditional logic.
- **Single theme for v1.** Dark mode and multi-org branding are explicitly deferred (Phase 4 §1.4), but the `light.` token namespace convention means adding a second theme later is additive, not a rewrite.

---

## 2. Interactive State Model

Every interactive element in the system (button, input, table row, nav item, card) implements the **same five states**, using the same mechanism for each — this is the single biggest consistency lever in this phase.

| State | Rule |
|---|---|
| **Default** | Semantic token per component (Phase 6 assigns specifics) |
| **Hover** | Background shifts one step toward `neutral.100`/`brand.50` depending on element type — never a color *hue* change, only a lightness step |
| **Focus-visible** | `focusRing` token as a 2px outline with 2px offset, **on keyboard focus only** (`:focus-visible`, not `:focus`) — mouse clicks never show a focus ring, keyboard navigation always does |
| **Active/pressed** | One step darker than hover, same hue |
| **Disabled** | Text → `color.text.disabled`, background → `color.surface.subtle`. **Never implemented via `opacity`** — opacity uniformly fades color *and* the semantic status hue together, which would make a disabled danger-strong badge unreadable as "still dangerous, just inactive." Disabled states always use the dedicated muted token, not a filter. |
| **Loading** | Skeleton (per UX Guidelines §3.6) for content; for buttons specifically, a static label is replaced with a tokenized spinner — no opacity fade here either, for the same reason |

This table is the **only place** these rules are defined. Phase 6 component specs reference "follows the standard state model" rather than re-describing hover/focus/disabled per component.

---

## 3. The Numeric Alignment Exception (RTL)

One deliberate, explicit exception to "RTL is the default, use logical properties everywhere" (Phase 4 §3):

**Rule: numeric and monetary table columns are always right-aligned, regardless of text direction.**

Rationale: Persian digits within a number still read left-to-right for place value (thousands, hundreds, ones) — this doesn't reverse with UI direction. Right-aligning numeric columns lets users compare magnitudes and scan decimal/thousand-separator positions consistently down a column, which is the entire reason numeric columns are right-aligned in *any* direction's financial UI (this matches Stripe, and matches Persian-market fintech conventions, not just Latin-script convention). Left-aligning numbers in an RTL table to "be consistent with direction" would actively hurt scannability — this is the one place visual consistency loses to functional readability.

**Scope of the exception:** money, dates-as-numbers, IDs, counts. **Not** in scope: status badges, names, free text — those follow standard RTL flow (`text-align: start`) without exception.

---

## 4. Icon System

- **Library:** Lucide (consistent, single-weight outline icon set, broad coverage, no licensing friction).
- **Directional icons** (chevrons, arrows indicating "next/back" or "expand toward content flow") **mirror with direction** — implemented as a single shared utility class/token (`icon.mirror-rtl`), applied once at the icon-wrapper level, never hardcoded per usage. This guarantees a "next page" chevron always points toward where the next page actually is, regardless of direction.
- **Non-directional icons** (clock, trash, check, user, money) **never mirror** — their meaning isn't tied to reading direction, and flipping them would look like a rendering bug.
- **Sizing:** icon size always matches the adjacent text's line-height step (`16px` icon with `font.size.sm` text, `20px` with `font.size.base`), never an arbitrary fixed size independent of context.

---

## 5. Sizing Scale for Interactive Elements

Tied to the spacing scale (Phase 4 §3), not invented separately:

| Token | Height | Use |
|---|---|---|
| `control.sm` | 32px | Dense table-inline actions, compact filter chips |
| `control.md` | 40px | Default for all standalone buttons, inputs, selects |
| `control.lg` | 48px | Primary actions on wizard steps (Enrollment creation, Consultation outcome), and **any control a Teacher might tap on a tablet during a live class** — attendance-marking controls default to `lg`, not `md`, given that specific touch-input context flagged in Phase 1's role analysis |

**Minimum tap target across the entire system: 40px.** This is a hard floor, not a default-with-exceptions — even dense table actions at `control.sm`'s 32px visual height get a 40px invisible hit-area padding.

---

## 6. Elevation & Z-Index Usage Rules

Connecting the two token scales from Phase 4 §4/§6 into concrete usage, so "which elevation for what" is never an open question in Phase 6:

| Surface | Elevation | Z-index | Motion |
|---|---|---|---|
| Resting card | `elevation.1` | — (static) | none |
| Dropdown/popover/select menu | `elevation.2` | `z.dropdown` | `duration.fast` |
| Drawer | `elevation.3` | `z.drawer` | `duration.base`, slide-in |
| Modal/dialog (Tier 2) | `elevation.2` | `z.modal` | `duration.base`, fade+scale |
| Modal/dialog (Tier 3) | `elevation.3` + `surface.danger-subtle` | `z.modal` | `duration.base`, fade+scale — same motion as Tier 2, **heavier visual weight is color/elevation, never animation drama** (a shaking or slower dialog reads as gimmicky, not serious) |
| Toast | `elevation.2` | `z.toast` (highest — toasts must never be occluded by a drawer or modal that opened after them) | `duration.base`, slide from edge |

---

## 7. Status Badge — System Contract

Formalizing the component every other phase keeps referencing, before Phase 6 writes its full spec:

- Padding: `space.1` vertical, `space.2` horizontal.
- Radius: `radius.full` (pill shape) — chosen over `radius.sm` specifically so badges are never visually confused with buttons, which use `radius.md`.
- Typography: `font.size.xs`, `font.weight.medium`.
- Color: **always** sourced from `tokens.json` → `semantic.statusMap`, keyed by the exact backend enum value — a badge component takes an enum string as a prop and looks up its own color; it never accepts a color prop directly. This is the mechanism that makes Phase 4 §1.2's table enforceable in code, not just in documentation.
- High-urgency states (`dropped`, `overdue` — per Phase 4's two-state urgency rule) additionally render a small leading dot using `confirmationTier.tier3.accent`, giving them a second visual signal beyond color alone (supports color-blind users distinguishing "danger" from "warning" hues).

---

## 8. Form Field — System Contract

- Label always above the field (not floating, not placeholder-as-label) — floating labels are a known accessibility and clarity tax in dense data-entry CRMs, and this product is data-entry-heavy (Person, Course, Enrollment creation).
- Error state: border → `color.status.danger`, helper text below the field in the same danger color, **populated directly from the backend's `field`+`detail` error contract** (Phase 1 §5) — frontend never re-words a validation message Phase 6 onward; it displays what the API returned, mapped through the terminology table (UX Guidelines §4) only for known enum-related errors.
- Frozen/snapshot fields (Phase 2/3 §3.4): rendered with `surface.subtle` background, `text.disabled` color, and the info-icon-with-tooltip — this combination is the *only* correct way to render an immutable field; a frozen field must never simply look like a disabled-but-theoretically-editable input.
- Money inputs: right-aligned (per §3 above), live-formatted with thousands separators as specified in Phase 4 §1.3/§7, numeric keyboard mode on touch devices.

---

## 9. Confirmation Dialog — System Contract

- Width: fixed `480px` for Tier 2, `560px` for Tier 3 (the wider size accommodates the required consequence list from UX Guidelines §3.2 — Tier 3 dialogs are not allowed to be the same size as Tier 2 and just add scrolling text; the extra width is a deliberate signal before the user even reads the content).
- Button placement: primary/destructive action at the **inline-end** position (logical property — resolves to right in our RTL default), secondary/cancel at inline-start. This is set once as a layout rule, not decided per-dialog, and automatically correct if direction ever changes.
- Tier 3 dialogs require the consequence list (§3.2 of UX Guidelines) to render as a **visually distinct block** (bulleted, in `surface.danger-subtle`) — never as a single inline sentence appended to the title, which is how Tier 2 dialogs are allowed to look.

---

## 10. Layout Grid & Responsive Behavior

- **Desktop-first**, with one defined breakpoint down to **tablet** (`768px`) — this product is a back-office tool, but the role analysis (Phase 1 §2) identified Teachers may use a tablet during live attendance-marking, so tablet is a real target, not an edge case.
- **No phone-optimized layout for v1.** Below tablet width, the system degrades gracefully (tables become stacked card lists, sidebar collapses to a drawer) rather than having a bespoke phone design — this is a scope decision to avoid doubling Phase 8's screen-template effort for a usage pattern that doesn't match this product's actual context (admission/finance staff at a desk, teachers at a tablet in a classroom).
- **Sidebar width:** fixed `260px` on desktop, collapses to an overlay drawer below `1024px`.
- **Content max-width:** `1280px` for list/dashboard views (prevents tables stretching uncomfortably wide on large monitors); detail pages (T1 entities) use `960px` for the primary content column, with relationship/sidebar content in a secondary `320px` column where applicable.

---

## 11. What This Document Deliberately Excludes

No actual component prop APIs or markup structure (Phase 6). No specific screen compositions (Phase 8). This document is the rulebook Phase 6 is graded against — every component spec should be checkable against a numbered section here.

---

## 12. Next Step

**Phase 6 — Component Library**: the ~30 components identified in the original pattern analysis, each specified against the rules in this document (state model, sizing scale, elevation rules, status contract, form contract) rather than each reinventing them.
