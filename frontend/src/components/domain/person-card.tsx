"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Clock, Mail, Phone } from "lucide-react";

import { StatusBadge } from "@/components/domain/status-badge";
import { StaleLeadIndicator } from "@/components/domain/stale-lead-indicator";
import { focusVisibleStyles } from "@/components/form/control-styles";
import { Avatar } from "@/components/primitives/avatar";
import { Spinner } from "@/components/primitives/spinner";
import { Button } from "@/components/ui/button";
import type { PaginatedResponse } from "@/components/data-display/types";
import type { PersonRead } from "@/lib/api/types";
import { formatCount, formatPhoneDisplay } from "@/lib/locale/number";
import { interestLabel, sourceLabel } from "@/lib/terminology";
import { cn } from "@/lib/utils";

const iconMirrorRtl = "scale-x-[-1]";

/** Match course-card chrome so list cards feel like one product surface. */
const BRAND_CARD = {
  headerLineClassName:
    "bg-gradient-to-l from-[var(--primitive-color-brand-500)] via-[var(--primitive-color-brand-400)] to-[#2563EB]",
  shellClassName: cn(
    "relative overflow-hidden rounded-[var(--primitive-radius-lg)]",
    "border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)]/95",
    "shadow-[var(--primitive-elevation-1)] transition-all duration-[var(--primitive-motion-duration-base)]",
    "hover:-translate-y-0.5 hover:shadow-[var(--primitive-elevation-2)]",
  ),
  headerBoxClassName:
    "rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)]/70 bg-[color-mix(in_srgb,var(--semantic-color-surface-subtle)_75%,white)] px-[var(--primitive-space-3)] py-[var(--primitive-space-3)]",
  metricClassName:
    "rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)]/75 bg-[var(--semantic-color-surface-subtle)]/80 px-[var(--primitive-space-2)] py-[var(--primitive-space-2)]",
  chipBoxClassName:
    "border-[var(--primitive-color-brand-200)]/80 bg-[var(--primitive-color-brand-50)]/70",
  chipClassName:
    "border-[var(--primitive-color-brand-200)] bg-[var(--semantic-color-surface-card)] text-[var(--primitive-color-brand-700)]",
} as const;

function PersonMetaMetric({
  icon: Icon,
  label,
  value,
  valueDir,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueDir?: "ltr" | "rtl";
}) {
  return (
    <div className={BRAND_CARD.metricClassName}>
      <div className="flex items-center gap-[var(--primitive-space-2)]">
        <Icon className="size-3.5 shrink-0 text-[var(--semantic-color-text-secondary)]" />
        <p className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
          {label}
        </p>
      </div>
      <p
        className="mt-1 truncate text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]"
        dir={valueDir}
      >
        {value}
      </p>
    </div>
  );
}

export type PersonCardProps = {
  person: PersonRead;
  href: string;
  lastActivityLabel?: string | null;
  stale?: boolean;
  className?: string;
};

