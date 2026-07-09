import type { PersonStatus } from "@/lib/api/types";

export const STALE_LEAD_DAYS = 14;

/**
 * Client-side stale-lead flag — docs/frontend/02-ux-guidelines-design-principles.md §1.5
 * Returns true only when status is lead AND last activity is older than N days.
 * When lastActivityAt is unavailable, returns false (dot omitted).
 */
export function isStaleLead(
  status: PersonStatus,
  lastActivityAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (status !== "lead" || !lastActivityAt) {
    return false;
  }

  const last = new Date(lastActivityAt);
  if (Number.isNaN(last.getTime())) {
    return false;
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - STALE_LEAD_DAYS);
  return last < cutoff;
}

/** Build person_id → most recent activity/communication timestamp. */
export function buildLastActivityMap(
  activities: { person_id: number; created_at: string }[],
  communications: { person_id: number; created_at: string }[],
): Map<number, string> {
  const map = new Map<number, string>();

  for (const entry of [...activities, ...communications]) {
    const existing = map.get(entry.person_id);
    if (!existing || entry.created_at > existing) {
      map.set(entry.person_id, entry.created_at);
    }
  }

  return map;
}

export async function fetchLastActivityForPerson(
  personId: number,
): Promise<string | null> {
  const { listActivities, listCommunications } = await import("@/lib/api/people");
  const [activities, communications] = await Promise.all([
    listActivities({ person_id: personId, limit: 100 }),
    listCommunications({ person_id: personId, limit: 100 }),
  ]);

  const map = buildLastActivityMap(activities.items, communications.items);
  return map.get(personId) ?? null;
}
