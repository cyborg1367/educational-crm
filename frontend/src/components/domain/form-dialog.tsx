"use client";

import * as React from "react";

import { ErrorState } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogPortalContainerContext } from "@/components/ui/dialog-portal-context";
import type { ApiError } from "@/lib/api/error";
import { cn } from "@/lib/utils";

export type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  headerAdornment?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  formError?: ApiError | null;
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

function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  headerAdornment,
  headerExtra,
  children,
  onSubmit,
  submitLabel = "ذخیره",
  cancelLabel = "انصراف",
  submitLoading = false,
  submitDisabled = false,
  formError = null,
}: FormDialogProps) {
  const [portalContainer, setPortalContainer] =
    React.useState<HTMLElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortalContainerContext.Provider value={portalContainer}>
        <DialogContent
          ref={setPortalContainer}
          hideClose
          className={cn(
            "form-dialog-content flex max-h-[min(90vh,840px)] w-[min(640px,calc(100vw-2rem))] max-w-none flex-col gap-0",
            "shadow-[0_24px_48px_-12px_rgba(26,26,26,0.18),0_0_0_1px_rgba(26,26,26,0.04)]",
          )}
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
          <div
            className="h-1 shrink-0 bg-gradient-to-l from-[var(--primitive-color-brand-400)] via-[var(--primitive-color-brand-500)] to-[var(--primitive-color-brand-600)]"
            aria-hidden
          />

          <DialogHeader className="relative border-b border-[var(--semantic-color-surface-border)] bg-gradient-to-b from-[var(--primitive-color-brand-50)]/50 to-[var(--semantic-color-surface-subtle)]/80 px-[var(--primitive-space-6)] py-[var(--primitive-space-5)] text-start">
            <div className="flex items-start gap-[var(--primitive-space-3)]">
              {headerAdornment ? (
                <div className="shrink-0">{headerAdornment}</div>
              ) : (
                <div
                  className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-[var(--primitive-color-brand-500)]"
                  aria-hidden
                />
              )}

              <div className="min-w-0 flex-1 pe-[var(--primitive-space-2)]">
                <DialogTitle className="text-[length:var(--primitive-font-size-xl)] font-[var(--primitive-font-weight-semibold)] tracking-tight text-[var(--semantic-color-text-primary)]">
                  {title}
                </DialogTitle>
                {description ? (
                  <DialogDescription className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-secondary)]">
                    {description}
                  </DialogDescription>
                ) : null}
                {headerExtra ? (
                  <div className="mt-[var(--primitive-space-3)]">{headerExtra}</div>
                ) : null}
              </div>

              <DialogCloseButton className="mt-0.5" />
            </div>
          </DialogHeader>

          <div className="form-dialog-body flex-1 overflow-y-auto bg-[var(--semantic-color-surface-page)] px-[var(--primitive-space-6)] py-[var(--primitive-space-5)]">
            {formError ? (
              <ErrorState
                error={formError}
                className="mb-[var(--primitive-space-4)] rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] py-[var(--primitive-space-3)]"
              />
            ) : null}
            {children}
          </div>

          <DialogFooter
            className={cn(
              "flex-row items-center justify-between gap-[var(--primitive-space-3)]",
              "border-t border-[var(--semantic-color-surface-border)]",
              "bg-[var(--semantic-color-surface-card)]/90 backdrop-blur-sm",
              "px-[var(--primitive-space-6)] py-[var(--primitive-space-4)] sm:justify-between",
            )}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={submitLoading}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={onSubmit}
              loading={submitLoading}
              disabled={submitDisabled}
              className="min-w-[7rem] shadow-[0_2px_8px_rgba(232,119,34,0.25)]"
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortalContainerContext.Provider>
    </Dialog>
  );
}

export { FormDialog };
