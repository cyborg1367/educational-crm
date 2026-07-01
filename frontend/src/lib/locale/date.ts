import dayjs from "dayjs";
import jalaliday from "jalaliday";
import { localeConfig } from "@/lib/locale/config";
import { toPersianDigits } from "@/lib/locale/number";

dayjs.extend(jalaliday);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const JALALI_DATE = /^\d{4}\/\d{1,2}\/\d{1,2}$/;

/** Gregorian ISO date (YYYY-MM-DD) for API / form storage */
export type StorageDate = string;

/** Jalali display string (YYYY/MM/DD) */
export type DisplayDate = string;

/**
 * Render a Gregorian storage date as Jalali for UI display.
 * Input must be YYYY-MM-DD (backend contract).
 */
export function formatDateDisplay(
  storageDate: StorageDate,
  format = "YYYY/MM/DD",
): DisplayDate {
  if (!ISO_DATE.test(storageDate)) {
    throw new Error(`Invalid storage date: ${storageDate}`);
  }
  if (localeConfig.calendar !== "jalali") {
    return storageDate;
  }
  return toPersianDigits(
    dayjs(storageDate).calendar("jalali").format(format),
  );
}

/**
 * Parse a Jalali display date and return Gregorian YYYY-MM-DD for storage/API.
 */
export function toStorageDate(displayDate: DisplayDate): StorageDate {
  if (!JALALI_DATE.test(displayDate)) {
    throw new Error(`Invalid Jalali date: ${displayDate}`);
  }
  if (localeConfig.calendarStorage !== "gregorian") {
    return displayDate;
  }
  return dayjs(displayDate, { jalali: true } as dayjs.OptionType)
    .calendar("gregory")
    .format("YYYY-MM-DD");
}

/**
 * Format an ISO datetime string for display (date portion in Jalali).
 */
export function formatDateTimeDisplay(
  isoDateTime: string,
  format = "YYYY/MM/DD HH:mm",
): string {
  const d = dayjs(isoDateTime);
  if (!d.isValid()) {
    throw new Error(`Invalid datetime: ${isoDateTime}`);
  }
  if (localeConfig.calendar !== "jalali") {
    return d.format(format);
  }
  return toPersianDigits(d.calendar("jalali").format(format));
}

/** Today as Gregorian storage date */
export function todayStorage(): StorageDate {
  return dayjs().format("YYYY-MM-DD");
}

/** Today as Jalali display date */
export function todayDisplay(): DisplayDate {
  if (localeConfig.calendar !== "jalali") {
    return todayStorage();
  }
  return toPersianDigits(dayjs().calendar("jalali").format("YYYY/MM/DD"));
}
