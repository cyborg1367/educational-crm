/* Auto-generated from docs/frontend/tokens.json — do not edit */
export const statusMap = {
  "person.prospect": "color.status.neutral",
  "person.lead": "color.status.info",
  "person.student": "color.status.success",
  "person.dormant": "color.status.warning-muted",
  "person.alumni": "color.status.brand-muted",
  "enrollment.pre_enroll": "color.status.info",
  "enrollment.active": "color.status.success",
  "enrollment.completed": "color.status.success-muted",
  "enrollment.dropped": "color.status.danger-strong",
  "invoice.open": "color.status.neutral",
  "invoice.partially_paid": "color.status.warning",
  "invoice.paid": "color.status.success",
  "installment.pending": "color.status.neutral",
  "installment.partially_paid": "color.status.warning",
  "installment.paid": "color.status.success",
  "installment.overdue": "color.status.danger",
  "installment.cancelled": "color.status.neutral-muted",
  "task.open": "color.status.neutral",
  "task.done": "color.status.success-muted",
  "task.cancelled": "color.status.neutral-muted",
  "class.planned": "color.status.neutral",
  "class.active": "color.status.success",
  "class.completed": "color.status.success-muted",
  "class.cancelled": "color.status.neutral-muted",
  "journey.active": "color.status.success",
  "journey.completed": "color.status.success-muted"
} as const;

/** Backend enum values that receive the high-urgency leading dot (03-design-tokens.md §1.2). */
export const highUrgencyStatusValues = ["dropped", "overdue"] as const;

export type StatusMapKey = keyof typeof statusMap;

/** Convert a semantic status token path to a CSS custom property reference. */
export function statusTokenToCssVar(tokenPath: string): string {
  const cssKey = tokenPath.replace(/^color\.status\./, "semantic.color.status.");
  return `var(--${cssKey.replace(/\./g, "-")})`;
}

export function lookupStatusToken(domain: string, value: string): string | undefined {
  const key = `${domain}.${value}`;
  return statusMap[key as StatusMapKey];
}
