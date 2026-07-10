"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  GraduationCap,
  MessageSquare,
  RotateCcw,
  ShieldOff,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Wallet,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

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
import { formatDateTimeDisplay, todayStorage } from "@/lib/locale/date";
import { formatToman } from "@/lib/locale";
import { mergeTimelineEntries, type TimelineEntry } from "@/lib/timeline/merge";
import {
  installmentPositionLabel,
  remainingInstallmentsLabel,
} from "@/lib/timeline/copy";
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

/** Icon + accent color for each activity action — gives every event a distinct visual identity. */
const ACTIVITY_VISUALS: Record<string, { icon: LucideIcon; color: string }> = {
  person_created: {
    icon: UserPlus,
    color: "var(--semantic-color-action-primary)",
  },
  consultation_referred: {
    icon: MessageSquare,
    color: "var(--semantic-color-action-primary)",
  },
  consultation_assessment_saved: {
    icon: Sparkles,
    color: "var(--semantic-color-status-neutral)",
  },
  consultation_done: {
    icon: CheckCircle2,
    color: "var(--semantic-color-action-primary)",
  },
  consultation_closed: {
    icon: XCircle,
    color: "var(--semantic-color-status-neutral)",
  },
  enrollment_created: {
    icon: GraduationCap,
    color: "var(--semantic-color-status-success)",
  },
  enrollment_prepayment: {
    icon: Wallet,
    color: "var(--semantic-color-status-success)",
  },
  enrollment_activated: {
    icon: CheckCircle2,
    color: "var(--semantic-color-status-success)",
  },
  enrollment_dropped: {
    icon: XCircle,
    color: "var(--semantic-color-status-danger)",
  },
  enrollment_path_gap_warning: {
    icon: ShieldOff,
    color: "var(--semantic-color-status-warning)",
  },
  payment_recorded: {
    icon: Coins,
    color: "var(--semantic-color-status-warning)",
  },
  payment_refunded: {
    icon: RotateCcw,
    color: "var(--semantic-color-status-danger)",
  },
  task_created: {
    icon: Clock,
    color: "var(--semantic-color-status-neutral)",
  },
  course_completed: {
    icon: GraduationCap,
    color: "var(--semantic-color-status-success)",
  },
  roadmap_step_waived: {
    icon: ShieldCheck,
    color: "var(--semantic-color-status-neutral)",
  },
  roadmap_step_unwaived: {
    icon: ShieldOff,
    color: "var(--semantic-color-status-neutral)",
  },
  manual_note: {
    icon: MessageSquare,
    color: "var(--semantic-color-status-neutral)",
  },
};

const DEFAULT_ACTIVITY_VISUAL = { icon: Zap, color: "var(--semantic-color-surface-border)" };

