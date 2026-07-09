"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const dialogCloseButtonClassName = cn(
  "inline-flex size-9 shrink-0 items-center justify-center",
  "rounded-[var(--primitive-radius-full)] bg-[var(--primitive-color-neutral-800)] text-white",
  "transition-colors duration-[var(--primitive-motion-duration-fast)] ease-[var(--primitive-motion-easing-standard)]",
  "hover:bg-[var(--primitive-color-neutral-900)]",
  "active:bg-[var(--primitive-color-neutral-950)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-color-action-focusRing)] focus-visible:ring-offset-2",
  "disabled:pointer-events-none disabled:opacity-50",
);

function DialogCloseButton({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      className={cn(dialogCloseButtonClassName, className)}
      title="بستن"
      {...props}
    >
      <X className="size-4 stroke-[2.5]" aria-hidden />
      <span className="sr-only">بستن</span>
    </DialogPrimitive.Close>
  );
}

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[var(--primitive-zIndex-modal)] bg-[var(--primitive-color-neutral-900)]/50 backdrop-blur-[2px]",
      "data-[state=open]:animate-[dialog-overlay-fade-in_var(--primitive-motion-duration-base)_var(--primitive-motion-easing-standard)]",
      "data-[state=closed]:animate-[dialog-overlay-fade-out_var(--primitive-motion-duration-base)_var(--primitive-motion-easing-standard)]",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideClose?: boolean;
  }
>(({ className, children, hideClose = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Use inset + margin auto for centering so open/close animations never fight transform.
        "fixed inset-0 z-[var(--primitive-zIndex-modal)] m-auto grid h-fit w-full max-w-lg gap-4 overflow-hidden border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] p-0 shadow-[var(--primitive-elevation-3)] duration-[var(--primitive-motion-duration-base)] sm:rounded-[var(--primitive-radius-xl)]",
        className,
      )}
      {...props}
    >
      {children}
      {hideClose ? null : (
        <DialogCloseButton className="absolute inset-inline-end-5 top-5 z-10" />
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 text-center sm:text-start",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
