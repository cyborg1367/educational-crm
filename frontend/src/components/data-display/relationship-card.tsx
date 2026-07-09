import * as React from "react";
import { ChevronLeft } from "lucide-react";

import { focusVisibleStyles } from "@/components/form/control-styles";
import { cn } from "@/lib/utils";

const iconMirrorRtl = "scale-x-[-1]";

export type RelationshipCardProps = {
  label: string;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
};

function RelationshipCard({
  label,
  title,
  subtitle,
  href,
  onClick,
  className,
}: RelationshipCardProps) {
  const content = (
    <>
      <p className="text-[length:var(--primitive-font-size-xs)] leading-[var(--primitive-font-lineHeight-xs)] text-[var(--semantic-color-text-secondary)]">
        {label}
      </p>
      <div className="mt-[var(--primitive-space-1)] flex items-center justify-between gap-[var(--primitive-space-2)]">
        <div className="min-w-0">
          <p className="truncate text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-primary)]">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-[var(--primitive-space-1)] truncate text-[length:var(--primitive-font-size-xs)] leading-[var(--primitive-font-lineHeight-xs)] text-[var(--semantic-color-text-secondary)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {href || onClick ? (
          <ChevronLeft
            className={cn(
              "size-[var(--primitive-space-4)] shrink-0 text-[var(--semantic-color-text-disabled)]",
              iconMirrorRtl,
            )}
            aria-hidden
          />
        ) : null}
      </div>
    </>
  );

  const sharedClassName = cn(
    "block rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)]",
    "bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-4)]",
    "shadow-[var(--primitive-elevation-1)] transition-all duration-[var(--primitive-motion-duration-fast)]",
    (href || onClick) && [
      "cursor-pointer hover:border-[var(--primitive-color-brand-200)] hover:shadow-[var(--primitive-elevation-2)]",
      "active:bg-[var(--primitive-color-brand-50)]/30",
      focusVisibleStyles,
    ],
    className,
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} className={sharedClassName}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(sharedClassName, "w-full text-start")}
      >
        {content}
      </button>
    );
  }

  return <div className={sharedClassName}>{content}</div>;
}

export { RelationshipCard };
