"use client";

import * as React from "react";
import { Clock, MessageSquare, Zap } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { BlockSkeleton } from "@/components/feedback/skeleton";
import { fetchJson } from "@/lib/api/client";
import { shouldUseMockApi } from "@/lib/api/config";
import {
  mockActivitiesForPerson,
  mockCommunicationsForPerson,
} from "@/lib/api/mock/timeline";
import type {
  ActivityRead,
  CommunicationRead,
  PaginatedResponse,
} from "@/lib/api/types";
import type { ApiError } from "@/lib/api/error";
import { formatDateTimeDisplay } from "@/lib/locale/date";
import { mergeTimelineEntries, type TimelineEntry } from "@/lib/timeline/merge";
import { cn } from "@/lib/utils";

const TIMELINE_FETCH_LIMIT = 100;

export type TimelineProps = {
  personId: number;
  orgId: number;
  useMock?: boolean;
  className?: string;
};

async function fetchTimelineData(
  personId: number,
  orgId: number,
  useMock: boolean,
): Promise<TimelineEntry[]> {
  if (useMock) {
    const activities = mockActivitiesForPerson(personId, orgId);
    const communications = mockCommunicationsForPerson(personId, orgId);
    return mergeTimelineEntries(activities.items, communications.items);
  }

  const query = `person_id=${personId}&limit=${TIMELINE_FETCH_LIMIT}&offset=0`;
  const [activities, communications] = await Promise.all([
    fetchJson<PaginatedResponse<ActivityRead>>(`/activities?${query}`),
    fetchJson<PaginatedResponse<CommunicationRead>>(`/communications?${query}`),
  ]);

  return mergeTimelineEntries(activities.items, communications.items);
}

function TimelineRowSkeleton() {
  return (
    <div className="flex gap-[var(--primitive-space-3)] py-[var(--primitive-space-3)]">
      <BlockSkeleton
        className="size-[var(--primitive-space-10)] shrink-0 rounded-[var(--primitive-radius-full)]"
        height="var(--primitive-space-10)"
        width="var(--primitive-space-10)"
      />
      <div className="min-w-0 flex-1 space-y-[var(--primitive-space-2)]">
        <BlockSkeleton height="var(--primitive-space-3)" width="30%" />
        <BlockSkeleton height="var(--primitive-space-4)" width="45%" />
        <BlockSkeleton height="var(--primitive-space-4)" width="80%" />
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div aria-busy="true" aria-label="در حال بارگذاری تایم‌لاین">
      {Array.from({ length: 5 }).map((_, index) => (
        <TimelineRowSkeleton key={`timeline-skeleton-${index}`} />
      ))}
    </div>
  );
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const isActivity = entry.kind === "activity";
  const Icon = isActivity ? Zap : MessageSquare;
  const label = isActivity ? entry.actionLabel : entry.channelLabel;

  return (
    <article className="flex gap-[var(--primitive-space-3)] border-b border-[var(--semantic-color-surface-border)] py-[var(--primitive-space-4)] last:border-b-0">
      <div
        className={cn(
          "flex size-[var(--primitive-space-10)] shrink-0 items-center justify-center",
          "rounded-[var(--primitive-radius-full)] bg-[var(--semantic-color-surface-subtle)]",
          "text-[var(--semantic-color-text-secondary)]",
        )}
        aria-hidden
      >
        <Icon className="size-[var(--primitive-space-5)]" />
      </div>
      <div className="min-w-0 flex-1">
        <time
          dateTime={entry.created_at}
          className="text-[length:var(--primitive-font-size-xs)] leading-[var(--primitive-font-lineHeight-xs)] text-[var(--semantic-color-text-secondary)]"
        >
          {formatDateTimeDisplay(entry.created_at)}
        </time>
        <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-primary)]">
          {label}
        </p>
        <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-secondary)]">
          {entry.summary}
        </p>
      </div>
    </article>
  );
}

type TimelineBodyProps = TimelineProps;

function TimelineBody({ personId, orgId, useMock, className }: TimelineBodyProps) {
  const [entries, setEntries] = React.useState<TimelineEntry[] | null>(null);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    void fetchTimelineData(personId, orgId, shouldUseMockApi(useMock))
      .then((merged) => {
        if (!cancelled) {
          setEntries(merged);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const apiError =
            err &&
            typeof err === "object" &&
            "body" in err &&
            (err as { body: ApiError | null }).body
              ? (err as { body: ApiError }).body
              : {
                  detail: "خطا در بارگذاری تایم‌لاین",
                  error_code: "NOT_FOUND" as const,
                  timestamp: new Date().toISOString(),
                };
          setError(apiError);
          setEntries([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [personId, orgId, useMock]);

  if (loading) {
    return (
      <div className={className}>
        <TimelineSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorState error={error} />
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={Clock}
          message="رویدادی ثبت نشده است"
        />
      </div>
    );
  }

  return (
    <div className={className} role="feed" aria-label="تایم‌لاین">
      {entries.map((entry) => (
        <TimelineRow
          key={`${entry.kind}-${entry.id}`}
          entry={entry}
        />
      ))}
    </div>
  );
}

function Timeline(props: TimelineProps) {
  const fetchKey = `${props.personId}-${props.orgId}-${props.useMock ?? "default"}`;

  return <TimelineBody key={fetchKey} {...props} />;
}

export { Timeline };