function activityVisual(action: string): { icon: LucideIcon; color: string } {
  return ACTIVITY_VISUALS[action] ?? DEFAULT_ACTIVITY_VISUAL;
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
  const linkClassName = cn(
    detailClassName,
    "inline-flex items-center gap-1 font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-action-primary)]",
    "hover:text-[var(--semantic-color-action-primaryHover)]",
  );

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
      return actor ? <p className={detailClassName}>توسط: {actor}</p> : null;
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
    case "enrollment_prepayment": {
      const className = payloadString(payload, "class_name");
      const amount = payloadNumber(payload, "upfront_amount");
      const remaining = payloadNumber(payload, "remaining_installments");
      const enrollmentId = payloadNumber(payload, "enrollment_id");
      const actor = actorName(actorId, usersMap);
      return (
        <>
          {className ? (
            <p className={detailClassName}>کلاس: {className}</p>
          ) : null}
          {amount != null ? (
            <p className={detailClassName}>
              پیش‌پرداخت: {formatToman(amount)} تومان
            </p>
          ) : null}
          {remaining != null ? (
            <p className={detailClassName}>
              {remainingInstallmentsLabel(remaining)}
            </p>
          ) : null}
          {actor ? <p className={detailClassName}>توسط: {actor}</p> : null}
          {enrollmentId != null ? (
            <Link href={`/enrollments/${enrollmentId}`} className={linkClassName}>
              مشاهده ثبت‌نام ←
            </Link>
          ) : null}
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
            <Link href={`/enrollments/${enrollmentId}`} className={linkClassName}>
              مشاهده ثبت‌نام ←
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
    case "enrollment_path_gap_warning": {
      const courseName = payloadString(payload, "course_name");
      const gapCount = payloadNumber(payload, "gap_item_count");
      const enrollmentId = payloadNumber(payload, "enrollment_id");
      const actor = actorName(actorId, usersMap);
      return (
        <>
          {courseName ? (
            <p className={detailClassName}>دوره: {courseName}</p>
          ) : null}
          {gapCount != null ? (
            <p className={detailClassName}>
              {gapCount} مرحله پیش‌نیاز هنوز تکمیل یا معاف نشده است
            </p>
          ) : null}
          {actor ? <p className={detailClassName}>توسط: {actor}</p> : null}
          {enrollmentId != null ? (
            <Link href={`/enrollments/${enrollmentId}`} className={linkClassName}>
              مشاهده ثبت‌نام ←
            </Link>
          ) : null}
        </>
      );
    }
    case "roadmap_step_waived":
    case "roadmap_step_unwaived": {
      const stepTitle = payloadString(payload, "roadmap_item_title");
      const reason = payloadString(payload, "reason");
      const actor = actorName(actorId, usersMap);
      return (
        <>
          {stepTitle ? (
            <p className={detailClassName}>مرحله: {stepTitle}</p>
          ) : null}
          {reason ? <p className={detailClassName}>دلیل: {reason}</p> : null}
          {actor ? <p className={detailClassName}>توسط: {actor}</p> : null}
        </>
      );
    }
    case "payment_recorded": {
      const amount = payloadNumber(payload, "amount");
      const sequence = payloadNumber(payload, "installment_sequence");
      const total = payloadNumber(payload, "total_installments");
      const remaining = payloadNumber(payload, "remaining_unpaid_installments");
      const actor = actorName(actorId, usersMap);
      return (
        <>
          {amount != null ? (
            <p className={detailClassName}>
              مبلغ: {formatToman(amount)} تومان
            </p>
          ) : null}
          {sequence != null && total != null ? (
            <p className={detailClassName}>
              {installmentPositionLabel(sequence, total)}
            </p>
          ) : null}
          {remaining != null ? (
            <p className={detailClassName}>
              {remainingInstallmentsLabel(remaining)}
            </p>
          ) : null}
          {actor ? <p className={detailClassName}>توسط: {actor}</p> : null}
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
      return <p className={detailClassName}>دوره با موفقیت تکمیل شد</p>;
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
  showConnector,
}: {
  entry: TimelineEntry;
  usersMap?: Record<number, string>;
  showConnector: boolean;
}) {
  const isActivity = entry.kind === "activity";
  const label = isActivity ? actionLabel(entry.action) : entry.channelLabel;
  const visual = isActivity
    ? activityVisual(entry.action)
    : { icon: MessageSquare, color: "var(--semantic-color-action-primary)" };
  const Icon = visual.icon;

  return (
    <article className="group flex gap-[var(--primitive-space-3)]">
      <div className="flex shrink-0 flex-col items-center">
        <div
          className={cn(
            "flex size-[var(--primitive-space-9)] items-center justify-center rounded-[var(--primitive-radius-full)]",
            "ring-4 ring-[var(--semantic-color-surface-card)] transition-transform duration-150 group-hover:scale-105",
          )}
          style={{
            backgroundColor: `color-mix(in srgb, ${visual.color} 14%, var(--semantic-color-surface-card))`,
            color: visual.color,
          }}
          aria-hidden
        >
          <Icon className="size-[var(--primitive-space-4)]" strokeWidth={2.25} />
        </div>
        {showConnector ? (
          <div
            className="mt-[var(--primitive-space-1)] w-px flex-1 bg-[var(--semantic-color-surface-border)]"
            aria-hidden
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1 pb-[var(--primitive-space-5)]">
        <div className="flex flex-wrap items-baseline gap-x-[var(--primitive-space-2)]">
          <p className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] leading-[var(--primitive-font-lineHeight-sm)] text-[var(--semantic-color-text-primary)]">
            {label}
          </p>
          <time
            dateTime={entry.created_at}
            className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-disabled)]"
          >
            {formatDateTimeDisplay(entry.created_at, "HH:mm")}
          </time>
        </div>
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

function dayGroupLabel(isoDateTime: string): string {
  const dateOnly = formatDateTimeDisplay(isoDateTime, "YYYY/MM/DD");
  const today = formatDateTimeDisplay(new Date().toISOString(), "YYYY/MM/DD");
  const yesterday = formatDateTimeDisplay(
    new Date(Date.now() - 86_400_000).toISOString(),
    "YYYY/MM/DD",
  );
  if (dateOnly === today) return "امروز";
  if (dateOnly === yesterday) return "دیروز";
  return dateOnly;
}

type TimelineDayGroup = {
  key: string;
  label: string;
  entries: TimelineEntry[];
};

function groupEntriesByDay(entries: TimelineEntry[]): TimelineDayGroup[] {
  const groups: TimelineDayGroup[] = [];
  for (const entry of entries) {
    const dateKey = formatDateTimeDisplay(entry.created_at, "YYYY/MM/DD");
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.key === dateKey) {
      lastGroup.entries.push(entry);
    } else {
      groups.push({
        key: dateKey,
        label: dayGroupLabel(entry.created_at),
        entries: [entry],
      });
    }
  }
  return groups;
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
        <EmptyState icon={Clock} message="رویدادی ثبت نشده است" />
      </div>
    );
  }

  const groups = groupEntriesByDay(entries);

  return (
    <div className={className} role="feed" aria-label="تایم‌لاین">
      {groups.map((group, groupIndex) => (
        <section key={group.key} className="mb-[var(--primitive-space-2)]">
          <div className="mb-[var(--primitive-space-3)] flex items-center gap-[var(--primitive-space-2)]">
            <CalendarClock
              className="size-[var(--primitive-space-4)] text-[var(--semantic-color-text-disabled)]"
              aria-hidden
            />
            <p className="text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-semibold)] uppercase tracking-wide text-[var(--semantic-color-text-secondary)]">
              {group.label}
            </p>
            <div
              className="h-px flex-1 bg-[var(--semantic-color-surface-border)]"
              aria-hidden
            />
          </div>
          {group.entries.map((entry, entryIndex) => (
            <TimelineRow
              key={`${entry.kind}-${entry.id}`}
              entry={entry}
              usersMap={usersMap}
              showConnector={
                entryIndex < group.entries.length - 1 ||
                groupIndex < groups.length - 1
              }
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function Timeline(props: TimelineProps) {
  const fetchKey = `${props.personId}-${props.orgId}-${props.useMock ?? "default"}`;

  return <TimelineBody key={fetchKey} {...props} />;
}

export { Timeline };
