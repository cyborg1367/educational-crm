import { formatPhoneDisplay } from "@/lib/locale/number";

export type PersonPhoneBadgeProps = {
  phone: string;
  className?: string;
};

/** Compact dark pill for a phone number, used wherever a task/referral
 * card surfaces a person's contact number next to their name. */
function PersonPhoneBadge({ phone, className }: PersonPhoneBadgeProps) {
  return (
    <span
      dir="ltr"
      className={`inline-flex shrink-0 rounded-[var(--primitive-radius-sm)] bg-[var(--primitive-color-neutral-900)] px-[var(--primitive-space-2)] py-px text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-white ${className ?? ""}`}
    >
      {formatPhoneDisplay(phone)}
    </span>
  );
}

export { PersonPhoneBadge };
