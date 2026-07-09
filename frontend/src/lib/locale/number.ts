import { localeConfig } from "@/lib/locale/config";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const LATIN_DIGITS = "0123456789";
const THOUSANDS_SEPARATOR = "\u066C"; // ٬ per UX guidelines §3.3

const PERSIAN_TO_LATIN = new Map<string, string>();
for (let i = 0; i < 10; i++) {
  PERSIAN_TO_LATIN.set(PERSIAN_DIGITS[i]!, LATIN_DIGITS[i]!);
  PERSIAN_TO_LATIN.set(ARABIC_INDIC_DIGITS[i]!, LATIN_DIGITS[i]!);
}

/**
 * Convert Latin digits in a string to Persian for display.
 */
export function toPersianDigits(value: string): string {
  if (localeConfig.digitsDisplay !== "persian") {
    return value;
  }
  return value.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]!);
}

/**
 * Format a phone number for read-only display (Persian digits per locale.digitsDisplay).
 */
export function formatPhoneDisplay(
  phone: string | null | undefined,
  fallback = "—",
): string {
  if (!phone?.trim()) {
    return fallback;
  }
  return toPersianDigits(phone);
}

/**
 * Normalize Persian/Arabic-Indic digits to Latin (for parsing & API).
 * Per locale.digitsInput: normalize-both.
 */
export function normalizeDigitsInput(value: string): string {
  if (localeConfig.digitsInput !== "normalize-both") {
    return value;
  }
  return value.replace(/[۰-۹٠-٩]/g, (ch) => PERSIAN_TO_LATIN.get(ch) ?? ch);
}

/**
 * Strip grouping separators and normalize digits; parse integer Toman amount.
 * Returns null if the result is not a valid integer.
 */
export function parseTomanInput(raw: string): number | null {
  const normalized = normalizeDigitsInput(raw)
    .replace(/[,\u066C\u066B\s]/g, "")
    .trim();
  if (normalized === "" || normalized === "-") {
    return null;
  }
  if (!/^-?\d+$/.test(normalized)) {
    return null;
  }
  return Number(normalized);
}

/**
 * Format integer Toman for display: Persian digits + ٬ thousands separators.
 */
export function formatToman(
  amount: number,
  options?: { suffix?: boolean },
): string {
  if (!Number.isInteger(amount)) {
    throw new Error(`Toman amounts must be integers: ${amount}`);
  }
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const grouped = abs
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  const display = toPersianDigits(grouped);
  const withSign = negative ? `-${display}` : display;
  if (options?.suffix && localeConfig.currencyUnit === "toman") {
    return `${withSign} تومان`;
  }
  return withSign;
}

/**
 * Live-format user input while typing: keep only digits, add separators.
 * Returns the display string (Persian digits if configured).
 */
export function formatTomanInput(raw: string): string {
  const parsed = parseTomanInput(raw);
  if (parsed === null) {
    return "";
  }
  return formatToman(parsed);
}

/**
 * Format a generic integer count for display (no currency suffix).
 */
export function formatCount(value: number): string {
  return formatToman(value);
}

/**
 * Format a finite number for display (supports decimals like session hours).
 * Integers stay without a fraction; decimals keep up to `maxFractionDigits`.
 */
export function formatNumber(
  value: number,
  options?: { maxFractionDigits?: number },
): string {
  if (!Number.isFinite(value)) {
    throw new Error(`formatNumber expects a finite number: ${value}`);
  }
  const maxFractionDigits = options?.maxFractionDigits ?? 2;
  if (Number.isInteger(value)) {
    return formatCount(value);
  }
  const rounded =
    Math.round(value * 10 ** maxFractionDigits) / 10 ** maxFractionDigits;
  const fixed = rounded
    .toFixed(maxFractionDigits)
    .replace(/\.?0+$/, "");
  const [whole, fraction] = fixed.split(".");
  const groupedWhole = Math.abs(Number(whole))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  const signed =
    rounded < 0 ? `-${groupedWhole}` : groupedWhole;
  const withFraction = fraction ? `${signed}.${fraction}` : signed;
  return toPersianDigits(withFraction);
}
