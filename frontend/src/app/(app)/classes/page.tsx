"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  GraduationCap,
  LayoutGrid,
  Pencil,
  Table2,
  Trash2,
  Users,
} from "lucide-react";

import { DataTable } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { StatusBadge } from "@/components/domain";
import { ClassFormDialog } from "@/components/domain/class-form-dialog";
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
import { FilterBar, type FilterValues } from "@/components/layout";
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
type ClassesListViewMode = "cards" | "table";

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
  const [viewMode, setViewMode] = React.useState<ClassesListViewMode>("cards");
  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    row: ClassRow | null;
  } | null>(null);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(CLASSES_VIEW_STORAGE_KEY);
    if (stored === "cards" || stored === "table") {
      setViewMode(stored);
    }
  }, []);

  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleViewModeChange = (mode: ClassesListViewMode) => {
    setViewMode(mode);
    window.localStorage.setItem(CLASSES_VIEW_STORAGE_KEY, mode);
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

  const handleDelete = async (classId: number) => {
    try {
      await deleteClass(classId);
      toast({ variant: "success", title: "کلاس حذف شد" });
      setContextMenu(null);
      void loadData();
    } catch (err) {
      toast({ variant: "error", title: toApiError(err, "خطا در حذف کلاس").message });
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
              <div
                className={cn(
                  "inline-flex rounded-[var(--primitive-radius-full)] border border-[var(--semantic-color-surface-border)]",
                  "bg-[var(--semantic-color-surface-card)] p-0.5 shadow-[var(--primitive-elevation-1)]",
                )}
                role="group"
                aria-label="نوع نمایش"
              >
                {(
                  [
                    { mode: "cards" as const, icon: LayoutGrid, label: "کارت" },
                    { mode: "table" as const, icon: Table2, label: "جدول" },
                  ] as const
                ).map(({ mode, icon: Icon, label }) => {
                  const active = viewMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleViewModeChange(mode)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex items-center gap-[var(--primitive-space-1)] rounded-[var(--primitive-radius-full)]",
                        "px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
                        "text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)]",
                        "transition-colors duration-150",
                        active
                          ? "bg-[var(--semantic-color-action-primary)] text-[var(--semantic-color-text-inverse)]"
                          : "text-[var(--semantic-color-text-secondary)] hover:text-[var(--semantic-color-text-primary)]",
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
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
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditDialog(row);
                          }}
                        >
                          ویرایش
                        </Button>
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
            {loading ? (
              <p className="col-span-full text-center text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                در حال بارگذاری…
              </p>
            ) : rows.length === 0 ? (
              <p className="col-span-full text-center text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                کلاسی یافت نشد
              </p>
            ) : (
              rows.map((row) => {
                const weekdays = row.weekdays ?? [];
                const goToDetail = () => router.push(`/classes/${row.id}`);

                return (
                  <article
                    key={row.id}
                    className={cn(
                      "relative overflow-hidden rounded-[var(--primitive-radius-lg)]",
                      "border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)]/95",
                      "shadow-[var(--primitive-elevation-1)] transition-all duration-[var(--primitive-motion-duration-base)]",
                      "hover:-translate-y-0.5 hover:shadow-[var(--primitive-elevation-2)]",
                    )}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      if (canManage) {
                        setContextMenu({
                          x: event.clientX,
                          y: event.clientY,
                          row,
                        });
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
                      className="flex h-full w-full cursor-pointer flex-col p-[var(--semantic-space-cardPadding)] text-right outline-none focus-visible:ring-2 focus-visible:ring-[var(--primitive-color-brand-400)]"
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
                        <div className="mt-[var(--primitive-space-3)] flex items-center justify-between gap-[var(--primitive-space-2)]">
                          {canManage && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="size-8 p-0 hover:bg-[var(--semantic-color-surface-subtle)]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditDialog(row);
                                }}
                                title="ویرایش"
                              >
                                <Pencil className="size-3.5" aria-hidden />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="size-8 p-0 hover:bg-[var(--semantic-color-surface-subtle)] text-[var(--semantic-color-text-destructive)]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDelete(row.id);
                                }}
                                title="حذف"
                              >
                                <Trash2 className="size-3.5" aria-hidden />
                              </Button>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-[var(--primitive-space-2)]">
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
                        </div>
                      ) : canManage ? (
                        <div className="mt-[var(--primitive-space-3)] flex justify-start">
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="size-8 p-0 hover:bg-[var(--semantic-color-surface-subtle)]"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditDialog(row);
                              }}
                              title="ویرایش"
                            >
                              <Pencil className="size-3.5" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="size-8 p-0 hover:bg-[var(--semantic-color-surface-subtle)] text-[var(--semantic-color-text-destructive)]"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(row.id);
                              }}
                              title="حذف"
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        }
      />

      {contextMenu && contextMenu.row && (
        <div
          className="fixed z-50 min-w-[150px] rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] shadow-[var(--primitive-elevation-3)] py-1"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
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
            className="flex w-full items-center gap-2 px-3 py-2 text-right text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-destructive)] hover:bg-[var(--semantic-color-surface-subtle)]"
            onClick={() => {
              handleDelete(contextMenu.row!.id);
            }}
          >
            <Trash2 className="size-3.5" aria-hidden />
            حذف
          </button>
        </div>
      )}

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
