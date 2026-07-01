import type { ActivityRead, CommunicationRead } from "@/lib/api/types";
import {
  extractActivitySummary,
  formatActivityActionLabel,
  formatCommunicationLabel,
} from "@/lib/timeline/labels";

export type TimelineActivityEntry = {
  kind: "activity";
  id: number;
  created_at: string;
  action: string;
  actionLabel: string;
  summary: string;
};

export type TimelineCommunicationEntry = {
  kind: "communication";
  id: number;
  created_at: string;
  channel: string;
  direction: string;
  channelLabel: string;
  summary: string;
};

export type TimelineEntry =
  | TimelineActivityEntry
  | TimelineCommunicationEntry;

function toActivityEntry(activity: ActivityRead): TimelineActivityEntry {
  return {
    kind: "activity",
    id: activity.id,
    created_at: activity.created_at,
    action: activity.action,
    actionLabel: formatActivityActionLabel(activity.action),
    summary: extractActivitySummary(activity.action, activity.payload),
  };
}

function toCommunicationEntry(
  communication: CommunicationRead,
): TimelineCommunicationEntry {
  return {
    kind: "communication",
    id: communication.id,
    created_at: communication.created_at,
    channel: communication.channel,
    direction: communication.direction,
    channelLabel: formatCommunicationLabel(
      communication.channel,
      communication.direction,
    ),
    summary: communication.content,
  };
}

/**
 * Merge Activity + Communication lists into one stream sorted by created_at descending.
 * This is the single source of truth — screens must not re-implement this logic.
 */
export function mergeTimelineEntries(
  activities: ActivityRead[],
  communications: CommunicationRead[],
): TimelineEntry[] {
  const merged: TimelineEntry[] = [
    ...activities.map(toActivityEntry),
    ...communications.map(toCommunicationEntry),
  ];

  return merged.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
