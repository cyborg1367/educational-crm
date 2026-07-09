"use client";

import * as React from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

import { IconButton } from "@/components/primitives/icon-button";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

export type ToastInput = {
  id?: string;
  variant?: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
};

type ToastRecord = ToastInput & {
  id: string;
};

type ToastContextValue = {
  toasts: ToastRecord[];
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 5000;

const variantStyles: Record<
  ToastVariant,
  { container: string; icon: React.ReactNode }
> = {
  success: {
    container: "border-[var(--semantic-color-status-success)]",
    icon: (
      <CheckCircle2
        className="size-[var(--primitive-space-5)] shrink-0 text-[var(--semantic-color-status-success)]"
        aria-hidden
      />
    ),
  },
  error: {
    container: "border-[var(--semantic-color-status-danger)]",
    icon: (
      <XCircle
        className="size-[var(--primitive-space-5)] shrink-0 text-[var(--semantic-color-status-danger)]"
        aria-hidden
      />
    ),
  },
  info: {
    container: "border-[var(--semantic-color-status-info)]",
    icon: (
      <Info
        className="size-[var(--primitive-space-5)] shrink-0 text-[var(--semantic-color-status-info)]"
        aria-hidden
      />
    ),
  },
};

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = input.id ?? crypto.randomUUID();
      const duration = input.duration ?? DEFAULT_DURATION_MS;
      const record: ToastRecord = {
        id,
        variant: input.variant ?? "info",
        title: input.title,
        description: input.description,
        duration,
      };

      setToasts((current) => [...current, record]);
      window.setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = React.useMemo(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-[var(--primitive-space-4)] z-[var(--primitive-zIndex-toast)]",
        "flex flex-col items-center gap-[var(--primitive-space-2)] px-[var(--primitive-space-4)]",
        "sm:items-end sm:px-[var(--primitive-space-6)]",
      )}
    >
      {toasts.map((item) => {
        const variant = item.variant ?? "info";
        const styles = variantStyles[variant];

        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              "toast-item pointer-events-auto flex w-full max-w-sm items-start gap-[var(--primitive-space-3)]",
              "rounded-[var(--primitive-radius-md)] border bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-4)]",
              "shadow-[var(--primitive-elevation-2)]",
              styles.container,
            )}
          >
            {styles.icon}
            <div className="min-w-0 flex-1 text-start">
              <p className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-primary)]">
                {item.title}
              </p>
              {item.description ? (
                <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] leading-[var(--primitive-font-lineHeight-xs)] text-[var(--semantic-color-text-secondary)]">
                  {item.description}
                </p>
              ) : null}
            </div>
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              icon={<X aria-hidden />}
              aria-label="بستن اعلان"
              onClick={() => onDismiss(item.id)}
              className="shrink-0"
            />
          </div>
        );
      })}
    </div>
  );
}

function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export { ToastProvider, useToast };
