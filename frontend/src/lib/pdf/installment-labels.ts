import { toPersianDigits } from "@/lib/locale/number";

const INSTALLMENT_ORDINALS = [
  "اول",
  "دوم",
  "سوم",
  "چهارم",
  "پنجم",
  "ششم",
  "هفتم",
  "هشتم",
  "نهم",
  "دهم",
] as const;

/** Human-readable installment row label for invoice PDF. */
export function installmentDescription(sequence: number): string {
  if (sequence === 1) {
    return "پیش‌پرداخت";
  }
  const ordinalIndex = sequence - 2;
  if (ordinalIndex >= 0 && ordinalIndex < INSTALLMENT_ORDINALS.length) {
    return `قسط ${INSTALLMENT_ORDINALS[ordinalIndex]}`;
  }
  return `قسط ${toPersianDigits(String(sequence - 1))}`;
}