function PersonCard({
  person,
  href,
  lastActivityLabel,
  stale = false,
  className,
}: PersonCardProps) {
  const interests = person.interests ?? [];
  const visibleInterests = interests.slice(0, 3);
  const hiddenInterestCount = interests.length - visibleInterests.length;
  const phoneDisplay = person.phone ? formatPhoneDisplay(person.phone) : null;

  return (
    <Link
      href={href}
      className={cn(
        "group block h-full",
        BRAND_CARD.shellClassName,
        focusVisibleStyles,
        className,
      )}
    >
      <div
        className={cn("absolute inset-x-0 top-0 h-0.5", BRAND_CARD.headerLineClassName)}
        aria-hidden
      />

      <div className="flex h-full flex-col p-[var(--semantic-space-cardPadding)]">
        <div className={BRAND_CARD.headerBoxClassName}>
          <div className="flex items-start justify-between gap-[var(--primitive-space-3)]">
            <div className="flex min-w-0 items-center gap-[var(--primitive-space-3)]">
              <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--primitive-radius-lg)] bg-[var(--semantic-color-surface-card)] shadow-[var(--primitive-elevation-1)] ring-1 ring-[var(--semantic-color-surface-border)]">
                <Avatar
                  name={person.full_name}
                  className="size-full rounded-none text-[length:var(--primitive-font-size-base)]"
                />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-[var(--primitive-space-2)]">
                  <p className="truncate text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                    {person.full_name}
                  </p>
                  {stale ? <StaleLeadIndicator /> : null}
                </div>
                <p className="mt-1 truncate text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                  {person.source
                    ? `منبع: ${sourceLabel(person.source)}`
                    : "دانش‌پذیر"}
                </p>
              </div>
            </div>
            <StatusBadge domain="person" value={person.status} />
          </div>
        </div>

        <div className="mt-[var(--primitive-space-3)] grid grid-cols-1 gap-[var(--primitive-space-2)] sm:grid-cols-2">
          <PersonMetaMetric
            icon={Phone}
            label="شماره تماس"
            value={phoneDisplay ?? "—"}
          />
          <PersonMetaMetric
            icon={Mail}
            label="ایمیل"
            value={person.email?.trim() ? person.email : "—"}
            valueDir={person.email ? "ltr" : undefined}
          />
        </div>

        <div
          className={cn(
            "mt-[var(--primitive-space-3)] rounded-[var(--primitive-radius-md)] border px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
            BRAND_CARD.chipBoxClassName,
          )}
        >
          <p className="mb-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--primitive-color-brand-700)]">
            علاقه‌مندی‌ها
          </p>
          {visibleInterests.length > 0 ? (
            <div className="flex flex-wrap gap-[var(--primitive-space-2)]">
              {visibleInterests.map((interest) => (
                <span
                  key={interest}
                  className={cn(
                    "rounded-[var(--primitive-radius-full)] border px-[var(--primitive-space-2)] py-0.5 text-[length:var(--primitive-font-size-xs)]",
                    BRAND_CARD.chipClassName,
                  )}
                >
                  {interestLabel(interest)}
                </span>
              ))}
              {hiddenInterestCount > 0 ? (
                <span className="rounded-[var(--primitive-radius-full)] px-[var(--primitive-space-2)] py-0.5 text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-disabled)]">
                  +{formatCount(hiddenInterestCount)}
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
              علاقه‌ای ثبت نشده است.
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-[var(--primitive-space-2)] border-t border-[var(--semantic-color-surface-border)] pt-[var(--primitive-space-3)]">
          <span className="inline-flex min-w-0 items-center gap-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
            <Clock className="size-3 shrink-0 opacity-60" aria-hidden />
            <span className="truncate">
              {lastActivityLabel
                ? `آخرین فعالیت ${lastActivityLabel}`
                : "بدون فعالیت"}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-action-primary)]">
            مشاهده
            <ChevronLeft className={cn(iconMirrorRtl, "size-3.5")} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

function formatPaginationRange(
  offset: number,
  pageSize: number,
  total: number,
): string {
  if (total === 0) {
    return "موردی یافت نشد";
  }
  const start = offset + 1;
  const end = Math.min(offset + pageSize, total);
  return `${formatCount(start)}–${formatCount(end)} از ${formatCount(total)}`;
}

export type PersonCardGridProps = {
  people: PersonRead[];
  data: PaginatedResponse<PersonRead>;
  loading?: boolean;
  lastActivityByPerson: Map<number, string>;
  formatLastActivity: (iso: string) => string;
  isStaleLead: (status: PersonRead["status"], lastActivity?: string) => boolean;
  onPageChange?: (offset: number) => void;
  emptyMessage?: string;
  className?: string;
};

function PersonCardGrid({
  people,
  data,
  loading = false,
  lastActivityByPerson,
  formatLastActivity,
  isStaleLead,
  onPageChange,
  emptyMessage = "موردی یافت نشد",
  className,
}: PersonCardGridProps) {
  const canGoPrev = data.offset > 0;
  const canGoNext = data.has_more;
  const showPagination = Boolean(onPageChange) && data.total_count > data.limit;

  return (
    <div className={className}>
      {loading && people.length === 0 ? (
        <div className="flex justify-center py-[var(--primitive-space-10)]">
          <Spinner size="md" />
        </div>
      ) : people.length === 0 ? (
        <p className="py-[var(--primitive-space-10)] text-center text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] sm:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => {
            const lastActivity = lastActivityByPerson.get(person.id);
            return (
              <PersonCard
                key={person.id}
                person={person}
                href={`/people/${person.id}`}
                lastActivityLabel={
                  lastActivity ? formatLastActivity(lastActivity) : null
                }
                stale={isStaleLead(person.status, lastActivity)}
              />
            );
          })}
        </div>
      )}

      {showPagination ? (
        <div className="mt-[var(--primitive-space-4)] flex flex-wrap items-center justify-between gap-[var(--primitive-space-3)]">
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            {loading ? (
              <span className="inline-flex items-center gap-[var(--primitive-space-2)]">
                <Spinner size="sm" />
              </span>
            ) : (
              formatPaginationRange(data.offset, people.length, data.total_count)
            )}
          </p>
          <div className="flex items-center gap-[var(--primitive-space-2)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canGoPrev || loading}
              onClick={() => onPageChange?.(data.offset - data.limit)}
            >
              قبلی
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canGoNext || loading}
              onClick={() => onPageChange?.(data.offset + data.limit)}
            >
              بعدی
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { PersonCard, PersonCardGrid };
