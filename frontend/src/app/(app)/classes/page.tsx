"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DataTable, EntitySummaryCard } from "@/components/data-display";
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
import { FilterBar, type FilterValues } from "@/components/layout";
import { ListPageSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { listCourses } from "@/lib/api/courses";
import { listDepartments } from "@/lib/api/departments";
import { createClass, getCourse, listClasses, updateClass } from "@/lib/api/finance";
import { getMe, listUsers } from "@/lib/api/users";
import type {
  CourseClassRead,
  CourseRead,
  ClassStatus,
  DepartmentRead,
  UserRead,
} from "@/lib/api/types";
import { canManageClasses, getCurrentRole } from "@/lib/auth/role";
import { formatDateDisplay } from "@/lib/locale";
import type { UserRole } from "@/lib/nav/types";
import { CLASS_STATUS_OPTIONS } from "@/lib/terminology";

const PAGE_LIMIT = 50;

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
          <FilterBar
            facets={facets}
            values={filterValues}
            onValuesChange={(values) => {
              setFilterValues(values);
              setOffset(0);
            }}
          />
        }
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
          <div className="flex flex-col gap-[var(--primitive-space-3)]">
            {loading ? (
              <p className="text-center text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                در حال بارگذاری…
              </p>
            ) : rows.length === 0 ? (
              <p className="text-center text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                کلاسی یافت نشد
              </p>
            ) : (
              rows.map((row) => (
                <EntitySummaryCard
                  key={row.id}
                  title={row.name}
                  subtitle={row.course_name}
                  meta={formatDateDisplay(row.start_date)}
                  onClick={() => router.push(`/classes/${row.id}`)}
                />
              ))
            )}
          </div>
        }
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
