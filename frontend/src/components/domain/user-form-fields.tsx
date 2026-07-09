"use client";

import * as React from "react";

import { FormField } from "@/components/form/form-field";
import { Select } from "@/components/form/select";
import { TextInput } from "@/components/form/text-input";
import type { ApiFieldError } from "@/lib/api/error";
import type { DepartmentRead, UserCreate, UserRole } from "@/lib/api/types";
import { USER_ROLE_OPTIONS } from "@/lib/terminology";

/** Roles that must be assigned to a department on the user record. */
export const DEPARTMENT_REQUIRED_ROLES: UserRole[] = ["teacher"];

export type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  departmentId: string;
};

export function emptyUserFormState(): UserFormState {
  return {
    name: "",
    email: "",
    password: "",
    role: "department_manager",
    departmentId: "",
  };
}

export function userFormStateToCreateBody(state: UserFormState): UserCreate {
  return {
    name: state.name.trim(),
    email: state.email.trim(),
    password: state.password,
    role: state.role,
    department_id: state.departmentId ? Number(state.departmentId) : null,
  };
}

export function isUserFormValid(
  state: UserFormState,
  departments: DepartmentRead[],
): boolean {
  if (!state.name.trim() || !state.email.trim() || !state.password.trim()) {
    return false;
  }
  if (
    DEPARTMENT_REQUIRED_ROLES.includes(state.role) &&
    !state.departmentId &&
    departments.length > 0
  ) {
    return false;
  }
  return true;
}

export type UserFormFieldsProps = {
  state: UserFormState;
  onChange: (patch: Partial<UserFormState>) => void;
  departments: DepartmentRead[];
  fieldError?: ApiFieldError | null;
};

function UserFormFields({
  state,
  onChange,
  departments,
  fieldError = null,
}: UserFormFieldsProps) {
  const departmentRequired = state.role === "teacher" && departments.length > 0;
  const showDepartmentManagerHint =
    state.role === "department_manager" && departments.length > 0;

  return (
    <div className="flex flex-col gap-[var(--primitive-space-5)]">
      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          اطلاعات کاربر
        </h3>

        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-2">
          <FormField
            label="نام"
            required
            error={fieldError?.field === "name" ? fieldError : null}
          >
            <TextInput
              value={state.name}
              onChange={(event) => onChange({ name: event.target.value })}
            />
          </FormField>

          <FormField
            label="ایمیل"
            required
            error={fieldError?.field === "email" ? fieldError : null}
          >
            <TextInput
              type="email"
              value={state.email}
              onChange={(event) => onChange({ email: event.target.value })}
            />
          </FormField>

          <FormField
            label="رمز عبور"
            required
            className="md:col-span-2"
            error={fieldError?.field === "password" ? fieldError : null}
          >
            <TextInput
              type="password"
              value={state.password}
              onChange={(event) => onChange({ password: event.target.value })}
              placeholder="حداقل ۸ کاراکتر"
            />
          </FormField>
        </div>
      </section>

      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          نقش و دسترسی
        </h3>

        <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-2">
          <FormField
            label="نقش"
            required
            error={fieldError?.field === "role" ? fieldError : null}
          >
            <Select
              options={USER_ROLE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              value={state.role}
              onChange={(value) => onChange({ role: value as UserRole })}
            />
          </FormField>

          <FormField
            label="دپارتمان"
            required={departmentRequired}
            error={fieldError?.field === "department_id" ? fieldError : null}
          >
            <Select
              options={departments.map((department) => ({
                value: String(department.id),
                label: department.name,
              }))}
              value={state.departmentId}
              onChange={(value) => onChange({ departmentId: value })}
              placeholder={
                departments.length === 0
                  ? "هنوز دپارتمانی ثبت نشده"
                  : state.role === "department_manager"
                    ? "اختیاری — هنگام ایجاد دپارتمان"
                    : "انتخاب دپارتمان"
              }
              disabled={departments.length === 0 && state.role === "teacher"}
            />
          </FormField>
        </div>

        {departments.length === 0 && state.role === "teacher" ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            برای نقش «مدرس» پس از تعریف دپارتمان، انتساب دپارتمان لازم است.
          </p>
        ) : null}

        {showDepartmentManagerHint ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            برای «مدیر دپارتمان» انتساب دپارتمان اختیاری است. پس از ساخت
            کاربر، در فرم «افزودن دپارتمان» همین فرد را به عنوان مدیر انتخاب
            کنید.
          </p>
        ) : null}
      </section>
    </div>
  );
}

export { UserFormFields };
