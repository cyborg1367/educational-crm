import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { Spinner } from "@/components/primitives/spinner";
import { cn } from "@/lib/utils";

const focusVisibleStyles =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-color-action-focusRing)]";

const disabledStyles =
  "disabled:pointer-events-none disabled:bg-[var(--semantic-color-surface-subtle)] disabled:text-[var(--semantic-color-text-disabled)]";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-[var(--semantic-space-inlineGap)] whitespace-nowrap font-[var(--primitive-font-weight-medium)] transition-colors",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    focusVisibleStyles,
    disabledStyles,
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-text-inverse)]",
          "hover:bg-[var(--semantic-color-action-primaryHover)]",
          "active:bg-[var(--primitive-color-brand-800)]",
        ].join(" "),
        secondary: [
          "bg-[var(--semantic-color-surface-subtle)] text-[var(--semantic-color-text-primary)]",
          "hover:bg-[var(--primitive-color-neutral-200)]",
          "active:bg-[var(--primitive-color-neutral-300)]",
        ].join(" "),
        ghost: [
          "bg-transparent text-[var(--semantic-color-text-primary)]",
          "hover:bg-[var(--primitive-color-neutral-100)]",
          "active:bg-[var(--primitive-color-neutral-200)]",
        ].join(" "),
        destructive: [
          "bg-[var(--semantic-color-status-danger)] text-[var(--semantic-color-text-inverse)]",
          "hover:bg-[var(--primitive-color-red-700)]",
          "active:bg-[var(--semantic-color-status-danger-strong)]",
        ].join(" "),
      },
      size: {
        sm: [
          "relative h-[var(--primitive-space-8)] min-h-[var(--primitive-space-10)]",
          "rounded-[var(--primitive-radius-md)] px-[var(--primitive-space-3)]",
          "text-[length:var(--primitive-font-size-xs)] leading-[var(--primitive-font-lineHeight-xs)]",
          "[&_svg]:size-[var(--primitive-space-4)]",
          "after:pointer-events-none after:absolute after:inset-x-0 after:-inset-y-1",
        ].join(" "),
        md: [
          "h-[var(--primitive-space-10)] rounded-[var(--primitive-radius-md)] px-[var(--primitive-space-4)]",
          "text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)]",
          "[&_svg]:size-[var(--primitive-space-5)]",
        ].join(" "),
        lg: [
          "h-[var(--primitive-space-12)] rounded-[var(--primitive-radius-md)] px-[var(--primitive-space-6)]",
          "text-[length:var(--primitive-font-size-base)] leading-[var(--primitive-font-lineHeight-base)]",
          "[&_svg]:size-[var(--primitive-space-5)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

const spinnerSizeByButtonSize = {
  sm: "sm",
  md: "md",
  lg: "lg",
} as const;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size = "md",
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const resolvedSize = size ?? "md";
    const spinnerSize = spinnerSizeByButtonSize[resolvedSize];

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Spinner
              size={spinnerSize}
              className={
                variant === "primary" || variant === "destructive"
                  ? "border-[var(--semantic-color-text-inverse)] border-t-transparent"
                  : undefined
              }
            />
            <span className="sr-only">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
