"use client";

import * as React from "react";

import { StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/ui/button";
import type { ConsultationRead, UserRead } from "@/lib/api/types";
import { jalaliDayAndMonthLabel } from "@/lib/locale";
import { isConsultationAssessmentComplete } from "@/lib/consultation/assessment";
import { levelLabel, motivationLabel } from "@/lib/terminology";
import { canConductConsultation } from "@/lib/auth/role";
import { cn } from "@/lib/utils";

function ConsultationDateBadge({ isoDateTime }: { isoDateTime: string }) {
  const { day, month } = jalaliDayAndMonthLabel(isoDateTime);
  return (
    <div
      className={cn(
        "flex w-[52px] shrink-0 flex-col items-center justify-center gap-0 rounded-[var(--primitive-radius-lg)]",
        "border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)]",
        "py-[var(--primitive-space-2)]",
      )}
      aria-hidden
    >
      <span className="text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-bold)] leading-none text-[var(--semantic-color-text-primary)]">
        {day}
      </span>
      <span className="mt-[3px] text-[length:var(--primitive-font-size-xs)] leading-none text-[var(--semantic-color-text-secondary)]">
        {month}
      </span>
    </div>
  );
}

export type PersonConsultationTimelineProps = {
  consultations: ConsultationRead[];
  departmentNameById: Map<number, string>;
  usersMap: Record<number, string>;
  currentUser: UserRead | null;
  onContinue: (consultation: ConsultationRead) => void;
};

function PersonConsultationTimeline({
  consultations,
  departmentNameById,
  usersMap,
  currentUser,
  onContinue,
}: PersonConsultationTimelineProps) {
  return (
    <div role="list" aria-label="مشاوره‌ها">
      {consultations.map((consultation, index) => {
        const hasAssessment =
          Boolean(consultation.current_level?.trim()) ||
          Boolean(consultation.goal?.trim());
        const canContinue =
          currentUser !== null &&
          canConductConsultation(consultation, currentUser) &&
          consultation.outcome === null;
        const showConnector = index < consultations.length - 1;

        return (
          <div key={consultation.id} role="listitem" className="flex gap-[var(--primitive-space-3)]">
            <div className="flex shrink-0 flex-col items-center">
              <ConsultationDateBadge isoDateTime={consultation.created_at} />
              {showConnector ? (
                <div
                  className="mt-[var(--primitive-space-1)] w-px flex-1 bg-[var(--semantic-color-surface-border)]"
                  aria-hidden
                />
              ) : null}
            </div>

            <div
              className={cn(
                "min-w-0 flex-1 rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)]",
                "bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-4)]",
                "shadow-[var(--primitive-elevation-1)] transition-shadow duration-[var(--primitive-motion-duration-fast)] hover:shadow-[var(--primitive-elevation-2)]",
                showConnector && "mb-[var(--primitive-space-3)]",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-[var(--primitive-space-2)]">
                <div className="flex min-w-0 flex-wrap items-center gap-[var(--primitive-space-2)]">
                  <p className="truncate text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                    {departmentNameById.get(consultation.department_id) ?? "—"}
                  </p>
                  <StatusBadge
                    domain="consultation"
                    value={consultation.outcome ?? "pending"}
                  />
                </div>
                {canContinue ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => onContinue(consultation)}
                  >
                    {isConsultationAssessmentComplete(consultation)
                      ? "تعیین نتیجه"
                      : "ادامه مشاوره"}
                  </Button>
                ) : null}
              </div>

              <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                مشاور: {usersMap[consultation.consultant_id] ?? "—"}
              </p>

              {hasAssessment ? (
                <div className="mt-[var(--primitive-space-2)] flex flex-wrap gap-[var(--primitive-space-1)]">
                  {consultation.current_level ? (
                    <Badge variant="neutral">
                      {levelLabel(consultation.current_level)}
                    </Badge>
                  ) : null}
                  {consultation.goal ? (
                    <Badge variant="neutral">
                      {motivationLabel(consultation.goal)}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { PersonConsultationTimeline };
