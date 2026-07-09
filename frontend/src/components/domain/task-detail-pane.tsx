"use client";

import * as React from "react";

import { RelationshipCard } from "@/components/data-display";
import { StatusAction, StatusBadge } from "@/components/domain";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/ui/button";
import type { ConsultationRead, TaskRead } from "@/lib/api/types";
import { formatDateDisplay, todayStorage } from "@/lib/locale/date";
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
import { TASK_TYPE_LABELS } from "@/lib/terminology";

export type TaskDetailPaneProps = {
  task: TaskRead;
  personName: string;
  assigneeName?: string | null;
  linkedConsultation?: ConsultationRead | null;
  loadingConsultation?: boolean;
  completing?: boolean;
  onMarkComplete: () => void;
  onNavigate: (href: string) => void;
  today?: string;
};

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
  assigneeName,
  linkedConsultation = null,
  loadingConsultation = false,
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
  const showComplete = task.status === "open" && !intake;

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
        href={`/people/${task.person_id}`}
      />

      {task.related_entity_type && task.related_entity_type !== "person" ? (
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
