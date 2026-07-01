import dayjs from "dayjs";
import jalaliday from "jalaliday";

import { toStorageDate, type StorageDate } from "@/lib/locale/date";
import { formatJalaliMonthYearTitle } from "@/lib/locale/persian-months";

dayjs.extend(jalaliday);

export type JalaliMonth = {
  year: number;
  month: number;
};

export const JALALI_WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function storageToJalaliMonth(value: StorageDate): JalaliMonth {
  const jalali = dayjs(value).calendar("jalali");
  return { year: jalali.year(), month: jalali.month() + 1 };
}

export function currentJalaliMonth(): JalaliMonth {
  const jalali = dayjs().calendar("jalali");
  return { year: jalali.year(), month: jalali.month() + 1 };
}

export function shiftJalaliMonth(
  { year, month }: JalaliMonth,
  delta: number,
): JalaliMonth {
  const anchor = dayjs(
    `${year}/${month}/1`,
    { jalali: true } as dayjs.OptionType,
  ).add(delta, "month");
  const jalali = anchor.calendar("jalali");
  return { year: jalali.year(), month: jalali.month() + 1 };
}

export type JalaliMonthCell = {
  day: number;
  storageDate: StorageDate;
};

export function buildMonthGrid({ year, month }: JalaliMonth): Array<JalaliMonthCell | null> {
  const firstOfMonth = dayjs(
    `${year}/${month}/1`,
    { jalali: true } as dayjs.OptionType,
  );
  const daysInMonth = firstOfMonth.daysInMonth();
  const startOffset = (firstOfMonth.day() + 1) % 7;
  const cells: Array<JalaliMonthCell | null> = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const displayDate = `${year}/${month}/${day}`;
    cells.push({
      day,
      storageDate: toStorageDate(displayDate),
    });
  }

  return cells;
}

export function formatJalaliMonthTitle({ year, month }: JalaliMonth): string {
  return formatJalaliMonthYearTitle(year, month);
}

export function jalaliMonthToStorageAnchor({ year, month }: JalaliMonth): StorageDate {
  return toStorageDate(`${year}/${month}/1`);
}
