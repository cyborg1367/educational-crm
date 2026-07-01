import type {
  ActivityRead,
  CommunicationRead,
  PaginatedResponse,
} from "@/lib/api/types";

function paginated<T>(items: T[], limit = 100): PaginatedResponse<T> {
  return {
    items,
    total_count: items.length,
    limit,
    offset: 0,
    has_more: false,
  };
}

export function mockActivitiesForPerson(
  personId: number,
  orgId: number,
): PaginatedResponse<ActivityRead> {
  if (personId === 0) {
    return paginated<ActivityRead>([]);
  }
  const items: ActivityRead[] = [
    {
      id: 1,
      person_id: personId,
      action: "enrollment.created",
      payload: { enrollment_id: 10, class_name: "IELTS Morning Batch" },
      actor_id: 2,
      org_id: orgId,
      created_at: "2026-03-15T10:30:00Z",
    },
    {
      id: 2,
      person_id: personId,
      action: "person.status_changed",
      payload: { from: "lead", to: "student" },
      actor_id: 2,
      org_id: orgId,
      created_at: "2026-03-10T14:00:00Z",
    },
    {
      id: 3,
      person_id: personId,
      action: "note.added",
      payload: { note: "علاقه‌مند به کلاس عصر" },
      actor_id: 3,
      org_id: orgId,
      created_at: "2026-03-05T09:15:00Z",
    },
    {
      id: 4,
      person_id: personId,
      action: "consultation.completed",
      payload: { outcome: "pre_enroll" },
      actor_id: 2,
      org_id: orgId,
      created_at: "2026-02-28T16:45:00Z",
    },
  ];
  return paginated(items);
}

export function mockCommunicationsForPerson(
  personId: number,
  orgId: number,
): PaginatedResponse<CommunicationRead> {
  if (personId === 0) {
    return paginated<CommunicationRead>([]);
  }
  const items: CommunicationRead[] = [
    {
      id: 1,
      person_id: personId,
      channel: "phone",
      direction: "outbound",
      content: "تماس برای تأیید زمان کلاس و پرداخت اولین قسط.",
      metadata: { duration_minutes: 8 },
      org_id: orgId,
      created_at: "2026-03-14T11:00:00Z",
      updated_at: "2026-03-14T11:00:00Z",
    },
    {
      id: 2,
      person_id: personId,
      channel: "sms",
      direction: "outbound",
      content: "یادآوری جلسه مشاوره فردا ساعت ۱۰.",
      metadata: null,
      org_id: orgId,
      created_at: "2026-03-08T08:30:00Z",
      updated_at: "2026-03-08T08:30:00Z",
    },
    {
      id: 3,
      person_id: personId,
      channel: "email",
      direction: "inbound",
      content: "درخواست تغییر زمان کلاس به شیفت عصر.",
      metadata: null,
      org_id: orgId,
      created_at: "2026-03-01T13:20:00Z",
      updated_at: "2026-03-01T13:20:00Z",
    },
  ];
  return paginated(items);
}

export function mockEmptyTimeline(): {
  activities: PaginatedResponse<ActivityRead>;
  communications: PaginatedResponse<CommunicationRead>;
} {
  return {
    activities: paginated<ActivityRead>([]),
    communications: paginated<CommunicationRead>([]),
  };
}
