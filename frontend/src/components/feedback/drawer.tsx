"use client";

import * as React from "react";
import { X } from "lucide-react";

import { IconButton } from "@/components/primitives/icon-button";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export type AppDrawerMode = "form" | "preview";

export type AppDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AppDrawerMode;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Form mode: primary submit handler. Omit to supply a custom `footer`. */
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  /** Overrides the default form footer (cancel + submit). */
  footer?: React.ReactNode;
};

const modeWidthClass: Record<AppDrawerMode, string> = {
  form: "max-w-[480px]",
  preview: "max-w-[400px]",
};

function AppDrawer({
  open,
  onOpenChange,
  mode,
  title,
  description,
  children,
  className,
  onSubmit,
  submitLabel = "ذخیره",
  cancelLabel = "انصراف",
  submitLoading = false,
  submitDisabled = false,
  footer,
}: AppDrawerProps) {
  const handleCancel = () => {
    onOpenChange(false);
  };

  const defaultFormFooter = (
    <div className="flex items-center justify-between gap-[var(--semantic-space-inlineGap)] border-t border-[var(--semantic-color-surface-border)] px-[var(--primitive-space-4)] py-[var(--primitive-space-4)]">
      <Button type="button" variant="secondary" onClick={handleCancel} disabled={submitLoading}>
        {cancelLabel}
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={onSubmit}
        loading={submitLoading}
        disabled={submitDisabled || !onSubmit}
      >
        {submitLabel}
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="left">
      <DrawerContent
        side="inline-end"
        className={cn(modeWidthClass[mode], className)}
      >
        <DrawerHeader className="flex flex-row items-start justify-between gap-[var(--primitive-space-3)] border-b border-[var(--semantic-color-surface-border)] px-[var(--primitive-space-4)] py-[var(--primitive-space-4)] text-start">
          <div className="min-w-0 flex-1">
            <DrawerTitle className="text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
              {title}
            </DrawerTitle>
            {description ? (
              <DrawerDescription className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                {description}
              </DrawerDescription>
            ) : null}
          </div>
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            icon={<X aria-hidden />}
            aria-label="بستن"
            onClick={handleCancel}
            className="shrink-0"
          />
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-[var(--primitive-space-4)] py-[var(--primitive-space-4)]">
          {children}
        </div>

        {mode === "form" ? (footer ?? defaultFormFooter) : null}
      </DrawerContent>
    </Drawer>
  );
}

export { AppDrawer };
