import * as React from "react";

import { textareaVariants } from "@/components/form/control-styles";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error = false, required, ...props }, ref) => (
    <textarea
      ref={ref}
      required={required}
      className={cn(
        textareaVariants({ error }),
        required &&
          "border-[var(--semantic-color-surface-border)] focus-visible:border-[var(--semantic-color-action-focusRing)]",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
