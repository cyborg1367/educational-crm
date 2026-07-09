import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { focusVisibleStyles } from "@/components/form/control-styles";
import { cn } from "@/lib/utils";

export type BreadcrumbCrumb = {
  label: string;
  href?: string;
};

export type BreadcrumbProps = {
  crumbs: BreadcrumbCrumb[];
  className?: string;
};

/**
 * Deep-drill trail — only rendered when drill depth exceeds 2 levels
 * (3+ crumbs). Flat top-level lists never show a breadcrumb.
 */
function Breadcrumb({ crumbs, className }: BreadcrumbProps) {
  if (crumbs.length < 3) {
    return null;
  }

  return (
    <nav aria-label="مسیر ناوبری" className={cn("text-[length:var(--primitive-font-size-sm)]", className)}>
      <ol className="flex flex-wrap items-center gap-[var(--primitive-space-2)]">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li
              key={`${crumb.label}-${index}`}
              className="flex items-center gap-[var(--primitive-space-2)]"
            >
              {index > 0 ? (
                <ChevronLeft
                  className="icon-mirror-rtl size-[var(--primitive-space-4)] shrink-0 text-[var(--semantic-color-text-secondary)]"
                  aria-hidden
                />
              ) : null}

              {isLast || !crumb.href ? (
                <span
                  aria-current="page"
                  className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={cn(
                    "text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]",
                    "hover:text-[var(--semantic-color-text-primary)]",
                    focusVisibleStyles,
                    "rounded-[var(--primitive-radius-sm)]",
                  )}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumb };
