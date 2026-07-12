"use client";

import * as React from "react";
import { Check, NotebookPen, Plus, Sparkles, UserRound, X } from "lucide-react";

import { INTEREST_ICONS } from "@/components/icons/interest-icons";

import { focusVisibleStyles } from "@/components/form/control-styles";
import { FormField } from "@/components/form/form-field";
import { DatePicker } from "@/components/form/date-picker";
import { Select } from "@/components/form/select";
import { currentJalaliMonth } from "@/lib/locale";
import { TextInput } from "@/components/form/text-input";
import { Textarea } from "@/components/form/textarea";
import { Button } from "@/components/ui/button";
import type { ApiFieldError } from "@/lib/api/error";
import type {
  PersonCreate,
  PersonInterest,
  PersonRead,
  PersonStatus,
  PersonUpdate,
} from "@/lib/api/types";
import type { StorageDate } from "@/lib/locale/date";
import { isPersonMinor } from "@/lib/person/age";
import {
  GENDER_OPTIONS,
  INTERESTS_OPTIONS,
  PERSON_STATUS_OPTIONS,
  SOURCE_OPTIONS,
  interestLabel,
} from "@/lib/terminology";
import { cn } from "@/lib/utils";

const OPTIONAL_PLACEHOLDER = "انتخاب کنید";

export type PersonFormState = {
  fullName: string;
  phone: string;
  extraPhones: string[];
  email: string;
  birthDate: StorageDate | null;
  gender: string;
  interests: PersonInterest[];
  interestsNote: string;
  source: string;
  notes: string;
  status: PersonStatus;
};

export function emptyPersonFormState(): PersonFormState {
  return {
    fullName: "",
    phone: "",
    extraPhones: [],
    email: "",
    birthDate: null,
    gender: "",
    interests: [],
    interestsNote: "",
    source: "",
    notes: "",
    status: "prospect",
  };
}

export function personFormStateFromRead(person: PersonRead): PersonFormState {
  return {
    fullName: person.full_name,
    phone: person.phone ?? "",
    extraPhones: person.extra_phones ?? [],
    email: person.email ?? "",
    birthDate: person.birth_date,
    gender: person.gender ?? "",
    interests: person.interests ?? [],
    interestsNote: person.interests_note ?? "",
    source: person.source ?? "",
    notes: person.notes ?? "",
    status: person.status,
  };
}

function optionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** A minor's first extra phone doubles as the required parent/guardian
 * contact number — everything else in the form stays optional. */
export function isPersonFormValid(state: PersonFormState): boolean {
  if (!state.fullName.trim() || !state.phone.trim()) {
    return false;
  }
  if (
    isPersonMinor(state.birthDate) &&
    !state.extraPhones.some((phone) => phone.trim())
  ) {
    return false;
  }
  return true;
}

export function personFormStateToCreateBody(
  state: PersonFormState,
): PersonCreate {
  const cleanedExtraPhones = state.extraPhones
    .map((phone) => phone.trim())
    .filter(Boolean);
  return {
    full_name: state.fullName.trim(),
    phone: optionalString(state.phone),
    extra_phones: cleanedExtraPhones.length > 0 ? cleanedExtraPhones : null,
    email: optionalString(state.email),
    birth_date: state.birthDate,
    gender: state.gender ? (state.gender as PersonCreate["gender"]) : null,
    interests: state.interests.length > 0 ? state.interests : null,
    interests_note: optionalString(state.interestsNote),
    source: state.source ? (state.source as PersonCreate["source"]) : null,
    notes: optionalString(state.notes),
  };
}

export function personFormStateToUpdateBody(state: PersonFormState): PersonUpdate {
  return {
    ...personFormStateToCreateBody(state),
    status: state.status,
  };
}

export type PersonFormFieldsProps = {
  state: PersonFormState;
  onChange: (patch: Partial<PersonFormState>) => void;
  fieldError?: ApiFieldError | null;
  showStatus?: boolean;
  focusOnOpen?: boolean;
};

type FormSectionProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
};

