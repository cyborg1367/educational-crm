import * as React from "react";

import { focusVisibleStyles } from "@/components/form/control-styles";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: string;
  error?: boolean;
};

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error = false, disabled, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex min-h-[var(--primitive-space-10)] cursor-pointer items-center gap-[var(--primitive-space-2)]",
          disabled && "cursor-not-allowed",
          className,
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          disabled={disabled}
          className={cn(
            "size-[var(--primitive-space-4)] shrink-0 rounded-[var(--primitive-radius-sm)] border",
            "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)]",
            "text-[var(--semantic-color-action-primary)] transition-colors",
            "checked:border-[var(--semantic-color-action-primary)] checked:bg-[var(--semantic-color-action-primary)]",
            "hover:border-[var(--primitive-color-neutral-400)]",
            focusVisibleStyles,
            "disabled:pointer-events-none disabled:border-[var(--semantic-color-surface-border)] disabled:bg-[var(--semantic-color-surface-subtle)]",
            error && "border-[var(--semantic-color-status-danger)]",
          )}
          {...props}
        />
        <span
          className={cn(
            "text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)]",
            disabled
              ? "text-[var(--semantic-color-text-disabled)]"
              : "text-[var(--semantic-color-text-primary)]",
          )}
        >
          {label}
        </span>
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";

export type RadioOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type RadioGroupProps = {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  legend?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
};

function RadioGroup({
  name,
  options,
  value,
  onChange,
  legend,
  error = false,
  disabled = false,
  className,
  ...ariaProps
}: RadioGroupProps) {
  return (
    <fieldset
      disabled={disabled}
      className={cn("m-0 min-w-0 border-0 p-0", className)}
      {...ariaProps}
    >
      {legend ? (
        <legend className="mb-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
          {legend}
        </legend>
      ) : null}
      <div className="flex flex-col gap-[var(--primitive-space-2)]">
        {options.map((option) => {
          const inputId = `${name}-${option.value}`;
          const isChecked = value === option.value;
          const isDisabled = disabled || option.disabled;

          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={cn(
                "inline-flex min-h-[var(--primitive-space-10)] cursor-pointer items-center gap-[var(--primitive-space-2)]",
                isDisabled && "cursor-not-allowed",
              )}
            >
              <input
                id={inputId}
                type="radio"
                name={name}
                value={option.value}
                checked={isChecked}
                disabled={isDisabled}
                onChange={() => onChange?.(option.value)}
                className={cn(
                  "size-[var(--primitive-space-4)] shrink-0 border",
                  "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)]",
                  "text-[var(--semantic-color-action-primary)] transition-colors",
                  "checked:border-[var(--semantic-color-action-primary)]",
                  "hover:border-[var(--primitive-color-neutral-400)]",
                  focusVisibleStyles,
                  "disabled:pointer-events-none disabled:border-[var(--semantic-color-surface-border)] disabled:bg-[var(--semantic-color-surface-subtle)]",
                  error && "border-[var(--semantic-color-status-danger)]",
                )}
              />
              <span
                className={cn(
                  "text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)]",
                  isDisabled
                    ? "text-[var(--semantic-color-text-disabled)]"
                    : "text-[var(--semantic-color-text-primary)]",
                )}
              >
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const SelectionControl = {
  Checkbox,
  RadioGroup,
};

export { Checkbox, RadioGroup, SelectionControl };
