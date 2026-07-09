"use client";

import * as React from "react";
import { AlertTriangle, OctagonAlert } from "lucide-react";

import { CascadeConsequenceList } from "@/components/domain/cascade-consequence-list";
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
import { cn } from "@/lib/utils";

type ConfirmDialogBaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: "primary" | "destructive";
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  /** Extra fields (e.g. reason textarea) rendered before action buttons. */
  children?: React.ReactNode;
};

export type ConfirmDialogTier2Props = ConfirmDialogBaseProps & {
  tier: 2;
};

export type ConfirmDialogTier3Props = ConfirmDialogBaseProps & {
  tier: 3;
  consequences: string[];
};

export type ConfirmDialogProps =
  | ConfirmDialogTier2Props
  | ConfirmDialogTier3Props;

function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    open,
    onOpenChange,
    title,
    body,
    confirmLabel,
    cancelLabel = "انصراف",
    onConfirm,
    onCancel,
    confirmVariant = "destructive",
    confirmLoading = false,
    confirmDisabled = false,
    children,
    tier,
  } = props;

  const isDanger = tier === 3 || confirmVariant === "destructive";
  const Icon = tier === 3 ? OctagonAlert : AlertTriangle;

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={cn(
          "confirm-dialog-content flex max-h-[min(90vh,720px)] max-w-none flex-col gap-0",
          tier === 3
            ? "w-[min(560px,calc(100vw-2rem))]"
            : "w-[min(480px,calc(100vw-2rem))]",
          "shadow-[0_24px_48px_-12px_rgba(26,26,26,0.18),0_0_0_1px_rgba(26,26,26,0.04)]",
        )}
      >
        <div
          className={cn(
            "h-1 shrink-0",
            isDanger
              ? "bg-gradient-to-l from-[var(--semantic-color-status-danger)] via-[var(--semantic-confirmationTier-tier3-accent)] to-[var(--semantic-color-status-danger-strong)]"
              : "bg-gradient-to-l from-[var(--semantic-confirmationTier-tier2-accent)] via-[#FBBF24] to-[#D97706]",
          )}
          aria-hidden
        />

        <DialogHeader className="relative border-b border-[var(--semantic-color-surface-border)] bg-gradient-to-b from-[var(--semantic-color-surface-subtle)] to-[var(--semantic-color-surface-card)] px-[var(--primitive-space-6)] py-[var(--primitive-space-5)] text-start">
          <div className="flex items-start gap-[var(--primitive-space-3)]">
            <div
              className={cn(
                "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--primitive-radius-lg)] border",
                isDanger
                  ? "border-[var(--semantic-color-status-danger)]/25 bg-[var(--semantic-color-surface-danger-subtle)] text-[var(--semantic-color-status-danger-strong)]"
                  : "border-[var(--semantic-confirmationTier-tier2-accent)]/30 bg-[#FFFBEB] text-[#B45309]",
              )}
              aria-hidden
            >
              <Icon className="size-5" strokeWidth={2} />
            </div>

            <div className="min-w-0 flex-1 pe-[var(--primitive-space-2)]">
              <DialogTitle
                className={cn(
                  "text-[length:var(--primitive-font-size-xl)] font-[var(--primitive-font-weight-semibold)] tracking-tight",
                  isDanger
                    ? "text-[var(--semantic-color-status-danger-strong)]"
                    : "text-[var(--semantic-color-text-primary)]",
                )}
              >
                {title}
              </DialogTitle>
              <DialogDescription className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-secondary)]">
                {body}
              </DialogDescription>
            </div>

            <DialogCloseButton
              className="mt-0.5"
              onClick={handleCancel}
              disabled={confirmLoading}
            />
          </div>
        </DialogHeader>

        {(tier === 3 || children) && (
          <div className="flex-1 overflow-y-auto bg-[var(--semantic-color-surface-page)] px-[var(--primitive-space-6)] py-[var(--primitive-space-5)]">
            <div className="flex flex-col gap-[var(--primitive-space-4)]">
              {tier === 3 ? (
                <CascadeConsequenceList consequences={props.consequences} />
              ) : null}
              {children}
            </div>
          </div>
        )}

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
            onClick={handleCancel}
            disabled={confirmLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            loading={confirmLoading}
            disabled={confirmDisabled}
            className="min-w-[7rem]"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmDialog };
