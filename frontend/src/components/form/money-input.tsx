"use client";

import * as React from "react";

import { controlVariants } from "@/components/form/control-styles";
import {
  formatToman,
  formatTomanInput,
  parseTomanInput,
} from "@/lib/locale/number";
import { cn } from "@/lib/utils";

export type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "size" | "type"
> & {
  value?: number | null;
  onValueChange?: (value: number | null) => void;
  error?: boolean;
  frozen?: boolean;
  inputSize?: "md" | "lg";
};

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      className,
      value = null,
      onValueChange,
      error = false,
      frozen = false,
      inputSize = "md",
      disabled,
      onBlur,
      onFocus,
      ...props
    },
    ref,
  ) => {
    const [displayValue, setDisplayValue] = React.useState(() =>
      value != null ? formatToman(value) : "",
    );
    const isFocusedRef = React.useRef(false);

    React.useEffect(() => {
      if (isFocusedRef.current) {
        return;
      }
      setDisplayValue(value != null ? formatToman(value) : "");
    }, [value]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (frozen) {
        return;
      }
      const raw = event.target.value;
      const formatted = formatTomanInput(raw);
      setDisplayValue(formatted);
      onValueChange?.(parseTomanInput(raw));
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      onFocus?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false;
      const parsed = parseTomanInput(displayValue);
      setDisplayValue(parsed != null ? formatToman(parsed) : "");
      onBlur?.(event);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        readOnly={frozen}
        disabled={disabled}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        tabIndex={frozen ? -1 : undefined}
        aria-readonly={frozen || undefined}
        className={cn(
          controlVariants({ size: inputSize, error, frozen }),
          "text-end",
          className,
        )}
        {...props}
      />
    );
  },
);
MoneyInput.displayName = "MoneyInput";

export { MoneyInput };
