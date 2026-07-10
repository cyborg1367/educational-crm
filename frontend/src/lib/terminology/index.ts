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

  // Journey.status
  on_hold: "معلق",

  // Task.type
  follow_up_registration: "پیگیری ثبت‌نام",
  consultation_follow_up: "پیگیری مجدد مشاوره",
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
  "consultation.pending": "در انتظار مشاوره",
  "consultation.pre_enroll": "پیش‌ثبت‌نام",
  "consultation.follow_up": "پیگیری",
  "consultation.refer_other_dept": "ارجاع به بخش دیگر",
  "consultation.not_suitable": "مناسب نیست",
  "consultation.closed": "پرونده بسته",
  "consultation.continue": "ادامه مسیر",
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

export const CONSULTATION_OUTCOME_LABELS: Record<ConsultationOutcome, string> = {
  pre_enroll: "آماده ثبت‌نام",
  follow_up: "نیاز به پیگیری",
  refer_other_dept: "ارجاع به بخش دیگر",
  not_suitable: "مناسب نیست",
  closed: "بسته شد",
  continue: "ادامه مسیر",
};

export const CONSULTATION_OUTCOME_OPTIONS: {
  value: ConsultationOutcome;
  label: string;
}[] = (
  Object.entries(CONSULTATION_OUTCOME_LABELS) as [ConsultationOutcome, string][]
).map(([value, label]) => ({ value, label }));

/** Outcome choices shown in the consultation wizard (excludes continue). */
export const CONSULTATION_WIZARD_OUTCOME_OPTIONS: {
  value: ConsultationOutcome;
  label: string;
}[] = CONSULTATION_OUTCOME_OPTIONS.filter((opt) => opt.value !== "continue");

export const CONSULTATION_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "beginner", label: "مبتدی کامل" },
  { value: "elementary", label: "آشنایی مقدماتی" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced", label: "پیشرفته" },
];

export const CONSULTATION_MOTIVATION_OPTIONS: { value: string; label: string }[] = [
  { value: "career_change", label: "تغییر شغل" },
  { value: "career_growth", label: "ارتقا شغلی" },
  { value: "personal_learning", label: "یادگیری شخصی" },
  { value: "business", label: "راه‌اندازی کسب‌وکار" },
  { value: "other", label: "سایر" },
];

export const LEVEL_LABELS: Record<string, string> = Object.fromEntries(
  CONSULTATION_LEVEL_OPTIONS.map((opt) => [opt.value, opt.label]),
);

export const MOTIVATION_LABELS: Record<string, string> = Object.fromEntries(
  CONSULTATION_MOTIVATION_OPTIONS.map((opt) => [opt.value, opt.label]),
);

export function levelLabel(value: string): string {
  return LEVEL_LABELS[value] ?? value;
}

export function motivationLabel(value: string): string {
  return MOTIVATION_LABELS[value] ?? value;
}

/** One-line helper text shown beneath outcome Select in the consultation wizard. */
export const CONSULTATION_OUTCOME_DESCRIPTIONS: Record<
  ConsultationOutcome,
  string
> = {
  pre_enroll:
    "آماده ثبت‌نام — کارشناس پذیرش برای انتخاب کلاس و تکمیل ثبت‌نام مطلع می‌شود.",
  follow_up:
    "هنوز قطعی نیست — وظیفه تماس مجدد (بدون شروع ثبت‌نام) به کارشناس پذیرش ارجاع می‌شود.",
  refer_other_dept:
    "دپارتمان دیگر مناسب‌تر است — پرونده و وظیفه به مدیر آن دپارتمان می‌رود.",
  not_suitable: "ادامه نمی‌دهد — پرونده در این دپارتمان بسته می‌شود.",
  closed: "انصراف یا پایان — پرونده بسته می‌شود.",
  continue: "دانش‌پذیر برگشته — مشاوره بعدی بدون مسیر جدید.",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  follow_up_registration: terminologyLabel("follow_up_registration"),
  consultation_follow_up: terminologyLabel("consultation_follow_up"),
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

export const WEEKDAY_OPTIONS = [
  { value: "saturday", label: "شنبه" },
  { value: "sunday", label: "یکشنبه" },
  { value: "monday", label: "دوشنبه" },
  { value: "tuesday", label: "سه‌شنبه" },
  { value: "wednesday", label: "چهارشنبه" },
  { value: "thursday", label: "پنجشنبه" },
] as const;

export function weekdayLabel(value: string): string {
  return WEEKDAY_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

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
  consultation_referred: "ارجاع به دپارتمان برای مشاوره",
  consultation_assessment_saved: "ارزیابی مشاوره ثبت شد",
  consultation_done: "مشاوره انجام شد",
  consultation_closed: "مشاوره بسته شد",
  enrollment_created: "ثبت‌نام انجام شد",
  enrollment_prepayment: "ثبت‌نام قطعی شد — پیش‌پرداخت دریافت شد",
  enrollment_activated: "ثبت‌نام فعال شد",
  enrollment_dropped: "انصراف از ثبت‌نام",
  payment_recorded: "پرداخت ثبت شد",
  payment_refunded: "بازپرداخت انجام شد",
  task_created: "وظیفه ایجاد شد",
  course_completed: "دوره تکمیل شد",
  manual_note: "یادداشت",
  // Legacy / dotted action keys (mock data and older rows)
  "enrollment.created": "ثبت‌نام انجام شد",
  "enrollment.dropped": "ثبت‌نام لغو شد",
  "enrollment.completed": "ثبت‌نام تکمیل شد",
  "person.status_changed": "وضعیت شخص تغییر کرد",
  "person.created": "شخص جدید ثبت شد",
  "note.added": "یادداشت اضافه شد",
  "consultation.completed": "مشاوره تکمیل شد",
  "consultation.scheduled": "مشاوره زمان‌بندی شد",
  "payment.recorded": "پرداخت ثبت شد",
  "refund.recorded": "استرداد ثبت شد",
  "task.created": "وظیفه ایجاد شد",
  "task.completed": "وظیفه تکمیل شد",
  "invoice.created": "فاکتور صادر شد",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? "رویداد ثبت‌شده";
}

