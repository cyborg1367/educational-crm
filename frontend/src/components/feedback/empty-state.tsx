import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateAction = {
  label: string;
  onClick: () => void;
};

export type EmptyStateProps = {
  icon: LucideIcon;
  message: string;
  action?: EmptyStateAction;
  className?: string;
};

function EmptyState({ icon: Icon, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-[var(--primitive-space-4)] py-[var(--primitive-space-8)] text-center",
        className,
      )}
    >
      <div
        className={cn(
          "mb-[var(--primitive-space-4)] flex size-[var(--primitive-space-12)] items-center justify-center",
          "rounded-[var(--primitive-radius-full)] bg-[var(--semantic-color-surface-subtle)]",
          "text-[var(--semantic-color-text-secondary)]",
        )}
      >
        <Icon className="size-[var(--primitive-space-6)]" aria-hidden />
      </div>
      <p className="max-w-sm text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-secondary)]">
        {message}
      </p>
      {action ? (
        <Button
          type="button"
          variant="primary"
          size="md"
          className="mt-[var(--primitive-space-4)]"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export { EmptyState };
