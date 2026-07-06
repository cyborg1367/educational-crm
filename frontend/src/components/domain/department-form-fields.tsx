"use client";

import * as React from "react";

import { FormField } from "@/components/form/form-field";
import { Checkbox } from "@/components/form/selection-control";
import { Select } from "@/components/form/select";
import type { ApiFieldError } from "@/lib/api/error";
import {
  INSTITUTE_DEPARTMENT_NAMES,
  type InstituteDepartmentName,
} from "@/lib/department/institute-departments";
import type { DepartmentCreate, UserRead } from "@/lib/api/types";

export type DepartmentFormState = {
  name: string;
  managerId: string;
  isActive: boolean;
};

export function emptyDepartmentFormState(): DepartmentFormState {
  return {
    name: "",
    managerId: "",
    isActive: true,
  };
}

export function departmentFormStateToCreateBody(
  state: DepartmentFormState,
): DepartmentCreate {
  return {
    name: state.name.trim(),
    manager_id: state.managerId ? Number(state.managerId) : null,
    is_active: state.isActive,
  };
}

export type DepartmentFormFieldsProps = {
  state: DepartmentFormState;
  onChange: (patch: Partial<DepartmentFormState>) => void;
  managerOptions: UserRead[];
  availableNames?: InstituteDepartmentName[];
  fieldError?: ApiFieldError | null;
};

function DepartmentFormFields({
  state,
  onChange,
  managerOptions,
  availableNames = [...INSTITUTE_DEPARTMENT_NAMES],
  fieldError = null,
}: DepartmentFormFieldsProps) {
  const nameOptions = availableNames.map((name) => ({
    value: name,
    label: name,
  }));

  return (
    <div className="flex flex-col gap-[var(--primitive-space-5)]">
      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          اطلاعات دپارتمان
        </h3>

        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-2">
          <FormField
            label="نام دپارتمان"
            required
            error={fieldError?.field === "name" ? fieldError : null}
          >
            <Select
              options={nameOptions}
              value={state.name}
              onChange={(value) => onChange({ name: value })}
              placeholder={
                nameOptions.length === 0
                  ? "همه دپارتمان‌ها ثبت شده‌اند"
                  : "انتخاب دپارتمان"
              }
              disabled={nameOptions.length === 0}
            />
          </FormField>

          <FormField
            label="مدیر"
            error={fieldError?.field === "manager_id" ? fieldError : null}
          >
            <Select
              options={managerOptions.map((user) => ({
                value: String(user.id),
                label: `${user.name} (${user.role})`,
              }))}
              value={state.managerId}
              onChange={(value) => onChange({ managerId: value })}
              placeholder={
                managerOptions.length === 0
                  ? "ابتدا کاربر با نقش مدیر بسازید"
                  : "انتخاب مدیر"
              }
              disabled={managerOptions.length === 0}
            />
          </FormField>

          <FormField label="وضعیت" className="md:col-span-2">
            <Checkbox
              label="فعال"
              checked={state.isActive}
              onChange={(event) => onChange({ isActive: event.target.checked })}
            />
          </FormField>
        </div>

        {nameOptions.length === 0 ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            هر پنج دپارتمان سازمان ثبت شده است.
          </p>
        ) : null}

        {managerOptions.length === 0 ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            برای تعیین مدیر، از بخش «کاربران و نقش‌ها» یک کاربر با نقش مدیر
            دپارتمان یا مدیر سیستم بسازید. می‌توانید دپارتمان را بدون مدیر هم
            ثبت کنید و بعداً مدیر را اختصاص دهید.
          </p>
        ) : null}
      </section>
    </div>
  );
}

export { DepartmentFormFields };
