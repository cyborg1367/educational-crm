import dayjs from "dayjs";
import jalaliday from "jalaliday";

import { toPersianDigits } from "@/lib/locale/number";

dayjs.extend(jalaliday);

const YEAR_MONTH = /^\d{4}-\d{2}$/;

export const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

/** Short axis labels (3 chars where possible) */
export const PERSIAN_MONTHS_SHORT = [
  "فرو",
  "ارد",
  "خرد",
  "تیر",
  "مرد",
  "شهر",
  "مهر",
  "آبا",
  "آذر",
  "دی",
  "بهم",
  "اسف",
] as const;

export function jalaliMonthIndexFromGregorianYearMonth(yearMonth: string): number {
  if (!YEAR_MONTH.test(yearMonth)) {
    throw new Error(`Invalid year-month: ${yearMonth}`);
  }
  const [year, month] = yearMonth.split("-").map(Number);
  return dayjs(`${year}-${month}-01`).calendar("jalali").month() + 1;
}

export function persianMonthName(jalaliMonth: number, short = false): string {
  const index = jalaliMonth - 1;
  const names = short ? PERSIAN_MONTHS_SHORT : PERSIAN_MONTHS;
  return names[index] ?? PERSIAN_MONTHS[index] ?? "";
}

export function formatGregorianYearMonthLabel(yearMonth: string, short = true): string {
  const jalaliMonth = jalaliMonthIndexFromGregorianYearMonth(yearMonth);
  return persianMonthName(jalaliMonth, short);
}

export function formatJalaliMonthYearTitle(jalaliYear: number, jalaliMonth: number): string {
  return `${PERSIAN_MONTHS[jalaliMonth - 1] ?? ""} ${toPersianDigits(String(jalaliYear))}`;
}

/** Day-of-month + short month name for compact date badges (e.g. a timeline). */
export function jalaliDayAndMonthLabel(
  isoDateTime: string,
): { day: string; month: string } {
  const jalali = dayjs(isoDateTime).calendar("jalali");
  return {
    day: toPersianDigits(String(jalali.date())),
    month: persianMonthName(jalali.month() + 1, true),
  };
}
