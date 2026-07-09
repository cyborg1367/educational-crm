"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  GraduationCap,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { CardListState, DataTable } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { StatusBadge } from "@/components/domain";
import { ClassFormDialog } from "@/components/domain/class-form-dialog";
import { ConfirmDialog } from "@/components/domain/confirm-dialog";
import {
  classFormStateFromRead,
  classFormStateToCreateBody,
  classFormStateToUpdateBody,
  emptyClassFormState,
  isClassFormValid,
  type ClassFormState,
} from "@/components/domain/class-form-fields";
import { ErrorState, useToast } from "@/components/feedback";
import { ListPageSkeleton } from "@/components/skeletons";
import {
  FilterBar,
  ViewModeToggle,
  useListViewMode,
  type FilterValues,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { listCourses } from "@/lib/api/courses";
import { listDepartments } from "@/lib/api/departments";
import { createClass, deleteClass, getCourse, listClasses, updateClass } from "@/lib/api/finance";
import { getMe, listUsers } from "@/lib/api/users";
import type {
  CourseClassRead,
  CourseRead,
  ClassStatus,
  DepartmentRead,
  UserRead,
} from "@/lib/api/types";
import { canManageClasses, getCurrentRole } from "@/lib/auth/role";
import { formatDateDisplay, formatCount } from "@/lib/locale";
import type { UserRole } from "@/lib/nav/types";
import { CLASS_STATUS_OPTIONS, weekdayLabel } from "@/lib/terminology";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 50;
const CLASSES_VIEW_STORAGE_KEY = "classes-list-view";

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: PAGE_LIMIT,
  offset: 0,
  has_more: false,
});

type ClassRow = CourseClassRead & {
  course_name: string;
  teacher_name: string;
};

type DialogMode = "create" | "edit";

/** Shared brand chrome for all class cards — mirrors the course card language. */
const BRAND_CARD = {
  headerLineClassName:
    "bg-gradient-to-l from-[var(--primitive-color-brand-500)] via-[var(--primitive-color-brand-400)] to-[#2563EB]",
  scheduleBoxClassName:
    "border-[var(--primitive-color-brand-200)]/80 bg-[var(--primitive-color-brand-50)]/70",
  scheduleLabelClassName: "text-[var(--primitive-color-brand-700)]",
  weekdayChipClassName:
    "border-[var(--primitive-color-brand-200)] bg-[var(--semantic-color-surface-card)] text-[var(--primitive-color-brand-700)]",
} as const;

function ClassMiniMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)]/75 bg-[var(--semantic-color-surface-subtle)]/80 px-[var(--primitive-space-2)] py-[var(--primitive-space-2)]">
      <div className="flex items-center gap-[var(--primitive-space-2)]">
        <Icon className="size-3.5 text-[var(--semantic-color-text-secondary)]" />
        <p className="truncate text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          {value}
        </p>
      </div>
      <p className="mt-1 text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
        {label}
      </p>
    </div>
  );
}

