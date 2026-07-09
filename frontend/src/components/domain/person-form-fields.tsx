"use client";

import * as React from "react";

import { FormField } from "@/components/form/form-field";
import { DatePicker } from "@/components/form/date-picker";
import { Select } from "@/components/form/select";
import { SelectionControl } from "@/components/form/selection-control";
import { currentJalaliMonth } from "@/lib/locale";
import { TextInput } from "@/components/form/text-input";
import { Textarea } from "@/components/form/textarea";
import { Divider } from "@/components/primitives/divider";
import type { ApiFieldError } from "@/lib/api/error";
import type {
  PersonCreate,
  PersonInterest,
  PersonRead,
  PersonStatus,
  PersonUpdate,
} from "@/lib/api/types";
import type { StorageDate } from "@/lib/locale/date";
import {
  GENDER_OPTIONS,
  INTERESTS_OPTIONS,
  PERSON_STATUS_OPTIONS,
  SOURCE_OPTIONS,
} from "@/lib/terminology";

const OPTIONAL_PLACEHOLDER = "انتخاب کنید";

export type PersonFormState = {
  fullName: string;
  phone: string;
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

export function personFormStateToCreateBody(
  state: PersonFormState,
): PersonCreate {
  return {
    full_name: state.fullName.trim(),
    phone: optionalString(state.phone),
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
};

function PersonFormFields({
  state,
  onChange,
  fieldError = null,
  showStatus = false,
}: PersonFormFieldsProps) {
  const toggleInterest = (value: PersonInterest, checked: boolean) => {
    onChange({
      interests: checked
        ? [...state.interests, value]
        : state.interests.filter((item) => item !== value),
    });
  };

  return (
    <div className="flex flex-col gap-[var(--primitive-space-5)]">
      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          اطلاعات شخص
        </h3>

        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-3">
          <FormField
            label="نام کامل"
            required
            className="md:col-span-2"
            error={fieldError?.field === "full_name" ? fieldError : null}
          >
            <TextInput
              value={state.fullName}
              onChange={(e) => onChange({ fullName: e.target.value })}
            />
          </FormField>

          <FormField
            label="تاریخ تولد"
            error={fieldError?.field === "birth_date" ? fieldError : null}
          >
            <DatePicker
              value={state.birthDate}
              onChange={(value) => onChange({ birthDate: value })}
              minYear={1300}
              maxYear={currentJalaliMonth().year}
            />
          </FormField>

          <FormField
            label="تلفن"
            required
            error={fieldError?.field === "phone" ? fieldError : null}
          >
            <TextInput
              value={state.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
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
      </section>

      <Divider />

      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          علاقه‌مندی‌ها
        </h3>

        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-3">
          <FormField
            label="علاقه‌مندی‌ها"
            className="md:col-span-3"
            error={fieldError?.field === "interests" ? fieldError : null}
          >
            <div className="grid grid-cols-1 gap-[var(--primitive-space-2)] sm:grid-cols-2 lg:grid-cols-3">
              {INTERESTS_OPTIONS.map((option) => (
                <SelectionControl.Checkbox
                  key={option.value}
                  label={option.label}
                  checked={state.interests.includes(option.value)}
                  onChange={(e) =>
                    toggleInterest(option.value, e.target.checked)
                  }
                />
              ))}
            </div>
          </FormField>

          <FormField
            label="توضیحات علاقه‌مندی"
            className="md:col-span-3"
            error={fieldError?.field === "interests_note" ? fieldError : null}
          >
            <Textarea
              value={state.interestsNote}
              onChange={(e) => onChange({ interestsNote: e.target.value })}
              placeholder="توضیحات بیشتر..."
              rows={3}
            />
          </FormField>

          <FormField
            label="منبع آشنایی"
            className="md:col-span-3"
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

          <FormField
            label="یادداشت"
            className="md:col-span-3"
            error={fieldError?.field === "notes" ? fieldError : null}
          >
            <Textarea
              value={state.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="یادداشت اولیه..."
              rows={3}
            />
          </FormField>
        </div>
      </section>
    </div>
  );
}

export { PersonFormFields };
