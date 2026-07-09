"use client";

import * as React from "react";

import { FormField } from "@/components/form/form-field";
import { Checkbox } from "@/components/form/selection-control";
import { Select } from "@/components/form/select";
import { TextInput } from "@/components/form/text-input";
import type { ApiFieldError } from "@/lib/api/error";
import type { DepartmentRead, RoadmapCreate } from "@/lib/api/types";
import { sortDepartmentsByInstituteCatalog } from "@/lib/department/institute-departments";

export type RoadmapFormState = {
  name: string;
  departmentId: string;
  isActive: boolean;
};

export function emptyRoadmapFormState(
  departments: DepartmentRead[] = [],
): RoadmapFormState {
  const sorted = sortDepartmentsByInstituteCatalog(
    departments.filter((department) => department.is_active),
  );
  const first = sorted[0];
  return {
    name: first ? suggestedRoadmapName(first.name) : "",
    departmentId: first ? String(first.id) : "",
    isActive: true,
  };
}

export function suggestedRoadmapName(departmentName: string): string {
  if (departmentName.includes("هوش مصنوعی")) {
    return "مسیر هوش مصنوعی";
  }
  if (departmentName.includes("فناوری") || departmentName.includes("اطلاعات")) {
    return "مسیر کامل برنامه‌نویسی";
  }
  if (departmentName.includes("زبان") && departmentName.includes("کودکان")) {
    return "مسیر زبان کودکان";
  }
  if (departmentName.includes("زبان")) {
    return "مسیر زبان بزرگسال";
  }
  if (departmentName.includes("مالی")) {
    return "مسیر علوم مالی";
  }
  const cleaned = departmentName.replace(/^دپارتمان\s*/, "").trim();
  return cleaned ? `مسیر ${cleaned}` : "مسیر آموزشی";
}

export function isRoadmapFormValid(state: RoadmapFormState): boolean {
  return Boolean(state.name.trim()) && Boolean(state.departmentId);
}

export function roadmapFormStateToCreateBody(
  state: RoadmapFormState,
): RoadmapCreate {
  return {
    name: state.name.trim(),
    department_id: Number(state.departmentId),
    is_active: state.isActive,
  };
}

export type RoadmapFormFieldsProps = {
  state: RoadmapFormState;
  onChange: (patch: Partial<RoadmapFormState>) => void;
  departments: DepartmentRead[];
  fieldError?: ApiFieldError | null;
};

function RoadmapFormFields({
  state,
  onChange,
  departments,
  fieldError = null,
}: RoadmapFormFieldsProps) {
  const activeDepartments = sortDepartmentsByInstituteCatalog(
    departments.filter(
      (department) =>
        department.is_active || String(department.id) === state.departmentId,
    ),
  );

  const departmentOptions = activeDepartments.map((department) => ({
    value: String(department.id),
    label: department.name,
  }));

  const selectedDepartment = activeDepartments.find(
    (department) => String(department.id) === state.departmentId,
  );
  const namePlaceholder = selectedDepartment
    ? suggestedRoadmapName(selectedDepartment.name)
    : "مثلاً مسیر کامل برنامه‌نویسی";

  const handleDepartmentChange = (value: string) => {
    const department = activeDepartments.find(
      (item) => String(item.id) === value,
    );
    const suggestion = department
      ? suggestedRoadmapName(department.name)
      : "";
    const shouldAutofillName =
      !state.name.trim() ||
      (selectedDepartment != null &&
        state.name.trim() === suggestedRoadmapName(selectedDepartment.name));

    onChange({
      departmentId: value,
      ...(shouldAutofillName && suggestion ? { name: suggestion } : {}),
    });
  };

  return (
    <div className="flex flex-col gap-[var(--primitive-space-5)]">
      <section className="flex flex-col gap-[var(--primitive-space-4)]">
        <h3 className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          اطلاعات نقشه‌راه
        </h3>

        <FormField
          label="دپارتمان"
          required
          error={fieldError?.field === "department_id" ? fieldError : null}
        >
          <Select
            options={departmentOptions}
            value={state.departmentId}
            onChange={handleDepartmentChange}
            placeholder={
              departmentOptions.length === 0
                ? "ابتدا دپارتمان تعریف کنید"
                : "انتخاب دپارتمان"
            }
            disabled={departmentOptions.length === 0}
          />
        </FormField>

        <FormField
          label="نام نقشه‌راه"
          required
          error={fieldError?.field === "name" ? fieldError : null}
        >
          <TextInput
            value={state.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder={namePlaceholder}
          />
        </FormField>

        {departmentOptions.length === 0 ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            برای ثبت نقشه‌راه، ابتدا از منوی دپارتمان‌ها حداقل یک دپارتمان فعال
            بسازید.
          </p>
        ) : (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            این نقشه‌راه مسیر پیشنهادی دوره‌ها برای افراد همان دپارتمان خواهد بود.
            بعد از ثبت می‌توانید مراحل را اضافه کنید.
          </p>
        )}

        <Checkbox
          label="نقشه‌راه فعال باشد"
          checked={state.isActive}
          onChange={(event) => onChange({ isActive: event.target.checked })}
        />
      </section>
    </div>
  );
}

export { RoadmapFormFields };
