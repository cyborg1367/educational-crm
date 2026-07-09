"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckSquare } from "lucide-react";

import { DataTable, RelationshipCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { StatusAction, StatusBadge } from "@/components/domain";
import { EmptyState, ErrorState, useToast } from "@/components/feedback";
import { FilterBar, type FilterValues } from "@/components/layout";
import { Avatar } from "@/components/primitives/avatar";
import { Badge } from "@/components/primitives/badge";
import { Button } from "@/components/ui/button";
import { SplitViewSkeleton } from "@/components/skeletons";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import { listConsultations, getConsultation } from "@/lib/api/consultations";
import { listPeople } from "@/lib/api/people";
import { listDepartments } from "@/lib/api/departments";
import type {
  ConsultationRead,
  DepartmentRead,
  PersonRead,
  TaskRead,
  TaskStatus,
  TaskType,
  UserRead,
} from "@/lib/api/types";
import { getMe, listUsers } from "@/lib/api/users";
import { listTasks, updateTask } from "@/lib/api/tasks";
import { getCurrentRole } from "@/lib/auth/role";
import {
  assessmentStatusLabel,
  isConsultationAssessmentComplete,
} from "@/lib/consultation/assessment";
import type { UserRole } from "@/lib/nav/types";
import { isConsultationIntakeTask } from "@/lib/task/consultation-task";
import {
  buildEnrollmentWizardHref,
  isFollowUpRegistrationTask,
} from "@/lib/task/enrollment-from-task";
import { formatDateDisplay } from "@/lib/locale/date";
import { TASK_TYPE_LABELS, terminologyLabel } from "@/lib/terminology";

const PAGE_LIMIT = 100;

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: PAGE_LIMIT,
  offset: 0,
  has_more: false,
});

type PendingConsultationRow = ConsultationRead & {
  person_name: string;
  department_name: string;
  assessment_label: string;
};

function relatedHref(task: TaskRead): string | undefined {
  const id = task.related_entity_id;
  if (!id || !task.related_entity_type) return undefined;
  if (task.related_entity_type === "person") return `/people/${id}`;
  if (task.related_entity_type === "consultation") {
    return `/people/${task.person_id}/consultations/${id}`;
  }
  if (task.related_entity_type === "enrollment") return `/enrollments/${id}`;
  if (task.related_entity_type === "invoice") return `/invoices/${id}`;
  return undefined;
}

function consultationWizardHref(consultation: ConsultationRead): string {
  const step = isConsultationAssessmentComplete(consultation)
    ? "outcome"
    : "assessment";
  return `/people/${consultation.person_id}/consultations/${consultation.id}?step=${step}`;
}

function tasksScopedToAssignee(role: UserRole): boolean {
  return role === "department_manager" || role === "finance";
}