export default function ClassesListPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [role, setRole] = React.useState<UserRole>("admin");
  const [canManage, setCanManage] = React.useState(false);
  const [departmentId, setDepartmentId] = React.useState<number | null>(null);

  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [classesPage, setClassesPage] =
    React.useState<PaginatedResponse<CourseClassRead>>(emptyPage);
  const [courses, setCourses] = React.useState<CourseRead[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentRead[]>([]);
  const [usersById, setUsersById] = React.useState<Map<number, UserRead>>(
    new Map(),
  );

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>("create");
  const [editingClassId, setEditingClassId] = React.useState<number | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [formState, setFormState] = React.useState<ClassFormState>(
    emptyClassFormState(),
  );
  const [selectedCourse, setSelectedCourse] = React.useState<CourseRead | null>(
    null,
  );
  const [formError, setFormError] = React.useState<ApiError | null>(null);
  const [fieldError, setFieldError] = React.useState<ApiFieldError | null>(null);
  const [viewMode, setViewMode] = useListViewMode(CLASSES_VIEW_STORAGE_KEY);
  const [deleteTarget, setDeleteTarget] = React.useState<ClassRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    row: ClassRow | null;
  } | null>(null);

  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const openContextMenu = (event: React.MouseEvent, row: ClassRow) => {
    event.preventDefault();
    // Clamp so the menu never overflows the viewport edge.
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 180),
      y: Math.min(event.clientY, window.innerHeight - 110),
      row,
    });
  };

  const statusFilter =
    typeof filterValues.status === "string" ? filterValues.status : undefined;

  React.useEffect(() => {
    const currentRole = getCurrentRole();
    setRole(currentRole);
    setCanManage(canManageClasses(currentRole));
  }, []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await getMe();
      setDepartmentId(me.department_id);

      const [classRes, usersRes, coursesRes, departmentsRes] = await Promise.all([
        listClasses({
          limit: PAGE_LIMIT,
          offset,
          status: statusFilter as ClassStatus | undefined,
        }),
        listUsers({ limit: 500 }).catch(() => ({
          items: [],
          total_count: 0,
          limit: 500,
          offset: 0,
          has_more: false,
        })),
        listCourses({ limit: 500, is_active: true }),
        listDepartments({ limit: 100 }),
      ]);
      setClassesPage(classRes);
      setUsersById(new Map(usersRes.items.map((user) => [user.id, user])));
      setCourses(coursesRes.items);
      setDepartments(departmentsRes.items);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری کلاس‌ها"));
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const coursesById = React.useMemo(
    () => new Map(courses.map((course) => [course.id, course])),
    [courses],
  );

  const availableCourses = React.useMemo(() => {
    if (role !== "department_manager" || departmentId == null) {
      return courses;
    }
    return courses.filter((course) => course.department_id === departmentId);
  }, [courses, departmentId, role]);

  const teachers = React.useMemo(
    () =>
      [...usersById.values()].filter(
        (user) => user.role === "teacher" && user.is_active,
      ),
    [usersById],
  );

  const createBlockedReason = React.useMemo(() => {
    if (availableCourses.length === 0) {
      return "ابتدا از منوی دوره‌ها حداقل یک دوره فعال تعریف کنید.";
    }
    if (teachers.length === 0) {
      return "ابتدا از منوی کاربران یک حساب با نقش «مدرس» بسازید.";
    }
    return null;
  }, [availableCourses.length, teachers.length]);

  React.useEffect(() => {
    if (!formState.courseId) {
      setSelectedCourse(null);
      return;
    }

    const courseId = Number(formState.courseId);
    const cached = coursesById.get(courseId);
    if (cached) {
      setSelectedCourse(cached);
      return;
    }

    let cancelled = false;
    void getCourse(courseId)
      .then((course) => {
        if (!cancelled) {
          setSelectedCourse(course);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedCourse(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [formState.courseId, coursesById]);

  const rows: ClassRow[] = React.useMemo(() => {
    return classesPage.items.map((cls) => ({
      ...cls,
      course_name: coursesById.get(cls.course_id)?.title ?? "—",
      teacher_name: usersById.get(cls.teacher_id)?.name ?? "—",
    }));
  }, [classesPage.items, coursesById, usersById]);

  const tableData: PaginatedResponse<ClassRow> = {
    ...classesPage,
    items: rows,
  };

  const facets = React.useMemo(
    () => [
      {
        id: "status",
        type: "select" as const,
        label: "وضعیت",
        placeholder: "همه",
        options: CLASS_STATUS_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
      },
    ],
    [],
  );

  const resetForm = () => {
    setFormState(emptyClassFormState());
    setSelectedCourse(null);
    setEditingClassId(null);
    setFormError(null);
    setFieldError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (courseClass: CourseClassRead) => {
    const course = coursesById.get(courseClass.course_id) ?? null;
    setFormState(classFormStateFromRead(courseClass, course));
    setSelectedCourse(course);
    setEditingClassId(courseClass.id);
    setDialogMode("edit");
    setFormError(null);
    setFieldError(null);
    setDialogOpen(true);

    if (!course) {
      void getCourse(courseClass.course_id)
        .then((loaded) => {
          setSelectedCourse(loaded);
          setFormState(classFormStateFromRead(courseClass, loaded));
        })
        .catch(() => undefined);
    }
  };

  const handleSubmit = async () => {
    if (!isClassFormValid(formState)) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFieldError(null);
    try {
      if (dialogMode === "create") {
        await createClass(classFormStateToCreateBody(formState, selectedCourse));
        toast({ variant: "success", title: "کلاس جدید ثبت شد" });
      } else if (editingClassId != null) {
        await updateClass(
          editingClassId,
          classFormStateToUpdateBody(formState, selectedCourse),
        );
        toast({ variant: "success", title: "کلاس به‌روزرسانی شد" });
      }
      setDialogOpen(false);
      resetForm();
      void loadData();
    } catch (err) {
      const validation = fieldErrorFromApi(err);
      if (validation) {
        setFieldError(validation);
      } else {
        setFormError(
          toApiError(
            err,
            dialogMode === "create" ? "خطا در ثبت کلاس" : "خطا در ویرایش کلاس",
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = (row: ClassRow) => {
    setContextMenu(null);
    setDeleteTarget(row);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClass(deleteTarget.id);
      toast({ variant: "success", title: "کلاس حذف شد" });
      setDeleteTarget(null);
      void loadData();
    } catch (err) {
      toast({
        variant: "error",
        title: "خطا در حذف کلاس",
        description: toApiError(err, "حذف کلاس ناموفق بود").detail,
      });
    } finally {
      setDeleting(false);
    }
  };

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <>
      <ListPageSkeleton
        title="کلاس‌ها"
        headerAction={
          canManage ? (
            <div className="flex flex-col items-end gap-[var(--primitive-space-1)]">
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={createBlockedReason != null}
                title={createBlockedReason ?? undefined}
                onClick={openCreateDialog}
              >
                افزودن کلاس
              </Button>
              {createBlockedReason ? (
                <p className="max-w-xs text-end text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                  {createBlockedReason}
                </p>
              ) : null}
            </div>
          ) : undefined
        }
        filterBar={
          <div className="flex flex-col gap-[var(--primitive-space-4)]">
            <FilterBar
              facets={facets}
              values={filterValues}
              onValuesChange={(values) => {
                setFilterValues(values);
                setOffset(0);
              }}
            />
            <div className="flex flex-wrap items-center justify-end">
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>
        }
        primaryView={viewMode === "table" ? "table" : "cards"}
        table={
          <DataTable
            columns={[
              { key: "name", header: "نام کلاس" },
              { key: "course_name", header: "دوره" },
              { key: "teacher_name", header: "مدرس" },
              {
                key: "start_date",
                header: "تاریخ شروع",
                align: "end",
                cell: (row) => formatDateDisplay(row.start_date),
              },
              {
                key: "status",
                header: "وضعیت",
                cell: (row) => (
                  <StatusBadge domain="class" value={row.status} />
                ),
              },
              ...(canManage
                ? [
                    {
                      key: "actions",
                      header: "",
                      align: "end" as const,
                      cell: (row: ClassRow) => (
                        <div className="flex items-center justify-end gap-[var(--primitive-space-1)]">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="size-8 p-0"
                            title="ویرایش"
                            aria-label={`ویرایش ${row.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditDialog(row);
                            }}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="size-8 p-0 text-[var(--semantic-color-status-danger)] hover:text-[var(--semantic-color-status-danger-strong)]"
                            title="حذف"
                            aria-label={`حذف ${row.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              requestDelete(row);
                            }}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
            data={tableData}
            loading={loading}
            onPageChange={setOffset}
            onRowClick={(row) => router.push(`/classes/${row.id}`)}
            emptyMessage="کلاسی یافت نشد"
          />
        }
        cardList={
          <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <CardListState
              loading={loading}
              empty={rows.length === 0}
              emptyIcon={GraduationCap}
              emptyMessage={
                statusFilter
                  ? "کلاسی با این فیلتر یافت نشد."
                  : "هنوز کلاسی تعریف نشده است."
              }
              emptyAction={
                canManage && !createBlockedReason && !statusFilter
                  ? { label: "افزودن کلاس", onClick: openCreateDialog }
                  : undefined
              }
              skeletonCount={8}
            >
              {rows.map((row) => {
                const weekdays = row.weekdays ?? [];
                const goToDetail = () => router.push(`/classes/${row.id}`);

                return (
                  <article
                    key={row.id}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-[var(--primitive-radius-lg)]",
                      "border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)]/95",
                      "shadow-[var(--primitive-elevation-1)] transition-all duration-[var(--primitive-motion-duration-base)]",
                      "hover:-translate-y-0.5 hover:shadow-[var(--primitive-elevation-2)]",
                    )}
                    onContextMenu={(event) => {
                      if (canManage) {
                        openContextMenu(event, row);
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "absolute inset-x-0 top-0 h-0.5",
                        BRAND_CARD.headerLineClassName,
                      )}
                      aria-hidden
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={goToDetail}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          goToDetail();
                        }
                      }}
                      className="flex flex-1 cursor-pointer flex-col p-[var(--semantic-space-cardPadding)] pb-0 text-right outline-none focus-visible:ring-2 focus-visible:ring-[var(--primitive-color-brand-400)]"
                    >
                      <div className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)]/70 bg-[color-mix(in_srgb,var(--semantic-color-surface-subtle)_75%,white)] px-[var(--primitive-space-3)] py-[var(--primitive-space-3)]">
                        <div className="flex items-start justify-between gap-[var(--primitive-space-3)]">
                          <div className="flex min-w-0 items-start gap-[var(--primitive-space-3)]">
                            <span className="relative flex size-14 shrink-0 items-center justify-center rounded-[var(--primitive-radius-lg)] bg-[var(--semantic-color-surface-card)] text-[var(--primitive-color-brand-600)] shadow-[var(--primitive-elevation-1)] ring-1 ring-[var(--semantic-color-surface-border)]">
                              <GraduationCap className="size-6" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                                {row.name}
                              </p>
                              <p className="mt-1 truncate text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                                {row.course_name}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0">
                            <StatusBadge domain="class" value={row.status} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-[var(--primitive-space-3)] grid grid-cols-2 gap-[var(--primitive-space-2)]">
                        <ClassMiniMetric
                          icon={Users}
                          value={row.teacher_name}
                          label="مدرس"
                        />
                        <ClassMiniMetric
                          icon={CalendarDays}
                          value={
                            weekdays.length > 0
                              ? formatCount(weekdays.length)
                              : "—"
                          }
                          label="روز در هفته"
                        />
                      </div>

                      {weekdays.length > 0 ? (
                        <div className="mt-[var(--primitive-space-3)] flex flex-wrap gap-[var(--primitive-space-2)]">
                          {weekdays.map((day) => (
                            <span
                              key={day}
                              className={cn(
                                "rounded-[var(--primitive-radius-full)] border px-[var(--primitive-space-2)] py-0.5 text-[length:var(--primitive-font-size-xs)]",
                                BRAND_CARD.weekdayChipClassName,
                              )}
                            >
                              {weekdayLabel(day)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div
                      className={cn(
                        "mx-[var(--semantic-space-cardPadding)] mt-[var(--primitive-space-3)] flex items-center justify-between",
                        "border-t border-[var(--semantic-color-surface-border)]/70 py-[var(--primitive-space-2)]",
                        "mb-[var(--primitive-space-2)]",
                      )}
                    >
                      <span className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                        {formatDateDisplay(row.start_date)}
                      </span>
                      {canManage ? (
                        <div className="flex items-center gap-[var(--primitive-space-1)]">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="size-8 p-0 hover:bg-[var(--semantic-color-surface-subtle)]"
                            onClick={() => openEditDialog(row)}
                            title="ویرایش"
                            aria-label={`ویرایش ${row.name}`}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="size-8 p-0 text-[var(--semantic-color-status-danger)] hover:bg-[var(--semantic-color-surface-subtle)] hover:text-[var(--semantic-color-status-danger-strong)]"
                            onClick={() => requestDelete(row)}
                            title="حذف"
                            aria-label={`حذف ${row.name}`}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </CardListState>
          </div>
        }
      />

      {contextMenu && contextMenu.row && (
        <div
          role="menu"
          className="fixed z-50 min-w-[160px] rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] shadow-[var(--primitive-elevation-3)] py-1"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-right text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-primary)] hover:bg-[var(--semantic-color-surface-subtle)]"
            onClick={() => {
              openEditDialog(contextMenu.row!);
              setContextMenu(null);
            }}
          >
            <Pencil className="size-3.5" aria-hidden />
            ویرایش
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-right text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-status-danger)] hover:bg-[var(--semantic-color-surface-subtle)]"
            onClick={() => {
              requestDelete(contextMenu.row!);
            }}
          >
            <Trash2 className="size-3.5" aria-hidden />
            حذف
          </button>
        </div>
      )}

      <ConfirmDialog
        tier={2}
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
          }
        }}
        title="حذف کلاس"
        body={
          deleteTarget
            ? `کلاس «${deleteTarget.name}» برای همیشه حذف می‌شود. اگر ثبت‌نام فعالی داشته باشد، حذف انجام نخواهد شد.`
            : ""
        }
        confirmLabel="حذف کلاس"
        confirmVariant="destructive"
        confirmLoading={deleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ClassFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        title={dialogMode === "create" ? "افزودن کلاس" : "ویرایش کلاس"}
        submitLabel={dialogMode === "create" ? "ثبت" : "ذخیره"}
        state={formState}
        onChange={(patch) => setFormState((prev) => ({ ...prev, ...patch }))}
        courses={availableCourses}
        departments={departments}
        teachers={teachers}
        selectedCourse={selectedCourse}
        onSubmit={() => void handleSubmit()}
        submitLoading={submitting}
        submitDisabled={!isClassFormValid(formState)}
        formError={formError}
        fieldError={fieldError}
      />
    </>
  );
}
