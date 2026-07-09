"use client";

import * as React from "react";

import { PersonFormFields, type PersonFormState } from "@/components/domain/person-form-fields";
import { FormDialog } from "@/components/domain/form-dialog";
import type { ApiError, ApiFieldError } from "@/lib/api/error";

export type PersonFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  state: PersonFormState;
  onChange: (patch: Partial<PersonFormState>) => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  fieldError?: ApiFieldError | null;
  formError?: ApiError | null;
  showStatus?: boolean;
};

function PersonFormDialog({
  open,
  onOpenChange,
  title,
  state,
  onChange,
  onSubmit,
  submitLabel = "ذخیره",
  submitLoading = false,
  submitDisabled = false,
  fieldError = null,
  formError = null,
  showStatus = false,
}: PersonFormDialogProps) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      submitLoading={submitLoading}
      submitDisabled={submitDisabled}
      formError={formError}
    >
      <PersonFormFields
        state={state}
        onChange={onChange}
        fieldError={fieldError}
        showStatus={showStatus}
      />
    </FormDialog>
  );
}

export { PersonFormDialog };
