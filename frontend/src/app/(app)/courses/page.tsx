"use client";

import * as React from "react";

import { DataTable, EntitySummaryCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import {
  CourseFormFields,
  courseFormStateFromRead,
  courseFormStateToCreateBody,
  courseFormStateToUpdateBody,
  emptyCourseFormState,
  isCourseFormValid,
  type CourseFormState,
} from "@/components/domain/course-form-fields";
import { FormDialog } from "@/components/domain/form-dialog";
import { ErrorState, useToast } from "@/components/feedback";
import { Checkbox } from "@/components/form/selection-control";
import { FilterBar, type FilterValues } from "@/components/layout";
import { Badge } from "@/components/primitives/badge";
import { ListPageSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { createCourse, listCourses, updateCourse } from "@/lib/api/courses";
import { listDepartments } from "@/lib/api/departments";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import type { CourseRead, DepartmentRead } from "@/lib/api/types";
import { formatCount, formatToman } from "@/lib/locale";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 50;

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: PAGE_LIMIT,
  offset: 0,
  has_more: false,
});

type DialogMode = "create" | "edit";

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant={isActive ? undefined : "neutral"}
      className={cn(
        isActive &&
          "bg-[color-mix(in_srgb,var(--semantic-color-surface-subtle)_88%,var(--semantic-color-surface-border))] text-[var(--semantic-color-status-success)]",
      )}
    >
      {isActive ? "فعال" : "غیرفعال"}
    </Badge>
  );
}

type CourseRow = CourseRead & { department_name: string };

export default function CoursesListPage() {
  const { toast } = useToast();

  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const [activeOnly, setActiveOnly] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [coursesPage, setCoursesPage] =
    React.useState<PaginatedResponse<CourseRead>>(emptyPage);
  const [departments, setDepartments] = React.useState<DepartmentRead[]>([]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<DialogMode>("create");
  const [editingCourseId, setEditingCourseId] = React.useState<number | null>(
    null,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [formState, setFormState] = React.useState<CourseFormState>(
    emptyCourseFormState(),
  );
  const [formError, setFormError] = React.useState<ApiError | null>(null);
  const [fieldError, setFieldError] = React.useState<ApiFieldError | null>(null);

  const departmentFilter =
    typeof filterValues.department === "string"
      ? filterValues.department
      : undefined;

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [courses, deptRes] = await Promise.all([
        listCourses({
          limit: PAGE_LIMIT,
          offset,
          is_active: activeOnly ? true : undefined,
        }),
        listDepartments({ limit: 100 }),
      ]);
      setCoursesPage(courses);
      setDepartments(deptRes.items);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری دوره‌ها"));
    } finally {
      setLoading(false);
    }
  }, [offset, activeOnly]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const departmentById = React.useMemo(
    () => new Map(departments.map((dept) => [dept.id, dept.name])),
    [departments],
  );

  const rows: CourseRow[] = React.useMemo(() => {
    return coursesPage.items
      .filter((course) => {
        if (departmentFilter) {
          return course.department_id === Number(departmentFilter);
        }
        return true;
      })
      .map((course) => ({
        ...course,
        department_name: departmentById.get(course.department_id) ?? "—",
      }));
  }, [coursesPage.items, departmentFilter, departmentById]);

  const tableData: PaginatedResponse<CourseRow> = departmentFilter
    ? { ...coursesPage, items: rows, total_count: rows.length }
    : { ...coursesPage, items: rows };

  const facets = React.useMemo(
    () => [
      {
        id: "department",
        type: "select" as const,
        label: "دپارتمان",
        placeholder: "همه",
        options: departments.map((dept) => ({
          value: String(dept.id),
          label: dept.name,
        })),
      },
    ],
    [departments],
  );

  const activeDepartments = React.useMemo(
    () => departments.filter((department) => department.is_active),
    [departments],
  );

  const resetForm = () => {
    setFormState(emptyCourseFormState(activeDepartments));
    setEditingCourseId(null);
    setFormError(null);
    setFieldError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (course: CourseRead) => {
    setFormState(courseFormStateFromRead(course));
    setEditingCourseId(course.id);
    setDialogMode("edit");
    setFormError(null);
    setFieldError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!isCourseFormValid(formState)) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFieldError(null);
    try {
      if (dialogMode === "create") {
        await createCourse(courseFormStateToCreateBody(formState));
        toast({ variant: "success", title: "دوره جدید ثبت شد" });
      } else if (editingCourseId != null) {
        await updateCourse(
          editingCourseId,
          courseFormStateToUpdateBody(formState),
        );
        toast({ variant: "success", title: "دوره به‌روزرسانی شد" });
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
            dialogMode === "create" ? "خطا در ثبت دوره" : "خطا در ویرایش دوره",
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !loading && coursesPage.items.length === 0) {
    return <ErrorState error={error} />;
  }

  return (
    <>
      <ListPageSkeleton
        title="دوره‌ها"
        headerAction={
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={activeDepartments.length === 0}
            onClick={openCreateDialog}
          >
            افزودن دوره
          </Button>
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
            <Checkbox
              label="فقط فعال"
              checked={activeOnly}
              onChange={(event) => {
                setActiveOnly(event.target.checked);
                setOffset(0);
              }}
            />
          </div>
        }
        table={
          <DataTable
            columns={[
              { key: "title", header: "عنوان" },
              { key: "department_name", header: "دپارتمان" },
              {
                key: "current_price",
                header: "قیمت",
                align: "end",
                cell: (row) => formatToman(row.current_price),
              },
              {
                key: "is_active",
                header: "وضعیت",
                cell: (row) => <ActiveBadge isActive={row.is_active} />,
              },
              {
                key: "duration_sessions",
                header: "تعداد جلسات",
                align: "end",
                cell: (row) =>
                  row.duration_sessions != null
                    ? formatCount(row.duration_sessions)
                    : "—",
              },
              {
                key: "actions",
                header: "",
                align: "end",
                cell: (row) => (
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
            ]}
            data={tableData}
            loading={loading}
            onPageChange={setOffset}
            emptyMessage="دوره‌ای یافت نشد"
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
                دوره‌ای یافت نشد
              </p>
            ) : (
              rows.map((row) => (
                <EntitySummaryCard
                  key={row.id}
                  title={row.title}
                  subtitle={row.department_name}
                  meta={formatToman(row.current_price)}
                  badges={<ActiveBadge isActive={row.is_active} />}
                  onClick={() => openEditDialog(row)}
                />
              ))
            )}
          </div>
        }
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogMode === "create" ? "افزودن دوره" : "ویرایش دوره"}
        submitLabel={dialogMode === "create" ? "ثبت" : "ذخیره"}
        onSubmit={() => void handleSubmit()}
        submitLoading={submitting}
        submitDisabled={!isCourseFormValid(formState)}
        formError={formError}
      >
        <CourseFormFields
          state={formState}
          onChange={(patch) =>
            setFormState((prev) => ({ ...prev, ...patch }))
          }
          departments={departments}
          editingCourseId={editingCourseId}
          fieldError={fieldError}
        />
      </FormDialog>
    </>
  );
}
