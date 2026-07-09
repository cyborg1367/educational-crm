import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "size-[var(--primitive-space-4)] border-2",
  md: "size-[var(--primitive-space-5)] border-2",
  lg: "size-[var(--primitive-space-6)] border-2",
} as const;

export function Spinner({ className, size = "md" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-hidden
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-[var(--semantic-color-action-primary)] border-t-transparent",
        sizeClasses[size],
        className,
      )}
    />
  );
}
