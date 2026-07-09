import * as React from "react";

import { StatusBadge, type StatusBadgeDomain } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatusActionButtonConfig = {
  action: string;
  label: string;
  variant: "primary" | "destructive";
  isVisible: (fieldValue: string | null) => boolean;
};

type EntityActionConfig = {
  badgeDomain: StatusBadgeDomain;
  field: "status" | "outcome";
  actions: readonly StatusActionButtonConfig[];
};

/**
 * Per-entity action visibility — mirrors docs/frontend/02 §3.1.
 * Screens pass entity + field value; this table decides which buttons render.
 */
const STATUS_ACTION_CONFIG = {
  enrollment: {
    badgeDomain: "enrollment",
    field: "status",
    actions: [
      {
        action: "drop",
        label: "لغو ثبت‌نام",
        variant: "destructive",
        isVisible: (status) => status === "pre_enroll" || status === "active",
      },
    ],
  },
  invoice: {
    badgeDomain: "invoice",
    field: "status",
    actions: [
      {
        action: "record_payment",
        label: "ثبت پرداخت",
        variant: "primary",
        isVisible: (status) =>
          status === "pending" ||
          status === "partially_paid" ||
          status === "overdue",
      },
    ],
  },
  installment: {
    badgeDomain: "installment",
    field: "status",
    actions: [
      {
        action: "record_payment",
        label: "ثبت پرداخت",
        variant: "primary",
        isVisible: (status) =>
          status === "pending" ||
          status === "partially_paid" ||
          status === "overdue",
      },
    ],
  },
  consultation: {
    badgeDomain: "consultation",
    field: "outcome",
    actions: [
      {
        action: "set_outcome",
        label: "تعیین نتیجه",
        variant: "primary",
        isVisible: (outcome) => outcome === null,
      },
    ],
  },
  task: {
    badgeDomain: "task",
    field: "status",
    actions: [
      {
        action: "mark_complete",
        label: "تکمیل",
        variant: "primary",
        isVisible: (status) => status === "open",
      },
    ],
  },
} as const satisfies Record<string, EntityActionConfig>;

type StatusActionEntity = keyof typeof STATUS_ACTION_CONFIG;

type StatusActionActionMap = {
  enrollment: "drop";
  invoice: "record_payment";
  installment: "record_payment";
  consultation: "set_outcome";
  task: "mark_complete";
};

type StatusActionBaseProps = {
  className?: string;
  size?: "sm" | "md";
};

type EnrollmentStatusActionProps = StatusActionBaseProps & {
  entity: "enrollment";
  status: string;
  onAction: (action: StatusActionActionMap["enrollment"]) => void;
};

type InvoiceStatusActionProps = StatusActionBaseProps & {
  entity: "invoice";
  status: string;
  onAction: (action: StatusActionActionMap["invoice"]) => void;
};

type InstallmentStatusActionProps = StatusActionBaseProps & {
  entity: "installment";
  status: string;
  onAction: (action: StatusActionActionMap["installment"]) => void;
};

type ConsultationStatusActionProps = StatusActionBaseProps & {
  entity: "consultation";
  outcome: string | null;
  onAction: (action: StatusActionActionMap["consultation"]) => void;
};

type TaskStatusActionProps = StatusActionBaseProps & {
  entity: "task";
  status: string;
  onAction: (action: StatusActionActionMap["task"]) => void;
};

export type StatusActionProps =
  | EnrollmentStatusActionProps
  | InvoiceStatusActionProps
  | InstallmentStatusActionProps
  | ConsultationStatusActionProps
  | TaskStatusActionProps;

function invokeStatusAction(
  props: StatusActionProps,
  actionId: string,
): void {
  switch (props.entity) {
    case "enrollment":
      props.onAction(actionId as StatusActionActionMap["enrollment"]);
      break;
    case "invoice":
      props.onAction(actionId as StatusActionActionMap["invoice"]);
      break;
    case "installment":
      props.onAction(actionId as StatusActionActionMap["installment"]);
      break;
    case "consultation":
      props.onAction(actionId as StatusActionActionMap["consultation"]);
      break;
    case "task":
      props.onAction(actionId as StatusActionActionMap["task"]);
      break;
  }
}

function StatusAction(props: StatusActionProps) {
  const { entity, className, size = "sm" } = props;
  const config = STATUS_ACTION_CONFIG[entity];
  const fieldValue =
    config.field === "outcome"
      ? (props as ConsultationStatusActionProps).outcome
      : (
          props as
            | EnrollmentStatusActionProps
            | InvoiceStatusActionProps
            | InstallmentStatusActionProps
            | TaskStatusActionProps
        ).status;

  const visibleActions = config.actions.filter((action) =>
    action.isVisible(fieldValue),
  );

  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-[var(--semantic-space-inlineGap)]",
        className,
      )}
    >
      {fieldValue !== null ? (
        <StatusBadge domain={config.badgeDomain} value={fieldValue} />
      ) : null}
      {visibleActions.map((action) => (
        <Button
          key={action.action}
          type="button"
          variant={action.variant}
          size={size}
          onClick={() => invokeStatusAction(props, action.action)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export { StatusAction, STATUS_ACTION_CONFIG };
