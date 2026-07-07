"use client";

import * as React from "react";

import { FormDialog } from "@/components/domain/form-dialog";
import {
  ClassFormFields,
  type ClassFormState,
} from "@/components/domain/class-form-fields";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import type { CourseRead, UserRead } from "@/lib/api/types";

export type ClassFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  title: string;
  submitLabel: string;
  state: ClassFormState;
  onChange: (patch: Partial<ClassFormState>) => void;
  courses: CourseRead[];
  teachers: UserRead[];
  selectedCourse: CourseRead | null;
  onSubmit: () => void;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  formError?: ApiError | null;
  fieldError?: ApiFieldError | null;
};

function ClassFormDialog({
  open,
  onOpenChange,
  mode,
  title,
  submitLabel,
  state,
  onChange,
  courses,
  teachers,
  selectedCourse,
  onSubmit,
  submitLoading = false,
  submitDisabled = false,
  formError = null,
  fieldError = null,
}: ClassFormDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      submitLoading={submitLoading}
      submitDisabled={submitDisabled}
      formError={formError}
    >
      <ClassFormFields
        mode={mode}
        state={state}
        onChange={onChange}
        courses={courses}
        teachers={teachers}
        selectedCourse={selectedCourse}
        fieldError={fieldError}
      />
    </FormDialog>
  );
}

export { ClassFormDialog };
