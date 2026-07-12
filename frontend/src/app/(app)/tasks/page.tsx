"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckSquare } from "lucide-react";

import {
  TaskDetailPane,
  TaskInboxToolbar,
  TaskQueueList,
  type ReferralQueueItem,
} from "@/components/domain";
import { EmptyState, ErrorState, useToast } from "@/components/feedback";
import { SplitViewSkeleton } from "@/components/skeletons";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import { listConsultations, getConsultation } from "@/lib/api/consultations";
import { getCourse } from "@/lib/api/finance";
import { listPeople } from "@/lib/api/people";
import { listDepartments } from "@/lib/api/departments";
import type {
  ConsultationRead,
  DepartmentRead,
  PersonRead,
  TaskRead,
  UserRead,
} from "@/lib/api/types";
import { getMe, listUsers } from "@/lib/api/users";
import { listTasks, updateTask } from "@/lib/api/tasks";
import { getCurrentRole } from "@/lib/auth/role";
import { isConsultationAssessmentComplete } from "@/lib/consultation/assessment";
import type { UserRole } from "@/lib/nav/types";
import { isConsultationIntakeTask } from "@/lib/task/consultation-task";
import {
  DEFAULT_TASK_SECONDARY_FILTERS,
  filterTasksBySearch,
  getDefaultViewChip,
  countViewChips,
  matchesSecondaryFilters,
  matchesViewChip,
  type TaskSecondaryFilters,
  type TaskViewChipId,
} from "@/lib/task/queue";
import { todayStorage } from "@/lib/locale/date";

const PAGE_LIMIT = 100;

function consultationWizardHref(consultation: ConsultationRead): string {
  const step = isConsultationAssessmentComplete(consultation)
    ? "outcome"
    : "assessment";
  return `/people/${consultation.person_id}/consultations/${consultation.id}?step=${step}`;
}

function tasksScopedToAssignee(role: UserRole): boolean {
  return role === "department_manager" || role === "finance";
}

