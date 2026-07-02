"use client";

import * as React from "react";

import { CascadeConsequenceList } from "@/components/domain/cascade-consequence-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "confirm-dialog-content gap-[var(--semantic-space-sectionGap)]",
          "max-w-none",
          tier === 2
            ? [
                "w-[480px]",
                "border-[var(--semantic-confirmationTier-tier2-accent)]",
                "bg-[var(--semantic-confirmationTier-tier2-surface)]",
                "shadow-[var(--primitive-elevation-2)]",
              ].join(" ")
            : [
                "w-[560px]",
                "border-[var(--semantic-confirmationTier-tier3-accent)]",
                "bg-[var(--semantic-confirmationTier-tier3-surface)]",
                "shadow-[var(--semantic-confirmationTier-tier3-elevation)]",
              ].join(" "),
        )}
      >
        <DialogHeader className="text-start">
          <DialogTitle
            className={cn(
              "text-[length:var(--primitive-font-size-lg)]",
              tier === 3 && "text-[var(--semantic-color-status-danger-strong)]",
            )}
          >
            {title}
          </DialogTitle>
          <DialogDescription
            className={cn(
              "text-[length:var(--primitive-font-size-sm)]",
              "text-[var(--semantic-color-text-primary)]",
            )}
          >
            {body}
          </DialogDescription>
        </DialogHeader>

        {tier === 3 ? (
          <CascadeConsequenceList consequences={props.consequences} />
        ) : null}

        {children}

        <div className="flex w-full items-center justify-between gap-[var(--semantic-space-inlineGap)]">
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
            onClick={handleConfirm}
            loading={confirmLoading}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmDialog };
