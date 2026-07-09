import * as React from "react";

import { Divider } from "@/components/primitives/divider";
import { focusVisibleStyles } from "@/components/form/control-styles";
import { cn } from "@/lib/utils";

export type EntitySummaryCardVariant = "person" | "enrollment" | "class";

export type EntitySummaryCardProps = {
  variant?: EntitySummaryCardVariant;
  /** Leading visual — typically Avatar for person, icon for class. */
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  meta?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
};

function EntitySummaryCardShell({
  href,
  onClick,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const interactive = Boolean(href || onClick);
  const sharedClassName = cn(
    "block rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)]",
    "bg-[var(--semantic-color-surface-card)] p-[var(--semantic-space-cardPadding)]",
    "shadow-[var(--primitive-elevation-1)] transition-all duration-[var(--primitive-motion-duration-fast)]",
    interactive && [
      "cursor-pointer hover:border-[var(--primitive-color-neutral-300)] hover:shadow-[var(--primitive-elevation-2)]",
      "active:bg-[var(--primitive-color-neutral-50)]",
      focusVisibleStyles,
    ],
    className,
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} className={sharedClassName}>
        {children}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(sharedClassName, "w-full text-start")}>
        {children}
      </button>
    );
  }

  return <div className={sharedClassName}>{children}</div>;
}

function EntitySummaryCard({
  variant,
  leading,
  title,
  subtitle,
  badges,
  meta,
  footer,
  children,
  href,
  onClick,
  className,
}: EntitySummaryCardProps) {
  return (
    <EntitySummaryCardShell
      href={href}
      onClick={onClick}
      className={className}
      data-entity-variant={variant}
    >
      <div className="flex gap-[var(--primitive-space-3)]">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-[var(--primitive-space-2)]">
            <div className="min-w-0">
              <p className="truncate text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-medium)] leading-[var(--primitive-font-lineHeight-base)] text-[var(--semantic-color-text-primary)]">
                {title}
              </p>
              {subtitle ? (
                <p className="mt-[var(--primitive-space-1)] truncate text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-secondary)]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {badges ? (
              <div className="flex shrink-0 flex-wrap items-center gap-[var(--primitive-space-1)]">
                {badges}
              </div>
            ) : null}
          </div>
          {meta ? (
            <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-xs)] leading-[var(--primitive-font-lineHeight-xs)] text-[var(--semantic-color-text-secondary)]">
              {meta}
            </p>
          ) : null}
        </div>
      </div>
      {children ? (
        <>
          <Divider className="my-[var(--primitive-space-3)]" />
          <div>{children}</div>
        </>
      ) : null}
      {footer ? (
        <div className="mt-[var(--primitive-space-3)]">{footer}</div>
      ) : null}
    </EntitySummaryCardShell>
  );
}

export { EntitySummaryCard };
