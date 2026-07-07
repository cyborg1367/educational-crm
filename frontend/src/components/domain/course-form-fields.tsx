"use client";

import * as React from "react";

import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { Checkbox } from "@/components/form/selection-control";
import { Select } from "@/components/form/select";
import { Textarea } from "@/components/form/textarea";
import { TextInput } from "@/components/form/text-input";
import type { ApiFieldError } from "@/lib/api/error";
import type { CourseCreate, CourseRead, CourseUpdate, DepartmentRead } from "@/lib/api/types";
import { sortDepartmentsByInstituteCatalog } from "@/lib/department/institute-departments";

import { formatCount } from "@/lib/locale";

export type CourseFormState = {
  title: string;
  departmentId: string;
  price: number | null;
  durationSessions: string;
  totalHours: string;
  sessionDuration: string;
  sessionsPerWeek: string;
  description: string;
  isActive: boolean;
};

export function emptyCourseFormState(
  departments: DepartmentRead[] = [],
): CourseFormState {
  const sorted = sortDepartmentsByInstituteCatalog(
    departments.filter((department) => department.is_active),
  );
  return {
    title: "",
    departmentId: sorted[0] ? String(sorted[0].id) : "",
    price: null,
    durationSessions: "",
    totalHours: "",
    sessionDuration: "",
    sessionsPerWeek: "",
    description: "",
    isActive: true,
  };
}

export function courseFormStateToCreateBody(state: CourseFormState): CourseCreate {
  return {
    title: state.title.trim(),
    department_id: Number(state.departmentId),
    current_price: state.price ?? 0,
    duration_sessions: state.durationSessions
      ? Number(state.durationSessions)
      : null,
    total_hours: state.totalHours ? Number(state.totalHours) : null,
    session_duration: state.sessionDuration
      ? Number(state.sessionDuration)
      : null,
    sessions_per_week: state.sessionsPerWeek
      ? Number(state.sessionsPerWeek)
      : null,
    description: state.description.trim() || null,
    is_active: state.isActive,
  };
}

export function courseFormStateFromRead(course: CourseRead): CourseFormState {
  return {
    title: course.title,
    departmentId: String(course.department_id),
    price: course.current_price,
    durationSessions:
      course.duration_sessions != null ? String(course.duration_sessions) : "",
    totalHours: course.total_hours != null ? String(course.total_hours) : "",
    sessionDuration:
      course.session_duration != null ? String(course.session_duration) : "",
    sessionsPerWeek:
      course.sessions_per_week != null ? String(course.sessions_per_week) : "",
    description: course.description ?? "",
    isActive: course.is_active,
  };
}

export function courseFormStateToUpdateBody(
  state: CourseFormState,
): CourseUpdate {
  return courseFormStateToCreateBody(state);
}

export function isCourseFormValid(state: CourseFormState): boolean {
  return (
    Boolean(state.title.trim()) &&
    Boolean(state.departmentId) &&
    state.price != null &&
    state.price > 0
  );
}

export function computeCourseScheduleSummary(state: CourseFormState): {
  totalSessions: number;
  weeks: number;
} | null {
  const totalHours = Number(state.totalHours);
  const sessionDuration = Number(state.sessionDuration);
  const sessionsPerWeek = Number(state.sessionsPerWeek);
  if (
    !state.totalHours ||
    !state.sessionDuration ||
    !state.sessionsPerWeek ||
    !Number.isFinite(totalHours) ||
    !Number.isFinite(sessionDuration) ||
    !Number.isFinite(sessionsPerWeek) ||
    totalHours <= 0 ||
    sessionDuration <= 0 ||
    sessionsPerWeek <= 0
  ) {
    return null;
  }
  const totalSessions = Math.ceil(totalHours / sessionDuration);
  const weeks = Math.ceil(totalSessions / sessionsPerWeek);
  return { totalSessions, weeks };
}

export type CourseFormFieldsProps = {
  state: CourseFormState;
  onChange: (patch: Partial<CourseFormState>) => void;
  departments: DepartmentRead[];
  fieldError?: ApiFieldError | null;
};

