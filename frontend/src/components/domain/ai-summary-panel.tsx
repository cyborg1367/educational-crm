import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export type AISummaryPanelProps = {
  className?: string;
};

/**
 * Shell only — full AI content is capsule F14.
 * Graceful degradation per docs/frontend/08-ai-frontend-specification.md §3.1 rule 5.
 */
function AISummaryPanel({ className }: AISummaryPanelProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)]",
        "bg-[var(--semantic-color-surface-subtle)] p-[var(--semantic-space-cardPadding)]",
        className,
      )}
      aria-label="خلاصه هوش مصنوعی"
    >
      <div className="mb-[var(--primitive-space-3)] flex items-center gap-[var(--primitive-space-2)]">
        <Sparkles
          className="size-[var(--primitive-space-4)] shrink-0 text-[var(--semantic-color-status-info)]"
          aria-hidden
        />
        <span className="text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]">
          تولیدشده با هوش مصنوعی
        </span>
      </div>
      <p className="text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-secondary)]">
        خلاصه در دسترس نیست
      </p>
    </section>
  );
}

export { AISummaryPanel };
