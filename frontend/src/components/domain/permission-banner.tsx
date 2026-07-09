import { Eye } from "lucide-react";

import { cn } from "@/lib/utils";

export type PermissionBannerProps = {
  message?: string;
  className?: string;
};

function PermissionBanner({
  message = "فقط مشاهده — نقش شما اجازه ویرایش در این صفحه را ندارد",
  className,
}: PermissionBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-[var(--primitive-space-2)] rounded-[var(--primitive-radius-md)]",
        "border border-[var(--semantic-color-surface-border)]",
        "bg-[var(--semantic-color-surface-subtle)] px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
        "text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]",
        className,
      )}
    >
      <Eye
        className="size-[var(--primitive-space-4)] shrink-0 text-[var(--semantic-color-text-secondary)]"
        aria-hidden
      />
      <span>{message}</span>
    </div>
  );
}

export { PermissionBanner };
