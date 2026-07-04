import type {
  ClassStatus,
  ConsultationOutcome,
  PersonGender,
  PersonInterest,
  PersonSource,
  PersonStatus,
  TaskType,
  UserRole,
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
  pre_enroll_unpaid: "پیش‌ثبت‌نام بدون پرداخت",
  post_course_consultation: "مشاوره پس از دوره",
  dormant_followup: "پیگیری غیرفعال",
  installment_overdue: "اقساط معوق",
  referral: "ارجاع",
  custom: "سفارشی",

  // Task.status
  open: "باز",
  done: "انجام‌شده",

  // User.role
  admin: "مدیر",
  admission: "پذیرش",
  department_manager: "مدیر دپارتمان",
  finance: "مالی",
  teacher: "مدرس",
};

export function terminologyLabel(value: string): string {
  return TERMINOLOGY[value] ?? value.replace(/_/g, " ");
}

/** Domain-scoped status labels for StatusBadge — keyed as `{domain}.{value}`. */
export const STATUS_DISPLAY_LABELS: Record<string, string> = {
  "person.prospect": "احتمالی",
  "person.lead": "سرنخ",
  "person.student": "دانش‌آموز",
  "person.dormant": "غیرفعال",
  "person.alumni": "فارغ‌التحصیل",
  "enrollment.pre_enroll": "پیش‌ثبت‌نام",
  "enrollment.active": "فعال",
  "enrollment.completed": "تکمیل‌شده",
  "enrollment.dropped": "انصراف",
  "invoice.open": "باز",
  "invoice.partially_paid": "پرداخت جزئی",
  "invoice.paid": "پرداخت‌شده",
  "invoice.void": "باطل",
  "installment.pending": "در انتظار",
  "installment.partially_paid": "پرداخت جزئی",
  "installment.paid": "پرداخت‌شده",
  "installment.overdue": "معوق",
  "installment.cancelled": "لغو‌شده",
  "task.open": "باز",
  "task.done": "انجام‌شده",
  "task.cancelled": "لغو‌شده",
  "class.planned": "برنامه‌ریزی‌شده",
  "class.active": "فعال",
  "class.completed": "تکمیل‌شده",
  "class.cancelled": "لغو‌شده",
  "journey.active": "فعال",
  "journey.completed": "تکمیل‌شده",
};

export function statusDisplayLabel(domain: string, value: string): string {
  const label = STATUS_DISPLAY_LABELS[`${domain}.${value}`];
  if (label) {
    return label;
  }
  return value.replace(/_/g, " ") || value;
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

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  follow_up_registration: terminologyLabel("follow_up_registration"),
  pre_enroll_unpaid: terminologyLabel("pre_enroll_unpaid"),
  post_course_consultation: terminologyLabel("post_course_consultation"),
  dormant_followup: terminologyLabel("dormant_followup"),
  installment_overdue: terminologyLabel("installment_overdue"),
  referral: terminologyLabel("referral"),
  custom: terminologyLabel("custom"),
};

export function taskTypeLabel(type: TaskType): string {
  return TASK_TYPE_LABELS[type];
}

export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: terminologyLabel("admin") },
  { value: "admission", label: terminologyLabel("admission") },
  { value: "department_manager", label: terminologyLabel("department_manager") },
  { value: "finance", label: terminologyLabel("finance") },
  { value: "teacher", label: terminologyLabel("teacher") },
];

export function userRoleLabel(role: UserRole): string {
  return terminologyLabel(role);
}

export const INTERESTS_OPTIONS: { value: PersonInterest; label: string }[] = [
  { value: "programming", label: "برنامه‌نویسی" },
  { value: "ai", label: "هوش مصنوعی" },
  { value: "accounting", label: "حسابداری و هوش مالی" },
  { value: "english", label: "زبان انگلیسی" },
  { value: "graphic", label: "گرافیک" },
  { value: "robotics", label: "رباتیک" },
];

export const GENDER_OPTIONS: { value: PersonGender; label: string }[] = [
  { value: "male", label: "مرد" },
  { value: "female", label: "زن" },
  { value: "other", label: "سایر" },
];

export const SOURCE_OPTIONS: { value: PersonSource; label: string }[] = [
  { value: "friend_referral", label: "معرفی دوست" },
  { value: "social_media", label: "فضای مجازی" },
  { value: "website", label: "سایت" },
  { value: "advertisement", label: "تبلیغات" },
  { value: "other", label: "سایر" },
];

export function interestLabel(value: string): string {
  return INTERESTS_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

export function genderLabel(value: string): string {
  return GENDER_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

export function sourceLabel(value: string): string {
  return SOURCE_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

/** Activity timeline action labels — keyed by backend `Activity.action`. */
export const ACTION_LABELS: Record<string, string> = {
  person_created: "ورود لید به سیستم",
  consultation_done: "مشاوره انجام شد",
  enrollment_created: "ثبت‌نام انجام شد",
  enrollment_dropped: "انصراف از ثبت‌نام",
  payment_recorded: "پرداخت ثبت شد",
  payment_refunded: "بازپرداخت انجام شد",
  task_created: "وظیفه ایجاد شد",
  course_completed: "دوره تکمیل شد",
  manual_note: "یادداشت",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export const CONSULTATION_OUTCOME_LABELS: Record<ConsultationOutcome, string> = {
  pre_enroll: terminologyLabel("pre_enroll"),
  follow_up: terminologyLabel("follow_up"),
  refer_other_dept: terminologyLabel("refer_other_dept"),
  not_suitable: terminologyLabel("not_suitable"),
  closed: terminologyLabel("closed"),
};
