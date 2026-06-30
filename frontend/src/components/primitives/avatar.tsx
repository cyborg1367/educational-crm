import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const avatarVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center overflow-hidden",
    "rounded-[var(--primitive-radius-full)]",
    "bg-[var(--primitive-color-brand-100)]",
    "text-[var(--primitive-color-brand-700)]",
    "font-[var(--primitive-font-weight-medium)]",
  ].join(" "),
  {
    variants: {
      size: {
        xs: [
          "size-[var(--primitive-space-6)]",
          "text-[length:var(--primitive-font-size-xs)] leading-none",
        ].join(" "),
        sm: [
          "size-[var(--primitive-space-8)]",
          "text-[length:var(--primitive-font-size-xs)] leading-none",
        ].join(" "),
        md: [
          "size-[var(--primitive-space-10)]",
          "text-[length:var(--primitive-font-size-sm)] leading-none",
        ].join(" "),
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface AvatarProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  name: string;
  src?: string | null;
  alt?: string;
}

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size, name, src, alt, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);
    const showImage = Boolean(src) && !imageError;
    const initials = getInitials(name);
    const imageAlt = alt ?? name;

    return (
      <span
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src!}
            alt={imageAlt}
            className="size-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </span>
    );
  },
);
Avatar.displayName = "Avatar";

export { Avatar, avatarVariants };
