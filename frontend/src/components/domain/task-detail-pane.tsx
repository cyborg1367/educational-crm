"use client";

import * as React from "react";

import { RelationshipCard } from "@/components/data-display";
import { StatusAction, StatusBadge } from "@/components/domain";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/ui/button";
import type { ConsultationRead, TaskRead } from "@/lib/api/types";
import { formatDateDisplay, todayStorage } from "@/lib/locale/date";
import { formatPhoneDisplay } from "@/lib/locale/number";
import { isConsultationIntakeTask } from "@/lib/task/consultation-task";
import {
  buildEnrollmentWizardHref,
  isFollowUpRegistrationTask,
} from "@/lib/task/enrollment-from-task";
import {
  formatDueRelative,
  relatedEntityHref,
  relatedEntityLabel,
} from "@/lib/task/queue";
import {
  levelLabel,
  motivationLabel,
  TASK_TYPE_LABELS,
} from "@/lib/terminology";

export type TaskDetailPaneProps = {
  task: TaskRead;
  personName: string;
  personPhone?: string | null;
  assigneeName?: string | null;
  linkedConsultation?: ConsultationRead | null;
  loadingConsultation?: boolean;
  recommendedCourseName?: string | null;
  completing?: boolean;
  onMarkComplete: () => void;
  onNavigate: (href: string) => void;
  today?: string;
};

/**
 * Summary of the consultation behind a task — replaces a bare "#id" link
 * with the fields admission/department staff actually need to act on the
 * task (level, motivation, recommended course, outcome, notes).
 */
function ConsultationSummaryCard({
  consultation,
  recommendedCourseName,
  loading,
}: {
  consultation: ConsultationRead | null;
  recommendedCourseName?: string | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-4)]">
        <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          در حال بارگذاری مشاوره…
        </p>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-4)]">
        <p className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
          مشاوره
        </p>
        <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-disabled)]">
          اطلاعات مشاوره در دسترس نیست.
        </p>
      </div>
    );
  }

  const rows: { label: string; value: string }[] = [];
  if (consultation.current_level) {
    rows.push({ label: "سطح دانش", value: levelLabel(consultation.current_level) });
  }
  if (consultation.goal) {
    rows.push({ label: "انگیزه", value: motivationLabel(consultation.goal) });
  }
  if (recommendedCourseName) {
    rows.push({ label: "دوره پیشنهادی", value: recommendedCourseName });
  }

  return (
    <div className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-4)]">
      <div className="flex items-center justify-between gap-[var(--primitive-space-2)]">
        <p className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
          مشاوره
        </p>
        {consultation.outcome ? (
          <StatusBadge domain="consultation" value={consultation.outcome} />
        ) : (
          <span className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-disabled)]">
            در انتظار نتیجه
          </span>
        )}
      </div>

      {rows.length > 0 ? (
        <dl className="mt-[var(--primitive-space-3)] flex flex-col gap-[var(--primitive-space-2)]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-[var(--primitive-space-3)]"
            >
              <dt className="shrink-0 text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                {row.label}
              </dt>
              <dd className="truncate text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {consultation.notes?.trim() ? (
        <p className="mt-[var(--primitive-space-3)] border-t border-[var(--semantic-color-surface-border)] pt-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] leading-relaxed text-[var(--semantic-color-text-primary)]">
          {consultation.notes}
        </p>
      ) : null}
    </div>
  );
}

function primaryCta(task: TaskRead): {
  label: string;
  href: string;
  suppressComplete?: boolean;
} | null {
  if (task.status !== "open") return null;

  if (isConsultationIntakeTask(task) && task.related_entity_id != null) {
    return {
      label: "ادامه مشاوره",
      href: `/people/${task.person_id}/consultations/${task.related_entity_id}`,
      suppressComplete: true,
    };
  }

  if (isFollowUpRegistrationTask(task)) {
    return null; // resolved with consultation in component
  }

  if (task.type === "installment_overdue" || task.type === "pre_enroll_unpaid") {
    const related = relatedEntityHref(task);
    return {
      label:
        task.type === "installment_overdue"
          ? "مشاهده بدهی / فاکتور"
          : "پیگیری پیش‌ثبت‌نام",
      href: related ?? `/people/${task.person_id}`,
    };
  }

  if (task.type === "consultation_follow_up") {
    const related = relatedEntityHref(task);
    return {
      label: related ? "مشاهده مشاوره قبلی" : "باز کردن پرونده شخص",
      href: related ?? `/people/${task.person_id}`,
    };
  }

  if (
    task.type === "referral" ||
    task.type === "dormant_followup" ||
    task.type === "post_course_consultation" ||
    task.type === "custom"
  ) {
    const related = relatedEntityHref(task);
    return {
      label: related ? "باز کردن مورد مرتبط" : "باز کردن پرونده شخص",
      href: related ?? `/people/${task.person_id}`,
    };
  }

  return {
    label: "باز کردن پرونده شخص",
    href: `/people/${task.person_id}`,
  };
}

