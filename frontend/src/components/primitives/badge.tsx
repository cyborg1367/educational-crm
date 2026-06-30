import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center whitespace-nowrap",
    "rounded-[var(--primitive-radius-full)]",
    "px-[var(--primitive-space-2)] py-[var(--primitive-space-1)]",
    "text-[length:var(--primitive-font-size-xs)] leading-[var(--primitive-font-lineHeight-xs)]",
    "font-[var(--primitive-font-weight-medium)]",
  ].join(" "),
  {
    variants: {
      variant: {
        neutral: [
          "bg-[var(--primitive-color-neutral-100)]",
          "text-[var(--semantic-color-text-secondary)]",
        ].join(" "),
        brand: [
          "bg-[var(--primitive-color-brand-100)]",
          "text-[var(--primitive-color-brand-700)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
