import * as React from "react";

import { controlVariants } from "@/components/form/control-styles";
import { cn } from "@/lib/utils";

export type TextInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  error?: boolean;
  inputSize?: "md" | "lg";
};

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, error = false, inputSize = "md", disabled, ...props }, ref) => (
    <input
      ref={ref}
      disabled={disabled}
      className={cn(
        controlVariants({ size: inputSize, error }),
        "text-start",
        className,
      )}
      {...props}
    />
  ),
);
TextInput.displayName = "TextInput";

export { TextInput };
