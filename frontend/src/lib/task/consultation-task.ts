import type { TaskRead } from "@/lib/api/types";

/** Intake reminder task created when a consultation is referred to a dept manager. */
export function isConsultationIntakeTask(task: TaskRead): boolean {
  return (
    task.related_entity_type === "consultation" &&
    task.type === "custom" &&
    task.status === "open"
  );
}
