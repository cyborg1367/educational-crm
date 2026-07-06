import type { ConsultationRead, TaskRead } from "@/lib/api/types";

export function buildEnrollmentWizardHref(
  task: TaskRead,
  consultation: ConsultationRead | null,
): string {
  const params = new URLSearchParams();
  params.set("person_id", String(task.person_id));
  params.set("task_id", String(task.id));
  if (consultation?.recommended_course_id != null) {
    params.set("course_id", String(consultation.recommended_course_id));
  }
  return `/enrollments/new?${params.toString()}`;
}

export function isFollowUpRegistrationTask(task: TaskRead): boolean {
  return task.type === "follow_up_registration" && task.status === "open";
}
