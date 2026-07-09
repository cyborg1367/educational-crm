"use client";

import * as React from "react";
import { UserPlus } from "lucide-react";

import { PersonFormFields, type PersonFormState } from "@/components/domain/person-form-fields";
import { FormDialog } from "@/components/domain/form-dialog";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { cn } from "@/lib/utils";

export type PersonFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
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

function personInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 1);
  }
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`;
}

function PersonAvatarPreview({ fullName }: { fullName: string }) {
  const initials = personInitials(fullName);

  return (
    <div
      className={cn(
        "flex size-11 items-center justify-center rounded-[var(--primitive-radius-full)]",
        "border border-[var(--primitive-color-brand-200)] bg-gradient-to-br from-[var(--primitive-color-brand-50)] to-[var(--primitive-color-brand-100)]",
        "text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--primitive-color-brand-700)]",
        "shadow-[0_2px_8px_rgba(232,119,34,0.12)]",
        "transition-all duration-[var(--primitive-motion-duration-base)]",
      )}
      aria-hidden
    >
      {initials ? (
        initials
      ) : (
        <UserPlus className="size-5 text-[var(--primitive-color-brand-600)]" />
      )}
    </div>
  );
}

function RequiredFieldsProgress({
  filled,
  total,
}: {
  filled: number;
  total: number;
}) {
  const complete = filled >= total;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-[var(--primitive-space-2)] rounded-[var(--primitive-radius-full)]",
        "border px-[var(--primitive-space-3)] py-[var(--primitive-space-1)]",
        "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)]",
        complete
          ? "border-[var(--semantic-color-status-success)]/30 bg-[var(--semantic-color-status-success)]/8 text-[var(--semantic-color-status-success)]"
          : "border-[var(--primitive-color-brand-200)] bg-[var(--semantic-color-surface-card)]/80 text-[var(--semantic-color-text-secondary)]",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          complete
            ? "bg-[var(--semantic-color-status-success)]"
            : "bg-[var(--primitive-color-brand-500)]",
        )}
        aria-hidden
      />
      {complete
        ? "فیلدهای الزامی تکمیل شد"
        : `${filled} از ${total} فیلد الزامی`}
    </div>
  );
}

function PersonFormDialog({
  open,
  onOpenChange,
  title,
  description,
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
  const resolvedDescription =
    description ??
    (showStatus
      ? "ویرایش اطلاعات تماس و علاقه‌مندی‌های شخص."
      : "اطلاعات تماس و علاقه‌مندی‌های شخص جدید را وارد کنید.");

  const requiredFilled = [
    state.fullName.trim().length > 0,
    state.phone.trim().length > 0,
  ].filter(Boolean).length;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={resolvedDescription}
      headerAdornment={<PersonAvatarPreview fullName={state.fullName} />}
      headerExtra={
        showStatus ? null : (
          <RequiredFieldsProgress filled={requiredFilled} total={2} />
        )
      }
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
        focusOnOpen={open}
      />
    </FormDialog>
  );
}

export { PersonFormDialog };
