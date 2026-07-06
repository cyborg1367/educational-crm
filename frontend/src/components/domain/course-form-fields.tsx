"use client";

import * as React from "react";

import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { Checkbox } from "@/components/form/selection-control";
import { Select } from "@/components/form/select";
import { Textarea } from "@/components/form/textarea";
import { TextInput } from "@/components/form/text-input";
import type { ApiFieldError } from "@/lib/api/error";
import type { CourseCreate, DepartmentRead } from "@/lib/api/types";
import { sortDepartmentsByInstituteCatalog } from "@/lib/department/institute-departments";

export type CourseFormState = {
  title: string;
  departmentId: string;
  price: number | null;
  durationSessions: string;
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
    description: state.description.trim() || null,
    is_active: state.isActive,
  };
}

export function isCourseFormValid(state: CourseFormState): boolean {
  return (
    Boolean(state.title.trim()) &&
    Boolean(state.departmentId) &&
    state.price != null &&
    state.price > 0
  );
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
    departments.filter((department) => department.is_active),
  ).map((department) => ({
    value: String(department.id),
    label: department.name,
  }));

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