export default function TasksPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [role, setRole] = React.useState<UserRole>("admin");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [tasksPage, setTasksPage] = React.useState<PaginatedResponse<TaskRead>>(emptyPage);
  const [pendingConsultations, setPendingConsultations] = React.useState<
    ConsultationRead[]
  >([]);
  const [peopleById, setPeopleById] = React.useState<Map<number, PersonRead>>(
    new Map(),
  );
  const [departmentsById, setDepartmentsById] = React.useState<
    Map<number, DepartmentRead>
  >(new Map());
  const [usersById, setUsersById] = React.useState<Map<number, UserRead>>(new Map());
  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const [completing, setCompleting] = React.useState(false);
  const [linkedConsultation, setLinkedConsultation] =
    React.useState<ConsultationRead | null>(null);
  const [loadingConsultation, setLoadingConsultation] = React.useState(false);

  React.useEffect(() => {
    setRole(getCurrentRole());
  }, []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentRole = getCurrentRole();
      const me = await getMe();
      const usersRes =
        currentRole === "admin"
          ? await listUsers({ limit: 500 })
          : {
              items: [me],
              total_count: 1,
              limit: 500,
              offset: 0,
              has_more: false,
            };

      const [tasksRes, peopleRes, deptRes] = await Promise.all([
        listTasks({
          limit: PAGE_LIMIT,
          offset: 0,
          ...(tasksScopedToAssignee(currentRole) ? { assignee_id: me.id } : {}),
        }),
        listPeople({ limit: 1000 }),
        listDepartments({ limit: 100 }),
      ]);

      let consultations: ConsultationRead[] = [];
      if (currentRole === "department_manager") {
        const consultationRes = await listConsultations({
          consultant_id: me.id,
          pending: true,
          limit: PAGE_LIMIT,
        });
        consultations = consultationRes.items;
      }

      setTasksPage(tasksRes);
      setPendingConsultations(consultations);
      setPeopleById(new Map(peopleRes.items.map((person) => [person.id, person])));
      setDepartmentsById(
        new Map(deptRes.items.map((dept) => [dept.id, dept])),
      );
      setUsersById(new Map(usersRes.items.map((user) => [user.id, user])));
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری وظایف"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  React.useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("selected");
    if (!selected) return;
    const parsed = Number(selected);
    if (Number.isFinite(parsed)) {
      setSelectedTaskId(parsed);
    }
  }, []);

  const operationalTasks = React.useMemo(
    () =>
      role === "department_manager"
        ? tasksPage.items.filter((task) => !isConsultationIntakeTask(task))
        : tasksPage.items,
    [tasksPage.items, role],
  );

  const filteredTasks = React.useMemo(() => {
    const selectedTypes = Array.isArray(filterValues.type)
      ? (filterValues.type as string[])
      : [];
    const status =
      typeof filterValues.status === "string"
        ? (filterValues.status as TaskStatus)
        : undefined;
    const assignee = typeof filterValues.assignee === "string" ? filterValues.assignee : undefined;

    return operationalTasks.filter((task) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(task.type)) {
        return false;
      }
      if (status && task.status !== status) {
        return false;
      }
      if (assignee === "unassigned" && task.assignee_id !== null) {
        return false;
      }
      if (assignee && assignee !== "unassigned" && String(task.assignee_id ?? "") !== assignee) {
        return false;
      }
      return true;
    });
  }, [operationalTasks, filterValues]);

  const pendingRows: PendingConsultationRow[] = React.useMemo(
    () =>
      pendingConsultations.map((consultation) => ({
        ...consultation,
        person_name:
          peopleById.get(consultation.person_id)?.full_name ??
          `#${consultation.person_id}`,
        department_name:
          departmentsById.get(consultation.department_id)?.name ?? "—",
        assessment_label: assessmentStatusLabel(consultation),
      })),
    [pendingConsultations, peopleById, departmentsById],
  );

  const selectedTask = React.useMemo(
    () => filteredTasks.find((task) => task.id === selectedTaskId) ?? null,
    [filteredTasks, selectedTaskId],
  );

  const selectedTaskIsConsultationIntake =
    selectedTask != null && isConsultationIntakeTask(selectedTask);

  const selectedTaskPersonName = selectedTask
    ? (peopleById.get(selectedTask.person_id)?.full_name ??
      `#${selectedTask.person_id}`)
    : "";

  const showStartEnrollment =
    selectedTask != null && isFollowUpRegistrationTask(selectedTask);

  const enrollmentWizardHref =
    selectedTask && showStartEnrollment
      ? buildEnrollmentWizardHref(selectedTask, linkedConsultation)
      : null;

  React.useEffect(() => {
    if (
      !selectedTask ||
      selectedTask.related_entity_type !== "consultation" ||
      selectedTask.related_entity_id == null
    ) {
      setLinkedConsultation(null);
      return;
    }

    let cancelled = false;
    setLoadingConsultation(true);
    void getConsultation(selectedTask.related_entity_id)
      .then((consultation) => {
        if (!cancelled) {
          setLinkedConsultation(consultation);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLinkedConsultation(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingConsultation(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTask]);

  const facets = React.useMemo(() => {
    const items = [
      {
        id: "type",
        type: "multi" as const,
        label: "نوع",
        options: (Object.keys(TASK_TYPE_LABELS) as TaskType[]).map((type) => ({
          value: type,
          label: TASK_TYPE_LABELS[type],
        })),
      },
      {
        id: "status",
        type: "select" as const,
        label: "وضعیت",
        placeholder: "همه",
        options: [
          { value: "open", label: terminologyLabel("open") },
          { value: "done", label: terminologyLabel("done") },
          { value: "cancelled", label: terminologyLabel("cancelled") },
        ],
      },
    ];

    if (role === "admin") {
      items.splice(1, 0, {
        id: "assignee",
        type: "select" as const,
        label: "مسئول",
        placeholder: "همه",
        options: [
          { value: "unassigned", label: "بدون مسئول" },
          ...Array.from(usersById.values()).map((user) => ({
            value: String(user.id),
            label: user.name,
          })),
        ],
      });
    }

    return items;
  }, [role, usersById]);

  const handleMarkComplete = React.useCallback(async () => {
    if (!selectedTask || selectedTask.status !== "open") return;
    if (isConsultationIntakeTask(selectedTask)) return;
    setCompleting(true);
    try {
      const updated = await updateTask(selectedTask.id, { status: "done" });
      setTasksPage((prev) => ({
        ...prev,
        items: prev.items.map((task) => (task.id === updated.id ? updated : task)),
      }));
      toast({ variant: "success", title: "وظیفه تکمیل شد" });
    } catch (err) {
      toast({
        variant: "error",
        title: "خطا در ثبت عملیات",
        description: toApiError(err).detail,
      });
    } finally {
      setCompleting(false);
    }
  }, [selectedTask, toast]);

  if (error) {
    return <ErrorState error={error} />;
  }

  const referralSection =
    role === "department_manager" ? (
      <div className="mb-[var(--primitive-space-sectionGap)] rounded-[var(--primitive-radius-md)] bg-[var(--semantic-color-surface-card)] p-[var(--semantic-space-cardPadding)] shadow-[var(--primitive-elevation-1)]">
        <h2 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]">
          ارجاع‌های مشاوره
        </h2>
        <DataTable
          columns={[
            { key: "person", header: "شخص", cell: (row) => row.person_name },
            {
              key: "department",
              header: "دپارتمان",
              cell: (row) => row.department_name,
            },
            {
              key: "assessment",
              header: "ارزیابی",
              cell: (row) => row.assessment_label,
            },
            {
              key: "created_at",
              header: "تاریخ",
              align: "end",
              cell: (row) => formatDateDisplay(row.created_at.slice(0, 10)),
            },
            {
              key: "action",
              header: "",
              align: "end",
              cell: (row) => (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(consultationWizardHref(row));
                  }}
                >
                  ادامه مشاوره
                </Button>
              ),
            },
          ]}
          data={{
            ...emptyPage<PendingConsultationRow>(),
            items: pendingRows,
            total_count: pendingRows.length,
          }}
          loading={loading}
          onRowClick={(row) => router.push(consultationWizardHref(row))}
          emptyMessage="ارجاع مشاوره‌ای در انتظار نیست"
        />
      </div>
    ) : null;

  return (
    <div className="flex h-full flex-col">
      {referralSection}
      <div className="min-h-0 flex-1">
        <SplitViewSkeleton
          filterBar={
            role === "department_manager" ? null : (
              <FilterBar
                facets={facets}
                values={filterValues}
                onValuesChange={setFilterValues}
              />
            )
          }
          table={
            <div className="flex h-full flex-col">
              {role === "department_manager" ? (
                <h2 className="mb-[var(--primitive-space-3)] px-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-secondary)]">
                  سایر وظایف
                </h2>
              ) : null}
              <DataTable
                columns={[
                  {
                    key: "type",
                    header: "نوع",
                    cell: (row) => TASK_TYPE_LABELS[row.type],
                  },
                  { key: "title", header: "عنوان" },
                  {
                    key: "due_date",
                    header: "موعد",
                    align: "end",
                    cell: (row) => formatDateDisplay(row.due_date),
                  },
                  {
                    key: "assignee",
                    header: "مسئول",
                    cell: (row) => {
                      const assignee = row.assignee_id
                        ? usersById.get(row.assignee_id)
                        : null;
                      return assignee ? (
                        <Avatar name={assignee.name} size="xs" />
                      ) : (
                        <span className="text-[var(--semantic-color-text-secondary)]">—</span>
                      );
                    },
                  },
                  {
                    key: "status",
                    header: "وضعیت",
                    cell: (row) => <StatusBadge domain="task" value={row.status} />,
                  },
                ]}
                data={{
                  ...tasksPage,
                  items: filteredTasks,
                  total_count: filteredTasks.length,
                  has_more: false,
                }}
                loading={loading}
                onRowClick={(task) => setSelectedTaskId(task.id)}
                selectedIds={selectedTaskId ? [String(selectedTaskId)] : []}
                emptyMessage="وظیفه‌ای یافت نشد"
              />
            </div>
          }
          emptyState={
            <EmptyState icon={CheckSquare} message="یک وظیفه انتخاب کنید" />
          }
          detail={
            selectedTask ? (
              <div className="flex h-full flex-col gap-[var(--primitive-space-4)] p-[var(--primitive-space-5)]">
                <h2 className="text-[length:var(--primitive-font-size-xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                  {selectedTask.title}
                </h2>
                <div className="flex flex-wrap items-center gap-[var(--primitive-space-2)]">
                  <Badge>{TASK_TYPE_LABELS[selectedTask.type]}</Badge>
                  <span className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                    موعد: {formatDateDisplay(selectedTask.due_date)}
                  </span>
                </div>
                <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-primary)]">
                  {selectedTask.description?.trim() || "—"}
                </p>
                <RelationshipCard
                  label="دانش‌پذیر"
                  title={selectedTaskPersonName}
                  href={`/people/${selectedTask.person_id}`}
                />
                {selectedTask.related_entity_type &&
                selectedTask.related_entity_type !== "person" ? (
                  <RelationshipCard
                    label="ارتباط"
                    title={`${selectedTask.related_entity_type} #${selectedTask.related_entity_id ?? "—"}`}
                    href={relatedHref(selectedTask)}
                  />
                ) : null}
                {selectedTaskIsConsultationIntake ? (
                  <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                    ابتدا نتیجه مشاوره را از بخش «ارجاع‌های مشاوره» ثبت کنید.
                  </p>
                ) : (
                  <div className="flex flex-col gap-[var(--primitive-space-3)]">
                    {showStartEnrollment ? (
                      <Button
                        type="button"
                        variant="primary"
                        disabled={loadingConsultation}
                        onClick={() => {
                          if (enrollmentWizardHref) {
                            router.push(enrollmentWizardHref);
                          }
                        }}
                      >
                        شروع ثبت‌نام
                      </Button>
                    ) : null}
                    <StatusAction
                      entity="task"
                      status={selectedTask.status}
                      onAction={() => void handleMarkComplete()}
                      className={completing ? "pointer-events-none opacity-60" : undefined}
                    />
                  </div>
                )}
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}