function TaskDetailPane({
  task,
  personName,
  personPhone,
  assigneeName,
  linkedConsultation = null,
  loadingConsultation = false,
  recommendedCourseName = null,
  completing = false,
  onMarkComplete,
  onNavigate,
  today = todayStorage(),
}: TaskDetailPaneProps) {
  const intake = isConsultationIntakeTask(task);
  const followUpEnrollment = isFollowUpRegistrationTask(task);
  const enrollmentHref = followUpEnrollment
    ? buildEnrollmentWizardHref(task, linkedConsultation)
    : null;
  const cta = primaryCta(task);
  const relatedHref = relatedEntityHref(task);
  const relativeDue = formatDueRelative(task.due_date, today);
  const absoluteDue = formatDateDisplay(task.due_date);
  // Enrollment-follow-up tasks close themselves when the enrollment wizard
  // finishes (see enrollments/new/page.tsx) — a manual "تکمیل" here would let
  // staff skip the wizard entirely and mark registration done with no
  // enrollment ever created.
  const showComplete = task.status === "open" && !intake && !followUpEnrollment;

  return (
    <div className="flex h-full flex-col gap-[var(--primitive-space-5)] p-[var(--primitive-space-6)]">
      <div>
        <div className="mb-[var(--primitive-space-2)] flex flex-wrap items-center gap-[var(--primitive-space-2)]">
          <Badge>{TASK_TYPE_LABELS[task.type]}</Badge>
          <StatusBadge domain="task" value={task.status} />
        </div>
        <h2 className="text-[length:var(--primitive-font-size-xl)] font-[var(--primitive-font-weight-semibold)] tracking-tight text-[var(--semantic-color-text-primary)]">
          {task.title}
        </h2>
        <div className="mt-[var(--primitive-space-2)] h-0.5 w-8 rounded-full bg-[var(--primitive-color-brand-500)]" aria-hidden />
        <p className="mt-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          موعد:{" "}
          <span className="font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
            {relativeDue}
          </span>
          <span className="text-[var(--semantic-color-text-disabled)]">
            {" "}
            · {absoluteDue}
          </span>
        </p>
        {assigneeName ? (
          <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
            مسئول: {assigneeName}
          </p>
        ) : (
          <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-disabled)]">
            بدون مسئول
          </p>
        )}
      </div>

      <p className="text-[length:var(--primitive-font-size-sm)] leading-relaxed text-[var(--semantic-color-text-primary)]">
        {task.description?.trim() || "توضیحی ثبت نشده است."}
      </p>

      <RelationshipCard
        label="دانش‌پذیر"
        title={personName}
        subtitle={personPhone ? formatPhoneDisplay(personPhone) : undefined}
        href={`/people/${task.person_id}`}
      />

      {task.related_entity_type === "consultation" ? (
        <ConsultationSummaryCard
          consultation={linkedConsultation}
          recommendedCourseName={recommendedCourseName}
          loading={loadingConsultation}
        />
      ) : task.related_entity_type && task.related_entity_type !== "person" ? (
        <RelationshipCard
          label={relatedEntityLabel(task.related_entity_type)}
          title={`${relatedEntityLabel(task.related_entity_type)} #${task.related_entity_id ?? "—"}`}
          href={relatedHref}
        />
      ) : null}

      <div className="mt-auto flex flex-col gap-[var(--primitive-space-3)] border-t border-[var(--semantic-color-surface-border)] pt-[var(--primitive-space-5)]">
        {intake ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            ابتدا نتیجه مشاوره را ثبت کنید؛ تکمیل دستی این وظیفه لازم نیست.
          </p>
        ) : null}

        {followUpEnrollment ? (
          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            این وظیفه با انجام ثبت‌نام به‌صورت خودکار تکمیل می‌شود؛ تکمیل دستی لازم نیست.
          </p>
        ) : null}

        {followUpEnrollment && enrollmentHref ? (
          <Button
            type="button"
            variant="primary"
            disabled={loadingConsultation}
            onClick={() => onNavigate(enrollmentHref)}
          >
            شروع ثبت‌نام
          </Button>
        ) : null}

        {cta && !followUpEnrollment ? (
          <Button
            type="button"
            variant={intake ? "primary" : "secondary"}
            onClick={() => onNavigate(cta.href)}
          >
            {cta.label}
          </Button>
        ) : null}

        {showComplete ? (
          <StatusAction
            entity="task"
            status={task.status}
            onAction={onMarkComplete}
            className={completing ? "pointer-events-none opacity-60" : undefined}
          />
        ) : null}
      </div>
    </div>
  );
}

export { TaskDetailPane };
