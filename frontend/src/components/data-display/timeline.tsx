"use client";

import * as React from "react";
import Link from "next/link";
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
  TaskType,
} from "@/lib/api/types";
import type { ApiError } from "@/lib/api/error";
import { formatDateTimeDisplay } from "@/lib/locale/date";
import { formatToman } from "@/lib/locale";
import { mergeTimelineEntries, type TimelineEntry } from "@/lib/timeline/merge";
import {
  actionLabel,
  CONSULTATION_OUTCOME_LABELS,
  levelLabel,
  motivationLabel,
  sourceLabel,
  STATUS_DISPLAY_LABELS,
  TASK_TYPE_LABELS,
} from "@/lib/terminology";
import { cn } from "@/lib/utils";

const TIMELINE_FETCH_LIMIT = 100;

export type TimelineProps = {
  personId: number;
  orgId: number;
  useMock?: boolean;
  usersMap?: Record<number, string>;
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

function payloadString(
  payload: Record<string, unknown> | null,
  key: string,
): string | undefined {
  const value = payload?.[key];
  return typeof value === "string" ? value : undefined;
}

function payloadNumber(
  payload: Record<string, unknown> | null,
  key: string,
): number | undefined {
  const value = payload?.[key];
  return typeof value === "number" ? value : undefined;
}

function actorName(
  actorId: number | null,
  usersMap?: Record<number, string>,
): string | undefined {
  if (actorId == null || !usersMap) {
    return undefined;
  }
  return usersMap[actorId];
}

function activityBorderColor(action: string): string {
  if (action === "person_created") {
    return "var(--semantic-color-action-primary)";
  }
  if (action === "consultation_done" || action === "consultation_referred") {
    return "var(--semantic-color-action-primary)";
  }
  if (
    action === "enrollment_created" ||
    action === "enrollment_activated" ||
    action === "course_completed"
  ) {
    return "var(--semantic-color-status-success)";
  }
  if (action === "payment_recorded") {
    return "var(--semantic-color-status-warning)";
  }
  if (action === "task_created" || action === "manual_note") {
    return "var(--semantic-color-status-neutral)";
  }
  if (action === "enrollment_dropped" || action === "payment_refunded") {
    return "var(--semantic-color-status-danger)";
  }
  return "var(--semantic-color-surface-border)";
}

function ActivityDetails({
  action,
  payload,
  actorId,
  usersMap,
}: {
  action: string;
  payload: Record<string, unknown> | null;
  actorId: number | null;
  usersMap?: Record<number, string>;
}) {
  const detailClassName =
    "mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-secondary)]";

  switch (action) {
    case "person_created": {
      const status = payloadString(payload, "status");
      const source = payloadString(payload, "source");
      const actor = actorName(actorId, usersMap);
      return (
        <>
          {status ? (
            <p className={detailClassName}>
              وضعیت: {STATUS_DISPLAY_LABELS[`person.${status}`] ?? status}
            </p>
          ) : null}
          {source ? (
            <p className={detailClassName}>منبع: {sourceLabel(source)}</p>
          ) : null}
          {actor ? <p className={detailClassName}>توسط: {actor}</p> : null}
        </>
      );
    }
    case "consultation_referred": {
      const departmentName = payloadString(payload, "department_name");
      const notes = payloadString(payload, "notes");
      const consultantId = payloadNumber(payload, "consultant_id");
      const consultant = actorName(consultantId ?? null, usersMap);
      const referrer = actorName(actorId, usersMap);
      return (
        <>
          {departmentName ? (
            <p className={detailClassName}>دپارتمان: {departmentName}</p>
          ) : null}
          {consultant ? (
            <p className={detailClassName}>مشاور: {consultant}</p>
          ) : null}
          {referrer ? (
            <p className={detailClassName}>ارجاع‌دهنده: {referrer}</p>
          ) : null}
          {notes ? <p className={detailClassName}>{notes}</p> : null}
        </>
      );
    }
    case "consultation_assessment_saved": {
      const actor = actorName(actorId, usersMap);
      const consultationId = payloadNumber(payload, "consultation_id");
      return (
        <>
          {consultationId != null ? (
            <p className={detailClassName}>مشاوره #{consultationId}</p>
          ) : null}
          {actor ? <p className={detailClassName}>توسط: {actor}</p> : null}
        </>
      );
    }
    case "consultation_done": {
      const outcome = payloadString(payload, "outcome");
      const level = payloadString(payload, "current_level");
      const motivation = payloadString(payload, "goal");
      const courseName = payloadString(payload, "recommended_course_name");
      const actor = actorName(actorId, usersMap);
      return (
        <>
          {outcome ? (
            <p className={detailClassName}>
              نتیجه:{" "}
              {CONSULTATION_OUTCOME_LABELS[
                outcome as keyof typeof CONSULTATION_OUTCOME_LABELS
              ] ?? outcome}
            </p>
          ) : null}
          {level ? (
            <p className={detailClassName}>سطح: {levelLabel(level)}</p>
          ) : null}
          {motivation ? (
            <p className={detailClassName}>
              انگیزه: {motivationLabel(motivation)}
            </p>
          ) : null}
          {courseName ? (
            <p className={detailClassName}>دوره پیشنهادی: {courseName}</p>
          ) : null}
          {actor ? <p className={detailClassName}>توسط: {actor}</p> : null}
        </>
      );
    }
    case "enrollment_created": {
      const status = payloadString(payload, "status");
      const enrollmentId = payloadNumber(payload, "enrollment_id");
      return (
        <>
          {status ? (
            <p className={detailClassName}>
              وضعیت: {STATUS_DISPLAY_LABELS[`enrollment.${status}`] ?? status}
            </p>
          ) : null}
          {enrollmentId != null ? (
            <Link
              href={`/enrollments/${enrollmentId}`}
              className={cn(
                detailClassName,
                "inline-block font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-action-primary)]",
                "hover:text-[var(--semantic-color-action-primaryHover)]",
              )}
            >
              مشاهده ثبت‌نام →
            </Link>
          ) : null}
        </>
      );
    }
    case "enrollment_dropped": {
      const reason = payloadString(payload, "reason");
      return reason ? (
        <p
          className={cn(
            detailClassName,
            "text-[var(--semantic-color-status-danger)]",
          )}
        >
          دلیل: {reason}
        </p>
      ) : null;
    }
    case "payment_recorded": {
      const amount = payloadNumber(payload, "amount");
      const installmentId = payloadNumber(payload, "installment_id");
      return (
        <>
          {amount != null ? (
            <p className={detailClassName}>
              مبلغ: {formatToman(amount)} تومان
            </p>
          ) : null}
          {installmentId != null ? (
            <p className={detailClassName}>قسط: #{installmentId}</p>
          ) : null}
        </>
      );
    }
    case "payment_refunded": {
      const amount = payloadNumber(payload, "amount");
      return amount != null ? (
        <p className={detailClassName}>
          مبلغ بازگشتی: {formatToman(amount)} تومان
        </p>
      ) : null;
    }
    case "task_created": {
      const taskType = payloadString(payload, "task_type");
      const title = payloadString(payload, "title");
      return (
        <>
          {taskType ? (
            <p className={detailClassName}>
              نوع: {TASK_TYPE_LABELS[taskType as TaskType] ?? taskType}
            </p>
          ) : null}
          {title ? <p className={detailClassName}>{title}</p> : null}
        </>
      );
    }
    case "course_completed":
      return (
        <p className={detailClassName}>دوره با موفقیت تکمیل شد</p>
      );
    default:
      return null;
  }
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

function TimelineRow({
  entry,
  usersMap,
}: {
  entry: TimelineEntry;
  usersMap?: Record<number, string>;
}) {
  const isActivity = entry.kind === "activity";
  const Icon = isActivity ? Zap : MessageSquare;
  const label = isActivity
    ? actionLabel(entry.action)
    : entry.channelLabel;
  const borderColor = isActivity
    ? activityBorderColor(entry.action)
    : undefined;

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
      <div
        className={cn(
          "min-w-0 flex-1",
          borderColor &&
            "border-s-[2px] ps-[var(--primitive-space-3)]",
        )}
        style={borderColor ? { borderInlineStartColor: borderColor } : undefined}
      >
        <time
          dateTime={entry.created_at}
          className="text-[length:var(--primitive-font-size-xs)] leading-[var(--primitive-font-lineHeight-xs)] text-[var(--semantic-color-text-secondary)]"
        >
          {formatDateTimeDisplay(entry.created_at)}
        </time>
        <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-primary)]">
          {label}
        </p>
        {isActivity ? (
          <ActivityDetails
            action={entry.action}
            payload={entry.payload}
            actorId={entry.actor_id}
            usersMap={usersMap}
          />
        ) : (
          <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-secondary)]">
            {entry.summary}
          </p>
        )}
      </div>
    </article>
  );
}

type TimelineBodyProps = TimelineProps;

function TimelineBody({
  personId,
  orgId,
  useMock,
  usersMap,
  className,
}: TimelineBodyProps) {
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
          usersMap={usersMap}
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
