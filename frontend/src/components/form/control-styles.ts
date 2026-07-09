import { cva } from "class-variance-authority";

export const focusVisibleStyles =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-color-action-focusRing)]";

export const controlVariants = cva(
  [
    "w-full rounded-[var(--primitive-radius-md)] border px-[var(--primitive-space-3)]",
    "text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)]",
    "text-[var(--semantic-color-text-primary)] transition-colors",
    "bg-[var(--semantic-color-surface-card)] border-[var(--semantic-color-surface-border)]",
    "hover:bg-[var(--primitive-color-neutral-50)]",
    "active:bg-[var(--primitive-color-neutral-100)]",
    focusVisibleStyles,
    "disabled:pointer-events-none disabled:bg-[var(--semantic-color-surface-subtle)] disabled:text-[var(--semantic-color-text-disabled)]",
  ].join(" "),
  {
    variants: {
      size: {
        md: "h-[var(--primitive-space-10)]",
        lg: "h-[var(--primitive-space-12)]",
      },
      error: {
        true: "border-[var(--semantic-color-status-danger)] hover:bg-[var(--semantic-color-surface-card)] active:bg-[var(--semantic-color-surface-card)]",
        false: "",
      },
      frozen: {
        true: [
          "border-transparent bg-[var(--semantic-color-surface-subtle)] text-[var(--semantic-color-text-disabled)]",
          "hover:bg-[var(--semantic-color-surface-subtle)] active:bg-[var(--semantic-color-surface-subtle)]",
        ].join(" "),
        false: "",
      },
    },
    defaultVariants: {
      size: "md",
      error: false,
      frozen: false,
    },
  },
);

export const textareaVariants = cva(
  [
    "w-full min-h-[calc(var(--primitive-space-10)*2)] resize-y rounded-[var(--primitive-radius-md)] border px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
    "text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)]",
    "text-[var(--semantic-color-text-primary)] transition-colors",
    "bg-[var(--semantic-color-surface-card)] border-[var(--semantic-color-surface-border)]",
    "hover:bg-[var(--primitive-color-neutral-50)]",
    "active:bg-[var(--primitive-color-neutral-100)]",
    focusVisibleStyles,
    "disabled:pointer-events-none disabled:bg-[var(--semantic-color-surface-subtle)] disabled:text-[var(--semantic-color-text-disabled)]",
  ].join(" "),
  {
    variants: {
      error: {
        true: "border-[var(--semantic-color-status-danger)] hover:bg-[var(--semantic-color-surface-card)] active:bg-[var(--semantic-color-surface-card)]",
        false: "",
      },
    },
    defaultVariants: {
      error: false,
    },
  },
);
