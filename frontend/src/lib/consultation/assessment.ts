import type { ConsultationRead } from "@/lib/api/types";

/** Assessment fields are optional in v1 — never blocks the outcome step. */
export function isConsultationAssessmentComplete(
  _consultation: Pick<
    ConsultationRead,
    "current_level" | "goal" | "recommended_course_id"
  >,
): boolean {
  return true;
}

export function assessmentStatusLabel(
  consultation: Pick<
    ConsultationRead,
    "current_level" | "goal" | "recommended_course_id"
  >,
): string {
  const hasAny =
    Boolean(consultation.current_level?.trim()) ||
    Boolean(consultation.goal?.trim()) ||
    consultation.recommended_course_id != null;
  return hasAny ? "ارزیابی ثبت‌شده" : "بدون ارزیابی";
}
