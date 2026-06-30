import {
  AlertTriangle,
  Ban,
  FileQuestion,
  Lock,
  LogIn,
  type LucideIcon,
} from "lucide-react";

import type { ApiError, ApiErrorCode } from "@/lib/api/error";
import { cn } from "@/lib/utils";

type ErrorPresentation = {
  icon: LucideIcon;
  title: string;
};

const ERROR_PRESENTATION: Record<
  Exclude<ApiErrorCode, "VALIDATION_ERROR">,
  ErrorPresentation
> = {
  NOT_FOUND: {
    icon: FileQuestion,
    title: "مورد یافت نشد",
  },
  CONFLICT: {
    icon: AlertTriangle,
    title: "تعارض در داده‌ها",
  },
  PERMISSION_DENIED: {
    icon: Ban,
    title: "دسترسی مجاز نیست",
  },
  AUTHENTICATION_ERROR: {
    icon: LogIn,
    title: "ورود مجدد لازم است",
  },
};

export type ErrorStateProps = {
  error: ApiError;
  className?: string;
};

/**
 * Page/section-level error display. Switches on `error_code` only — never parses
 * `detail` for branching. Field-level VALIDATION_ERROR belongs on FormField.
 */
function ErrorState({ error, className }: ErrorStateProps) {
  if (error.error_code === "VALIDATION_ERROR" && error.field) {
    return null;
  }

  const presentation =
    error.error_code === "VALIDATION_ERROR"
      ? {
          icon: Lock,
          title: "خطای اعتبارسنجی",
        }
      : ERROR_PRESENTATION[error.error_code];

  if (!presentation) {
    return null;
  }

  const Icon = presentation.icon;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-[var(--primitive-space-4)] py-[var(--primitive-space-8)] text-center",
        className,
      )}
    >
      <div
        className={cn(
          "mb-[var(--primitive-space-4)] flex size-[var(--primitive-space-12)] items-center justify-center",
          "rounded-[var(--primitive-radius-full)] bg-[var(--semantic-color-surface-danger-subtle)]",
          "text-[var(--semantic-color-status-danger)]",
        )}
      >
        <Icon className="size-[var(--primitive-space-6)]" aria-hidden />
      </div>
      <p className="text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-medium)] leading-[var(--primitive-font-lineHeight-base)] text-[var(--semantic-color-text-primary)]">
        {presentation.title}
      </p>
      <p className="mt-[var(--primitive-space-2)] max-w-md text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-secondary)]">
        {error.detail}
      </p>
    </div>
  );
}

export { ErrorState };
