import * as React from "react";

import type { ApiFieldError } from "@/lib/api/error";
import { cn } from "@/lib/utils";

export type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helperText?: string;
  error?: ApiFieldError | null;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

function FormField({
  label,
  htmlFor,
  required = false,
  helperText,
  error,
  disabled = false,
  className,
  children,
}: FormFieldProps) {
  const generatedId = React.useId();
  const fieldId = htmlFor ?? generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const describedBy =
    [errorId, helperId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-[var(--primitive-space-1)]", className)}>
      <label
        htmlFor={fieldId}
        className={cn(
          "text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] leading-[var(--primitive-font-lineHeight-sm)]",
          disabled
            ? "text-[var(--semantic-color-text-disabled)]"
            : "text-[var(--semantic-color-text-primary)]",
        )}
      >
        {label}
        {required ? (
          <span
            className="ms-[var(--primitive-space-1)] text-[var(--semantic-color-status-danger)]"
            aria-hidden
          >
            *
          </span>
        ) : null}
      </label>

      {React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<{
              id?: string;
              disabled?: boolean;
              "aria-invalid"?: boolean;
              "aria-describedby"?: string;
              "aria-required"?: boolean;
            }>,
            {
              id: (children as React.ReactElement<{ id?: string }>).props.id ?? fieldId,
              "aria-invalid": error ? true : undefined,
              "aria-describedby": describedBy,
              "aria-required": required || undefined,
              disabled:
                disabled ||
                (children as React.ReactElement<{ disabled?: boolean }>).props
                  .disabled,
            },
          )
        : children}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-[length:var(--primitive-font-size-xs)] leading-[var(--primitive-font-lineHeight-xs)] text-[var(--semantic-color-status-danger)]"
        >
          {error.detail}
        </p>
      ) : helperText ? (
        <p
          id={helperId}
          className="text-[length:var(--primitive-font-size-xs)] leading-[var(--primitive-font-lineHeight-xs)] text-[var(--semantic-color-text-secondary)]"
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export { FormField };
