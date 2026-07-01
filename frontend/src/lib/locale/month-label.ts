import { formatGregorianYearMonthLabel } from "@/lib/locale/persian-months";

/**
 * Convert backend YYYY-MM month key to a Jalali Persian month label for chart axes.
 */
export function formatYearMonthLabel(yearMonth: string): string {
  return formatGregorianYearMonthLabel(yearMonth, true);
}
