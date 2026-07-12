"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { StatusBadge } from "@/components/domain/status-badge";
import { StaleLeadIndicator } from "@/components/domain/stale-lead-indicator";
import { Badge } from "@/components/primitives/badge";
import { Avatar } from "@/components/primitives/avatar";
import type { PersonRead } from "@/lib/api/types";
import { formatDateDisplay } from "@/lib/locale";
import { formatPhoneDisplay } from "@/lib/locale/number";
import { isPersonMinor } from "@/lib/person/age";
import {
  genderLabel,
  interestLabel,
  sourceLabel,
} from "@/lib/terminology";
import { cn } from "@/lib/utils";

export type PersonProfileCardProps = {
  person: PersonRead;
  lastActivityLabel?: string | null;
  stale?: boolean;
  className?: string;
};

function ProfileField({
  label,
  value,
  full,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-[2px]", full && "col-span-full")}>
      <dt className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
        {label}
      </dt>
      <dd className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
        {value ?? "—"}
      </dd>
    </div>
  );
}

function PersonProfileCard({
  person,
  lastActivityLabel,
  stale = false,
  className,
}: PersonProfileCardProps) {
  const interests = person.interests ?? [];
  const isMinor = isPersonMinor(person.birth_date);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[var(--primitive-radius-lg)]",
        "border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)]",
        "shadow-[var(--primitive-elevation-1)]",
        className,
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-[var(--primitive-color-brand-500)] to-[var(--primitive-color-brand-300)]"
        aria-hidden
      />

      <div className="p-[var(--semantic-space-cardPadding)]">
        <div className="flex flex-col gap-[var(--primitive-space-4)] sm:flex-row sm:items-center">
          <Avatar
            name={person.full_name}
            className="size-14 shrink-0 text-[length:var(--primitive-font-size-base)]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-[var(--primitive-space-2)]">
              <h2 className="text-[length:var(--primitive-font-size-xl)] font-[var(--primitive-font-weight-semibold)] tracking-tight text-[var(--semantic-color-text-primary)]">
                {person.full_name}
              </h2>
              {stale ? <StaleLeadIndicator /> : null}
            </div>
            <div className="mt-[var(--primitive-space-2)] flex flex-wrap items-center gap-[var(--primitive-space-2)]">
              <StatusBadge domain="person" value={person.status} />
              {lastActivityLabel ? (
                <span className="inline-flex items-center gap-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                  <Clock className="size-3 shrink-0" aria-hidden />
                  آخرین فعالیت: {lastActivityLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <dl className="mt-[var(--primitive-space-4)] grid grid-cols-2 gap-x-[var(--primitive-space-4)] gap-y-[var(--primitive-space-3)] border-t border-[var(--semantic-color-surface-border)] pt-[var(--primitive-space-4)] sm:grid-cols-3">
          <ProfileField
            label="تلفن"
            value={person.phone ? formatPhoneDisplay(person.phone) : null}
          />
          {person.secondary_phone ? (
            <ProfileField
              label={isMinor ? "تلفن والد" : "تلفن دوم"}
              value={formatPhoneDisplay(person.secondary_phone)}
            />
          ) : null}
          <ProfileField label="ایمیل" value={person.email} />
          <ProfileField
            label="تاریخ تولد"
            value={
              person.birth_date
                ? formatDateDisplay(person.birth_date)
                : "ثبت نشده"
            }
          />
          <ProfileField
            label="جنسیت"
            value={person.gender ? genderLabel(person.gender) : "ثبت نشده"}
          />
          <ProfileField
            label="منبع آشنایی"
            value={person.source ? sourceLabel(person.source) : "ثبت نشده"}
          />
          {interests.length > 0 ? (
            <ProfileField
              full
              label="علاقه‌مندی‌ها"
              value={
                <span className="flex flex-wrap gap-[var(--primitive-space-1)]">
                  {interests.map((interest) => (
                    <Badge key={interest} variant="brand">
                      {interestLabel(interest)}
                    </Badge>
                  ))}
                </span>
              }
            />
          ) : null}
          {person.interests_note ? (
            <ProfileField
              full
              label="توضیحات علاقه‌مندی"
              value={person.interests_note}
            />
          ) : null}
          {person.notes ? (
            <ProfileField full label="یادداشت" value={person.notes} />
          ) : null}
        </dl>
      </div>
    </section>
  );
}

export { PersonProfileCard };
