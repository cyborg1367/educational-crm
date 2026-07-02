"use client";

import * as React from "react";
import { CheckSquare } from "lucide-react";

import { DataTable, RelationshipCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { StatusAction, StatusBadge } from "@/components/domain";
import { EmptyState, ErrorState, useToast } from "@/components/feedback";
import { FilterBar, type FilterValues } from "@/components/layout";
import { Avatar } from "@/components/primitives/avatar";
import { Badge } from "@/components/primitives/badge";
import { SplitViewSkeleton } from "@/components/skeletons";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import type { TaskRead, TaskStatus, TaskType, UserRead } from "@/lib/api/types";
import { listUsers } from "@/lib/api/users";
import { listTasks, updateTask } from "@/lib/api/tasks";
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

function relatedHref(task: TaskRead): string | undefined {
  const id = task.related_entity_id;
  if (!id || !task.related_entity_type) return undefined;
  if (task.related_entity_type === "person") return `/people/${id}`;
  if (task.related_entity_type === "enrollment") return `/enrollments/${id}`;
  if (task.related_entity_type === "invoice") return `/invoices/${id}`;
  return undefined;
}

export default function TasksPage() {
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [tasksPage, setTasksPage] = React.useState<PaginatedResponse<TaskRead>>(emptyPage);
  const [usersById, setUsersById] = React.useState<Map<number, UserRead>>(new Map());
  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const [completing, setCompleting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksRes, usersRes] = await Promise.all([
        listTasks({ limit: PAGE_LIMIT, offset: 0 }),
        listUsers({ limit: 500 }),
      ]);
      setTasksPage(tasksRes);
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

  const filteredTasks = React.useMemo(() => {
    const selectedTypes = Array.isArray(filterValues.type)
      ? (filterValues.type as string[])
      : [];
    const status =
      typeof filterValues.status === "string"
        ? (filterValues.status as TaskStatus)
        : undefined;
    const assignee = typeof filterValues.assignee === "string" ? filterValues.assignee : undefined;

    return tasksPage.items.filter((task) => {
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
  }, [tasksPage.items, filterValues]);

  const selectedTask = React.useMemo(
    () => filteredTasks.find((task) => task.id === selectedTaskId) ?? null,
    [filteredTasks, selectedTaskId],
  );

  const facets = React.useMemo(
    () => [
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
        id: "assignee",
        type: "select" as const,
        label: "مسئول",
        placeholder: "همه",
        searchable: true,
        options: [
          { value: "unassigned", label: "بدون مسئول" },
          ...Array.from(usersById.values()).map((user) => ({
            value: String(user.id),
            label: user.name,
          })),
        ],
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
    ],
    [usersById],
  );

  const handleMarkComplete = React.useCallback(async () => {
    if (!selectedTask || selectedTask.status !== "open") return;
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

  return (
    <SplitViewSkeleton
      filterBar={
        <FilterBar
          facets={facets}
          values={filterValues}
          onValuesChange={setFilterValues}
        />
      }
      table={
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
                const assignee = row.assignee_id ? usersById.get(row.assignee_id) : null;
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
            {selectedTask.related_entity_type ? (
              <RelationshipCard
                label="ارتباط"
                title={`${selectedTask.related_entity_type} #${selectedTask.related_entity_id ?? "—"}`}
                href={relatedHref(selectedTask)}
              />
            ) : null}
            <StatusAction
              entity="task"
              status={selectedTask.status}
              onAction={() => void handleMarkComplete()}
              className={completing ? "pointer-events-none opacity-60" : undefined}
            />
          </div>
        ) : null
      }
    />
  );
}
