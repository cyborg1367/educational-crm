import type {
  ClassStatus,
  ConsultationOutcome,
  PersonStatus,
  TaskType,
} from "@/lib/api/types";

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

  // Class.status
  planned: "برنامه‌ریزی‌شده",
  cancelled: "لغو‌شده",

  // Consultation.outcome
  follow_up: "پیگیری",
  refer_other_dept: "ارجاع به بخش دیگر",
  not_suitable: "مناسب نیست",
  closed: "بسته شد",

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

export const CLASS_STATUS_OPTIONS: { value: ClassStatus; label: string }[] = [
  { value: "planned", label: terminologyLabel("planned") },
  { value: "active", label: terminologyLabel("active") },
  { value: "completed", label: terminologyLabel("completed") },
  { value: "cancelled", label: terminologyLabel("cancelled") },
];

export const CONSULTATION_OUTCOME_OPTIONS: {
  value: ConsultationOutcome;
  label: string;
}[] = [
  { value: "pre_enroll", label: terminologyLabel("pre_enroll") },
  { value: "follow_up", label: terminologyLabel("follow_up") },
  { value: "refer_other_dept", label: terminologyLabel("refer_other_dept") },
  { value: "not_suitable", label: terminologyLabel("not_suitable") },
  { value: "closed", label: terminologyLabel("closed") },
];

export function taskTypeLabel(type: TaskType): string {
  return terminologyLabel(type);
}