function CourseFormFields({
  state,
  onChange,
  departments,
  fieldError = null,
}: CourseFormFieldsProps) {
  const departmentOptions = sortDepartmentsByInstituteCatalog(
    departments.filter(
      (department) =>
        department.is_active || String(department.id) === state.departmentId,
    ),
  ).map((department) => ({
    value: String(department.id),
    label: department.name,
  }));

  const scheduleSummary = computeCourseScheduleSummary(state);

  return (
    <div className="flex flex-col gap-[var(--primitive-space-5)]">
      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          اطلاعات دوره
        </h3>

        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-2">
          <FormField
            label="عنوان"
            required
            className="md:col-span-2"
            error={fieldError?.field === "title" ? fieldError : null}
          >
            <TextInput
              value={state.title}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="مثلاً Python مقدماتی"
            />
          </FormField>

          <FormField
            label="دپارتمان"
            required
            error={fieldError?.field === "department_id" ? fieldError : null}
          >
            <Select
              options={departmentOptions}
              value={state.departmentId}
              onChange={(value) => onChange({ departmentId: value })}
              placeholder={
                departmentOptions.length === 0
                  ? "ابتدا دپارتمان تعریف کنید"
                  : "انتخاب دپارتمان"
              }
              disabled={departmentOptions.length === 0}
            />
          </FormField>

          <FormField
            label="تعداد جلسات"
            error={fieldError?.field === "duration_sessions" ? fieldError : null}
          >
            <TextInput
              type="number"
              min={1}
              value={state.durationSessions}
              onChange={(event) =>
                onChange({ durationSessions: event.target.value })
              }
              placeholder="اختیاری"
            />
          </FormField>
        </div>

        {departmentOptions.length === 0 ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            برای ثبت دوره، ابتدا از منوی دپارتمان‌ها حداقل یک دپارتمان فعال
            بسازید.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          برنامه زمانی
        </h3>

        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-2">
          <FormField
            label="کل ساعت دوره"
            error={fieldError?.field === "total_hours" ? fieldError : null}
          >
            <TextInput
              type="number"
              min={1}
              value={state.totalHours}
              onChange={(event) => onChange({ totalHours: event.target.value })}
              placeholder="مثلاً ۴۸"
            />
          </FormField>

          <FormField
            label="مدت هر جلسه"
            error={fieldError?.field === "session_duration" ? fieldError : null}
          >
            <div className="relative">
              <TextInput
                type="number"
                min={0.5}
                step={0.5}
                value={state.sessionDuration}
                onChange={(event) =>
                  onChange({ sessionDuration: event.target.value })
                }
                placeholder="مثلاً ۱.۵ ساعت"
                className="pe-[var(--primitive-space-14)]"
              />
              <span className="pointer-events-none absolute end-[var(--primitive-space-3)] top-1/2 -translate-y-1/2 text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                ساعت
              </span>
            </div>
          </FormField>

          <FormField
            label="جلسات در هفته"
            error={fieldError?.field === "sessions_per_week" ? fieldError : null}
          >
            <TextInput
              type="number"
              min={1}
              value={state.sessionsPerWeek}
              onChange={(event) =>
                onChange({ sessionsPerWeek: event.target.value })
              }
              placeholder="مثلاً ۲"
            />
          </FormField>
        </div>

        {scheduleSummary ? (
          <div className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)] px-[var(--primitive-space-4)] py-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            <p>
              تعداد کل جلسات:{" "}
              <span className="font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                {formatCount(scheduleSummary.totalSessions)} جلسه
              </span>
            </p>
            <p className="mt-[var(--primitive-space-1)]">
              مدت دوره:{" "}
              <span className="font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                حدود {formatCount(scheduleSummary.weeks)} هفته
              </span>
            </p>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          قیمت و وضعیت
        </h3>

        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-2">
          <FormField
            label="قیمت (تومان)"
            required
            error={fieldError?.field === "current_price" ? fieldError : null}
          >
            <MoneyInput
              value={state.price}
              onValueChange={(value) => onChange({ price: value })}
            />
          </FormField>

          <FormField label="وضعیت">
            <Checkbox
              label="فعال"
              checked={state.isActive}
              onChange={(event) => onChange({ isActive: event.target.checked })}
            />
          </FormField>
        </div>
      </section>

      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          توضیحات
        </h3>

        <FormField
          label="توضیحات دوره"
          error={fieldError?.field === "description" ? fieldError : null}
        >
          <Textarea
            value={state.description}
            onChange={(event) => onChange({ description: event.target.value })}
            rows={4}
            placeholder="اختیاری"
          />
        </FormField>
      </section>
    </div>
  );
}

export { CourseFormFields };
