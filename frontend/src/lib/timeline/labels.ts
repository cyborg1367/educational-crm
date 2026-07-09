const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  "enrollment.created": "ثبت‌نام ایجاد شد",
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

const CHANNEL_LABELS: Record<string, string> = {
  email: "ایمیل",
  sms: "پیامک",
  phone: "تماس تلفنی",
  in_person: "حضوری",
  chat: "چت",
};

const DIRECTION_LABELS: Record<string, string> = {
  inbound: "ورودی",
  outbound: "خروجی",
};

function humanizeKey(key: string): string {
  return key.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatActivityActionLabel(action: string): string {
  return ACTIVITY_ACTION_LABELS[action] ?? humanizeKey(action);
}

export function formatCommunicationLabel(
  channel: string,
  direction: string,
): string {
  const channelLabel = CHANNEL_LABELS[channel] ?? humanizeKey(channel);
  const directionLabel = DIRECTION_LABELS[direction] ?? humanizeKey(direction);
  return `${channelLabel} — ${directionLabel}`;
}

export function extractActivitySummary(
  action: string,
  payload: Record<string, unknown> | null,
): string {
  if (payload) {
    if (typeof payload.summary === "string" && payload.summary.trim()) {
      return payload.summary;
    }
    if (typeof payload.note === "string" && payload.note.trim()) {
      return payload.note;
    }
    if (typeof payload.class_name === "string") {
      return `کلاس: ${payload.class_name}`;
    }
  }
  return formatActivityActionLabel(action);
}
