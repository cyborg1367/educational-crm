import type { PersonStatus, TaskType } from "@/lib/api/types";

/** Persian display labels — docs/frontend/02-ux-guidelines-design-principles.md §4 */
const TERMINOLOGY: Record<string, string> = {
  // Person.status
  prospect: "سرنخ اولیه",
  lead: "سرنخ",
  student: "دانش‌آموز",
  dormant: "غیرفعال",
  alumni: "فارغ‌التحصیل",

  // Enrollment.status
  pre_enroll: "پیش‌ثبت‌نام",
  active: "فعال",
  completed: "تکمیل‌شده",
  dropped: "انصراف",

  // Journey.status
  on_hold: "معلق",

  // Task.type
  follow_up_registration: "پیگیری ثبت‌نام",
  follow_up_payment: "پیگیری پرداخت",
  referral: "ارجاع",
  post_course_review: "بازبینی پس از دوره",
  dormant_follow_up: "پیگیری غیرفعال",
  other: "سایر",

  // Task.status
  open: "باز",
  done: "انجام‌شده",
  cancelled: "لغو‌شده",
};

export function terminologyLabel(value: string): string {
  return TERMINOLOGY[value] ?? value.replace(/_/g, " ");
}

export const PERSON_STATUS_OPTIONS: { value: PersonStatus; label: string }[] = [
  { value: "prospect", label: terminologyLabel("prospect") },
  { value: "lead", label: terminologyLabel("lead") },
  { value: "student", label: terminologyLabel("student") },
  { value: "dormant", label: terminologyLabel("dormant") },
  { value: "alumni", label: terminologyLabel("alumni") },
];

export function taskTypeLabel(type: TaskType): string {
  return terminologyLabel(type);
}
