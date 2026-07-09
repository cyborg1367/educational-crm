import { toPersianDigits } from "@/lib/locale/number";

export function remainingInstallmentsLabel(count: number): string {
  if (count <= 0) {
    return "تمام اقساط پرداخت شد";
  }
  return `${toPersianDigits(String(count))} قسط باقی‌مانده`;
}

export function installmentPositionLabel(sequence: number, total: number): string {
  return `قسط ${toPersianDigits(String(sequence))} از ${toPersianDigits(String(total))}`;
}
