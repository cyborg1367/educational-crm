"use client";

import * as React from "react";
import { Timer } from "lucide-react";

import { useToast } from "@/components/feedback/toast";
import { cn } from "@/lib/utils";

const DEFAULT_MESSAGE =
  "تعداد تلاش‌های شما بیش از حد مجاز است — لطفاً کمی صبر کنید";

export type RateLimitNoticeProps = {
  variant?: "inline" | "toast";
  message?: string;
  className?: string;
  onShown?: () => void;
};

function RateLimitNotice({
  variant = "inline",
  message = DEFAULT_MESSAGE,
  className,
  onShown,
}: RateLimitNoticeProps) {
  const { toast } = useToast();
  const shownRef = React.useRef(false);

  React.useEffect(() => {
    if (variant !== "toast" || shownRef.current) {
      return;
    }
    shownRef.current = true;
    toast({
      variant: "info",
      title: "محدودیت تعداد درخواست",
      description: message,
      duration: 8000,
    });
    onShown?.();
  }, [variant, message, toast, onShown]);

  if (variant === "toast") {
    return null;
  }

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-[var(--primitive-space-3)] rounded-[var(--primitive-radius-md)]",
        "border border-[var(--semantic-color-status-warning)] bg-[var(--semantic-color-surface-warning-subtle)]",
        "px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]",
        className,
      )}
    >
      <Timer
        className="mt-[var(--primitive-space-1)] size-[var(--primitive-space-5)] shrink-0 text-[var(--semantic-color-status-warning)]"
        aria-hidden
      />
      <div className="min-w-0 text-start">
        <p className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-primary)]">
          محدودیت تعداد درخواست
        </p>
        <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-secondary)]">
          {message}
        </p>
      </div>
    </div>
  );
}

export { RateLimitNotice, DEFAULT_MESSAGE as RATE_LIMIT_DEFAULT_MESSAGE };