function syncSelectedQuery(taskId: number | null) {
  const url = new URL(window.location.href);
  if (taskId == null) {
    url.searchParams.delete("selected");
  } else {
    url.searchParams.set("selected", String(taskId));
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

export default function TasksPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [role, setRole] = React.useState<UserRole>("admin");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [tasks, setTasks] = React.useState<TaskRead[]>([]);
  const [pendingConsultations, setPendingConsultations] = React.useState<
    ConsultationRead[]
  >([]);
  const [peopleById, setPeopleById] = React.useState<Map<number, PersonRead>>(
    new Map(),
  );
  const [departmentsById, setDepartmentsById] = React.useState<
    Map<number, DepartmentRead>
  >(new Map());
  const [usersById, setUsersById] = React.useState<Map<number, UserRead>>(
    new Map(),
  );
  const [viewChip, setViewChip] = React.useState<TaskViewChipId>("open");
  const [secondaryFilters, setSecondaryFilters] =
    React.useState<TaskSecondaryFilters>(DEFAULT_TASK_SECONDARY_FILTERS);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewInitialized, setViewInitialized] = React.useState(false);
  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(
    null,
  );
  const [completing, setCompleting] = React.useState(false);
  const [linkedConsultation, setLinkedConsultation] =
    React.useState<ConsultationRead | null>(null);
  const [loadingConsultation, setLoadingConsultation] = React.useState(false);
  const [recommendedCourseName, setRecommendedCourseName] = React.useState<
    string | null
  >(null);
  const [today] = React.useState(() => todayStorage());

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

      setTasks(tasksRes.items);
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
        ? tasks.filter((task) => !isConsultationIntakeTask(task))
        : tasks,
    [tasks, role],
  );

  React.useEffect(() => {
    if (loading || viewInitialized) return;
    const counts = countViewChips(operationalTasks, today);
    setViewChip(getDefaultViewChip(counts));
    setViewInitialized(true);
  }, [loading, operationalTasks, today, viewInitialized]);

  const peopleNames = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const [id, person] of peopleById) {
      map.set(id, person.full_name);
    }
    return map;
  }, [peopleById]);

  const peoplePhones = React.useMemo(() => {
    const map = new Map<number, string | null>();
    for (const [id, person] of peopleById) {
      map.set(id, person.phone);
    }
    return map;
  }, [peopleById]);

  const filteredTasks = React.useMemo(() => {
    const base = operationalTasks.filter((task) => {
      if (!matchesSecondaryFilters(task, secondaryFilters)) {
        return false;
      }
      if (
        secondaryFilters.status === "open" &&
        !matchesViewChip(task, viewChip, today)
      ) {
        return false;
      }
      return true;
    });
    return filterTasksBySearch(base, searchQuery, peopleNames);
  }, [
    operationalTasks,
    secondaryFilters,
    viewChip,
    today,
    searchQuery,
    peopleNames,
  ]);

  const referrals: ReferralQueueItem[] = React.useMemo(
    () =>
      role === "department_manager"
        ? pendingConsultations.map((consultation) => ({
            ...consultation,
            person_name:
              peopleById.get(consultation.person_id)?.full_name ??
              `#${consultation.person_id}`,
            person_phone: peopleById.get(consultation.person_id)?.phone,
            department_name:
              departmentsById.get(consultation.department_id)?.name ?? "—",
          }))
        : [],
    [role, pendingConsultations, peopleById, departmentsById],
  );

  const assigneeNames = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const [id, user] of usersById) {
      map.set(id, user.name);
    }
    return map;
  }, [usersById]);

  const selectedTask = React.useMemo(
    () => filteredTasks.find((task) => task.id === selectedTaskId) ?? null,
    [filteredTasks, selectedTaskId],
  );

  React.useEffect(() => {
    if (
      !selectedTask ||
      selectedTask.related_entity_type !== "consultation" ||
      selectedTask.related_entity_id == null
    ) {
      setLinkedConsultation(null);
      setRecommendedCourseName(null);
      return;
    }

    let cancelled = false;
    setLoadingConsultation(true);
    void getConsultation(selectedTask.related_entity_id)
      .then(async (consultation) => {
        if (cancelled) return;
        setLinkedConsultation(consultation);
        if (consultation.recommended_course_id != null) {
          try {
            const course = await getCourse(consultation.recommended_course_id);
            if (!cancelled) setRecommendedCourseName(course.title);
          } catch {
            if (!cancelled) setRecommendedCourseName(null);
          }
        } else {
          setRecommendedCourseName(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLinkedConsultation(null);
          setRecommendedCourseName(null);
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

  const handleSelectTask = React.useCallback((taskId: number) => {
    setSelectedTaskId(taskId);
    syncSelectedQuery(taskId);
  }, []);

  const handleViewChipChange = React.useCallback((chip: TaskViewChipId) => {
    setViewChip(chip);
    setSecondaryFilters((prev) =>
      prev.status === "open" ? prev : { ...prev, status: "open" },
    );
  }, []);

  const handleSecondaryFiltersChange = React.useCallback(
    (filters: TaskSecondaryFilters) => {
      setSecondaryFilters(filters);
      if (filters.status !== "open") {
        setViewChip("open");
      }
    },
    [],
  );

  const handleResetAll = React.useCallback(() => {
    const counts = countViewChips(operationalTasks, today);
    setViewChip(getDefaultViewChip(counts));
    setSecondaryFilters(DEFAULT_TASK_SECONDARY_FILTERS);
    setSearchQuery("");
  }, [operationalTasks, today]);

  const handleMarkComplete = React.useCallback(async () => {
    if (!selectedTask || selectedTask.status !== "open") return;
    if (isConsultationIntakeTask(selectedTask)) return;
    setCompleting(true);
    try {
      const updated = await updateTask(selectedTask.id, { status: "done" });
      setTasks((prev) =>
        prev.map((task) => (task.id === updated.id ? updated : task)),
      );
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
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <SplitViewSkeleton
          filterBar={
            <TaskInboxToolbar
              tasks={operationalTasks}
              today={today}
              viewChip={viewChip}
              onViewChipChange={handleViewChipChange}
              secondaryFilters={secondaryFilters}
              onSecondaryFiltersChange={handleSecondaryFiltersChange}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onResetAll={handleResetAll}
              showAssigneeFilter={role === "admin"}
              users={Array.from(usersById.values())}
            />
          }
          table={
            <TaskQueueList
              tasks={filteredTasks}
              today={today}
              selectedTaskId={selectedTaskId}
              peopleNames={peopleNames}
              peoplePhones={peoplePhones}
              assigneeNames={assigneeNames}
              onSelectTask={handleSelectTask}
              loading={loading}
              referrals={referrals}
              onOpenReferral={(row) => router.push(consultationWizardHref(row))}
            />
          }
          emptyState={
            <EmptyState icon={CheckSquare} message="یک وظیفه انتخاب کنید" />
          }
          detail={
            selectedTask ? (
              <TaskDetailPane
                task={selectedTask}
                personName={
                  peopleNames.get(selectedTask.person_id) ??
                  `#${selectedTask.person_id}`
                }
                personPhone={peoplePhones.get(selectedTask.person_id)}
                assigneeName={
                  selectedTask.assignee_id
                    ? (assigneeNames.get(selectedTask.assignee_id) ?? null)
                    : null
                }
                linkedConsultation={linkedConsultation}
                loadingConsultation={loadingConsultation}
                recommendedCourseName={recommendedCourseName}
                completing={completing}
                onMarkComplete={() => void handleMarkComplete()}
                onNavigate={(href) => router.push(href)}
                today={today}
              />
            ) : null
          }
        />
      </div>
    </div>
  );
}
