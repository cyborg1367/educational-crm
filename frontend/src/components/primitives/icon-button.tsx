import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { Spinner } from "@/components/primitives/spinner";
import { cn } from "@/lib/utils";

const focusVisibleStyles =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-color-action-focusRing)]";

const disabledStyles =
  "disabled:pointer-events-none disabled:bg-[var(--semantic-color-surface-subtle)] disabled:text-[var(--semantic-color-text-disabled)]";

const iconButtonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center transition-colors",
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
          "relative size-[var(--primitive-space-8)] min-h-[var(--primitive-space-10)] min-w-[var(--primitive-space-10)]",
          "rounded-[var(--primitive-radius-md)]",
          "[&_svg]:size-[var(--primitive-space-4)]",
          "after:pointer-events-none after:absolute after:-inset-1",
        ].join(" "),
        md: [
          "size-[var(--primitive-space-10)] rounded-[var(--primitive-radius-md)]",
          "[&_svg]:size-[var(--primitive-space-5)]",
        ].join(" "),
        lg: [
          "size-[var(--primitive-space-12)] rounded-[var(--primitive-radius-md)]",
          "[&_svg]:size-[var(--primitive-space-5)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
);

const spinnerSizeByButtonSize = {
  sm: "sm",
  md: "md",
  lg: "lg",
} as const;

type IconButtonBaseProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "aria-label"
> &
  VariantProps<typeof iconButtonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    icon: React.ReactNode;
  };

export type IconButtonProps = IconButtonBaseProps & {
  "aria-label": string;
};

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant,
      size = "md",
      asChild = false,
      loading = false,
      disabled,
      icon,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const resolvedSize = size ?? "md";
    const spinnerSize = spinnerSizeByButtonSize[resolvedSize];

    return (
      <Comp
        className={cn(iconButtonVariants({ variant, size, className }))}
        ref={ref}
        type={props.type ?? "button"}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={ariaLabel}
        {...props}
      >
        {loading ? (
          <Spinner
            size={spinnerSize}
            className={
              variant === "primary" || variant === "destructive"
                ? "border-[var(--semantic-color-text-inverse)] border-t-transparent"
                : undefined
            }
          />
        ) : (
          icon
        )}
      </Comp>
    );
  },
);
IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
