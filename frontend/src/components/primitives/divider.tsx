import * as React from "react";

import { cn } from "@/lib/utils";

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {}

function Divider({ className, ...props }: DividerProps) {
  return (
    <hr
      role="separator"
      className={cn(
        "border-0 border-t border-[var(--semantic-color-surface-border)]",
        className,
      )}
      {...props}
    />
  );
}

export { Divider };
