"use client";

import * as React from "react";

import { PersonFormFields, type PersonFormState } from "@/components/domain/person-form-fields";
import { ErrorState } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogPortalContainerContext } from "@/components/ui/dialog-portal-context";
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

function isPopoverTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return (
    target.closest("[data-radix-popper-content-wrapper]") != null ||
    target.closest("[data-radix-popover-content]") != null ||
    target.closest('[role="listbox"]') != null ||
    target.closest('[role="combobox"]') != null
  );
}

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
  const [portalContainer, setPortalContainer] =
    React.useState<HTMLElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortalContainerContext.Provider value={portalContainer}>
        <DialogContent
          ref={setPortalContainer}
          className="flex max-h-[min(90vh,840px)] w-[min(720px,calc(100vw-2rem))] max-w-none flex-col gap-0 p-0"
        onPointerDownOutside={(event) => {
          if (isPopoverTarget(event.target)) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (isPopoverTarget(event.target)) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="border-b border-[var(--semantic-color-surface-border)] px-[var(--primitive-space-6)] py-[var(--primitive-space-4)] text-start">
          <DialogTitle className="text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-[var(--primitive-space-6)] py-[var(--primitive-space-4)]">
          {formError ? (
            <ErrorState error={formError} className="mb-[var(--primitive-space-4)] py-[var(--primitive-space-2)]" />
          ) : null}
          <PersonFormFields
            state={state}
            onChange={onChange}
            fieldError={fieldError}
            showStatus={showStatus}
          />
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-[var(--primitive-space-3)] border-t border-[var(--semantic-color-surface-border)] px-[var(--primitive-space-6)] py-[var(--primitive-space-4)] sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitLoading}
          >
            انصراف
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onSubmit}
            loading={submitLoading}
            disabled={submitDisabled}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
      </DialogPortalContainerContext.Provider>
    </Dialog>
  );
}

export { PersonFormDialog };