function FormSection({
  title,
  description,
  icon,
  badge,
  headerExtra,
  children,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)]",
        "bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-5)]",
        "shadow-[var(--primitive-elevation-1)]",
        "transition-shadow duration-[var(--primitive-motion-duration-fast)]",
        "hover:shadow-[var(--primitive-elevation-2)]",
      )}
    >
      <header className="mb-[var(--primitive-space-4)] border-b border-[var(--semantic-color-surface-border)]/70 pb-[var(--primitive-space-3)]">
        <div className="flex items-start justify-between gap-[var(--primitive-space-3)]">
          <div className="flex min-w-0 items-center gap-[var(--primitive-space-3)]">
            {icon ? (
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-[var(--primitive-radius-md)]",
                  "bg-[var(--primitive-color-brand-50)] text-[var(--primitive-color-brand-600)]",
                )}
              >
                {icon}
              </div>
            ) : null}
            <div className="min-w-0">
              <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                {title}
              </h3>
              {description ? (
                <p className="mt-0.5 text-[length:var(--primitive-font-size-xs)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-secondary)]">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
        {headerExtra ? (
          <div className="mt-[var(--primitive-space-3)]">{headerExtra}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

type InterestTileProps = {
  value: PersonInterest;
  label: string;
  selected: boolean;
  onToggle: () => void;
};

function InterestTile({ value, label, selected, onToggle }: InterestTileProps) {
  const Icon = INTEREST_ICONS[value];

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col items-center gap-[var(--primitive-space-2)]",
        "rounded-[var(--primitive-radius-lg)] border p-[var(--primitive-space-4)] text-center",
        "transition-[border-color,background-color,box-shadow] duration-150 ease-out",
        focusVisibleStyles,
        selected
          ? "border-[var(--primitive-color-brand-500)] bg-[var(--primitive-color-brand-50)] shadow-[0_1px_6px_rgba(232,119,34,0.12)]"
          : "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] hover:border-[var(--primitive-color-neutral-300)] hover:bg-[var(--semantic-color-surface-subtle)]",
      )}
    >
      {selected ? (
        <span
          className={cn(
            "absolute inset-inline-end-[var(--primitive-space-2)] top-[var(--primitive-space-2)]",
            "flex size-[1.125rem] items-center justify-center rounded-[var(--primitive-radius-full)]",
            "bg-[var(--primitive-color-brand-500)] text-white",
          )}
          aria-hidden
        >
          <Check className="size-2.5 stroke-[3]" />
        </span>
      ) : null}

      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-[var(--primitive-radius-md)] p-[5px]",
          "transition-colors duration-150 ease-out",
          selected
            ? "text-[var(--primitive-color-brand-700)]"
            : "text-[var(--semantic-color-text-secondary)]",
        )}
        aria-hidden
      >
        <Icon className="size-full" />
      </span>

      <span
        className={cn(
          "text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] leading-[var(--primitive-font-lineHeight-sm)]",
          selected
            ? "text-[var(--primitive-color-brand-800)]"
            : "text-[var(--semantic-color-text-primary)]",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function SelectionBadge({
  selected,
  total,
}: {
  selected: number;
  total: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--primitive-radius-full)] px-[var(--primitive-space-3)] py-[var(--primitive-space-1)]",
        "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-semibold)] tabular-nums",
        selected > 0
          ? "bg-[var(--primitive-color-brand-100)] text-[var(--primitive-color-brand-700)]"
          : "bg-[var(--semantic-color-surface-subtle)] text-[var(--semantic-color-text-secondary)]",
      )}
    >
      {selected}/{total}
    </span>
  );
}

function SelectionSummary({ interests }: { interests: PersonInterest[] }) {
  if (interests.length === 0) {
    return null;
  }

  const labels = interests.map((value) => interestLabel(value));

  return (
    <div
      className={cn(
        "rounded-[var(--primitive-radius-md)] border border-[var(--primitive-color-brand-200)]",
        "bg-[var(--primitive-color-brand-50)]/80 px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
        "text-[length:var(--primitive-font-size-xs)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--primitive-color-brand-800)]",
      )}
    >
      <span className="font-[var(--primitive-font-weight-semibold)]">
        {interests.length} مورد انتخاب شده:
      </span>{" "}
      {labels.join("، ")}
    </div>
  );
}

function PersonFormFields({
  state,
  onChange,
  fieldError = null,
  showStatus = false,
  focusOnOpen = false,
}: PersonFormFieldsProps) {
  const fullNameRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!focusOnOpen) {
      return;
    }
    const timer = window.setTimeout(() => {
      fullNameRef.current?.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [focusOnOpen]);

  const toggleInterest = (value: PersonInterest) => {
    const checked = state.interests.includes(value);
    onChange({
      interests: checked
        ? state.interests.filter((item) => item !== value)
        : [...state.interests, value],
    });
  };

  const isMinor = isPersonMinor(state.birthDate);
  const displayedPhones =
    isMinor && state.extraPhones.length === 0 ? [""] : state.extraPhones;

  const updateExtraPhoneAt = (index: number, value: string) => {
    const next = [...state.extraPhones];
    next[index] = value;
    onChange({ extraPhones: next });
  };

  const removeExtraPhoneAt = (index: number) => {
    onChange({
      extraPhones: state.extraPhones.filter((_, i) => i !== index),
    });
  };

  const addExtraPhone = () => {
    onChange({ extraPhones: [...state.extraPhones, ""] });
  };

  return (
    <div className="flex flex-col gap-[var(--primitive-space-4)]">
      <FormSection
        title="اطلاعات شخص"
        description="فیلدهای ستاره‌دار برای ثبت اولیه الزامی هستند."
        icon={<UserRound className="size-4" aria-hidden />}
      >
        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-3">
          <FormField
            label="نام کامل"
            required
            className="md:col-span-2"
            error={fieldError?.field === "full_name" ? fieldError : null}
          >
            <TextInput
              ref={fullNameRef}
              value={state.fullName}
              onChange={(e) => onChange({ fullName: e.target.value })}
              placeholder="نام و نام خانوادگی"
            />
          </FormField>

          <FormField
            label="تاریخ تولد"
            className="md:col-span-3 lg:col-span-1"
            error={fieldError?.field === "birth_date" ? fieldError : null}
          >
            <DatePicker
              value={state.birthDate}
              onChange={(value) => onChange({ birthDate: value })}
              minYear={1300}
              maxYear={currentJalaliMonth().year}
              className="min-w-0"
            />
          </FormField>

          <FormField
            label="شماره تماس"
            required
            helperText="برای پیگیری و ارتباط با شخص استفاده می‌شود."
            error={fieldError?.field === "phone" ? fieldError : null}
          >
            <TextInput
              value={state.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              dir="ltr"
              className="text-start"
            />
          </FormField>

          <FormField
            label="ایمیل"
            error={fieldError?.field === "email" ? fieldError : null}
          >
            <TextInput
              type="email"
              value={state.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="example@email.com"
              dir="ltr"
              className="text-start"
            />
          </FormField>

          <FormField
            label="جنسیت"
            error={fieldError?.field === "gender" ? fieldError : null}
          >
            <Select
              options={GENDER_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              value={state.gender}
              onChange={(value) => onChange({ gender: value })}
              placeholder={OPTIONAL_PLACEHOLDER}
            />
          </FormField>

          <FormField
            label={isMinor ? "شماره تماس والد و سایر شماره‌ها" : "شماره‌های تماس دیگر"}
            required={isMinor}
            className="md:col-span-3"
            helperText={
              isMinor
                ? "چون سن شخص زیر ۱۸ سال است، ثبت شماره تماس والد الزامی است."
                : "در صورت وجود، شماره‌های تماس دیگر شخص را اضافه کنید."
            }
            error={fieldError?.field === "extra_phones" ? fieldError : null}
          >
            <div className="flex flex-col gap-[var(--primitive-space-2)]">
              {displayedPhones.map((phone, index) => {
                const isRequiredGuardianRow = isMinor && index === 0;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-[var(--primitive-space-2)]"
                  >
                    <TextInput
                      value={phone}
                      onChange={(e) =>
                        updateExtraPhoneAt(index, e.target.value)
                      }
                      placeholder={
                        isRequiredGuardianRow
                          ? "شماره تماس والد"
                          : "۰۹۱۲۳۴۵۶۷۸۹"
                      }
                      dir="ltr"
                      className="min-w-0 flex-1 text-start"
                    />
                    {!isRequiredGuardianRow ? (
                      <button
                        type="button"
                        onClick={() => removeExtraPhoneAt(index)}
                        aria-label="حذف شماره"
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-[var(--primitive-radius-md)]",
                          "text-[var(--semantic-color-text-secondary)] transition-colors",
                          "hover:bg-[var(--semantic-color-surface-subtle)] hover:text-[var(--semantic-color-status-danger)]",
                          focusVisibleStyles,
                        )}
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                );
              })}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addExtraPhone}
                className="self-start"
              >
                <Plus className="size-4" aria-hidden />
                افزودن شماره
              </Button>
            </div>
          </FormField>

          {showStatus ? (
            <FormField
              label="وضعیت"
              className="md:col-span-3"
              error={fieldError?.field === "status" ? fieldError : null}
            >
              <Select
                options={PERSON_STATUS_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                value={state.status}
                onChange={(value) =>
                  onChange({ status: value as PersonStatus })
                }
              />
            </FormField>
          ) : null}
        </div>
      </FormSection>

      <FormSection
        title="علاقه‌مندی‌های آموزشی"
        description="حوزه‌هایی که شخص به آن‌ها علاقه دارد."
        icon={<Sparkles className="size-4" aria-hidden />}
        badge={
          <SelectionBadge
            selected={state.interests.length}
            total={INTERESTS_OPTIONS.length}
          />
        }
        headerExtra={<SelectionSummary interests={state.interests} />}
      >
        <FormField
          label="علاقه‌مندی‌ها"
          error={fieldError?.field === "interests" ? fieldError : null}
        >
          <div className="grid grid-cols-2 gap-[var(--primitive-space-3)] sm:grid-cols-3">
            {INTERESTS_OPTIONS.map((option) => {
              const selected = state.interests.includes(option.value);
              return (
                <InterestTile
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  selected={selected}
                  onToggle={() => toggleInterest(option.value)}
                />
              );
            })}
          </div>

          {state.interests.length === 0 ? (
            <p className="mt-[var(--primitive-space-3)] text-center text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
              یک یا چند حوزه آموزشی را انتخاب کنید
            </p>
          ) : null}
        </FormField>
      </FormSection>

      <FormSection
        title="اطلاعات تکمیلی"
        description="منبع آشنایی و یادداشت‌های اولیه برای پیگیری."
        icon={<NotebookPen className="size-4" aria-hidden />}
      >
        <div className="flex flex-col gap-[var(--primitive-space-4)]">
          <FormField
            label="منبع آشنایی"
            error={fieldError?.field === "source" ? fieldError : null}
          >
            <Select
              options={SOURCE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              value={state.source}
              onChange={(value) => onChange({ source: value })}
              placeholder={OPTIONAL_PLACEHOLDER}
            />
          </FormField>

          {state.interests.length > 0 ? (
            <FormField
              label="توضیحات علاقه‌مندی"
              helperText="جزئیات بیشتر درباره حوزه‌های انتخاب‌شده"
              error={fieldError?.field === "interests_note" ? fieldError : null}
            >
              <Textarea
                value={state.interestsNote}
                onChange={(e) => onChange({ interestsNote: e.target.value })}
                placeholder="مثلاً سطح فعلی، هدف یادگیری، یا ترجیح زمان کلاس…"
                rows={3}
              />
            </FormField>
          ) : null}

          <FormField
            label="یادداشت"
            error={fieldError?.field === "notes" ? fieldError : null}
          >
            <Textarea
              value={state.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="یادداشت اولیه برای تیم…"
              rows={3}
            />
          </FormField>
        </div>
      </FormSection>
    </div>
  );
}

export { PersonFormFields };
