"use client";

import * as React from "react";
import {
  ArrowUpLeft,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Coins,
  Timer,
} from "lucide-react";

import { CardListState, DataTable } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import {
  courseFormStateFromRead,
  courseFormStateToCreateBody,
  courseFormStateToUpdateBody,
  emptyCourseFormState,
  isCourseFormValid,
  type CourseFormState,
} from "@/components/domain/course-form-fields";
import { CourseFormDialog } from "@/components/domain/course-form-dialog";
import { ErrorState, useToast } from "@/components/feedback";
import { Checkbox } from "@/components/form/selection-control";
import {
  FilterBar,
  ViewModeToggle,
  useListViewMode,
  type FilterValues,
} from "@/components/layout";
import { Badge } from "@/components/primitives/badge";
import { ListPageSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { createCourse, listCourses, updateCourse } from "@/lib/api/courses";
import { listDepartments } from "@/lib/api/departments";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import type { CourseRead, DepartmentRead } from "@/lib/api/types";
import { formatCount, formatNumber, formatToman } from "@/lib/locale";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 50;
const COURSES_VIEW_STORAGE_KEY = "courses-list-view";

const DEPARTMENT_IMAGES = {
  ai: "/images/departments/dept-ai.png",
  it: "/images/departments/dept-it.png",
  finance: "/images/departments/dept-finance.png",
  langKids: "/images/departments/dept-lang-kids.png",
  langAdult: "/images/departments/dept-lang-adult.png",
} as const;

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: PAGE_LIMIT,
  offset: 0,
  has_more: false,
});

type DialogMode = "create" | "edit";
type DepartmentVisual = {
  imageSrc: string;
  imageAlt: string;
};

/** Shared brand chrome for all course cards: orange + charcoal, royal blue only as accent. */
const BRAND_CARD = {
  headerLineClassName:
    "bg-gradient-to-l from-[var(--primitive-color-brand-500)] via-[var(--primitive-color-brand-400)] to-[#2563EB]",
  prerequisiteBoxClassName:
    "border-[var(--primitive-color-brand-200)]/80 bg-[var(--primitive-color-brand-50)]/70",
  prerequisiteChipClassName:
    "border-[var(--primitive-color-brand-200)] bg-[var(--semantic-color-surface-card)] text-[var(--primitive-color-brand-700)]",
  prerequisiteLabelClassName: "text-[var(--primitive-color-brand-700)]",
  priceBarClassName:
    "border-[var(--primitive-color-brand-200)]/70 bg-[var(--primitive-color-brand-50)]/60",
} as const;

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

function CourseMiniMetric({
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
        <p className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
          {value}
        </p>
      </div>
      <p className="mt-1 text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
        {label}
      </p>
    </div>
  );
}

function getDepartmentVisual(departmentName: string): DepartmentVisual {
  if (departmentName.includes("هوش مصنوعی")) {
    return { imageSrc: DEPARTMENT_IMAGES.ai, imageAlt: departmentName };
  }
  if (departmentName.includes("فناوری") || departmentName.includes("اطلاعات")) {
    return { imageSrc: DEPARTMENT_IMAGES.it, imageAlt: departmentName };
  }
  if (departmentName.includes("مالی")) {
    return { imageSrc: DEPARTMENT_IMAGES.finance, imageAlt: departmentName };
  }
  if (departmentName.includes("زبان")) {
    return {
      imageSrc: departmentName.includes("کودکان")
        ? DEPARTMENT_IMAGES.langKids
        : DEPARTMENT_IMAGES.langAdult,
      imageAlt: departmentName,
    };
  }
  return { imageSrc: DEPARTMENT_IMAGES.it, imageAlt: departmentName };
}

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
  const [viewMode, setViewMode] = useListViewMode(COURSES_VIEW_STORAGE_KEY);

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
  const courseTitleById = React.useMemo(
    () => new Map(coursesPage.items.map((course) => [course.id, course.title])),
    [coursesPage.items],
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
            <div className="flex flex-wrap items-center justify-between gap-[var(--primitive-space-3)]">
              <Checkbox
                label="فقط فعال"
                checked={activeOnly}
                onChange={(event) => {
                  setActiveOnly(event.target.checked);
                  setOffset(0);
                }}
              />
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>
        }
        primaryView={viewMode === "table" ? "table" : "cards"}
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
          <div className="grid grid-cols-1 gap-[var(--primitive-space-4)] md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <CardListState
              loading={loading}
              empty={rows.length === 0}
              emptyIcon={BookOpen}
              emptyMessage={
                departmentFilter || activeOnly
                  ? "دوره‌ای با این فیلتر یافت نشد."
                  : "هنوز دوره‌ای تعریف نشده است."
              }
              emptyAction={
                activeDepartments.length > 0 && !departmentFilter && !activeOnly
                  ? { label: "افزودن دوره", onClick: openCreateDialog }
                  : undefined
              }
              skeletonCount={8}
            >
              {rows.map((row) => {
                const prerequisiteNames = row.prerequisite_course_ids
                  .map((id) => courseTitleById.get(id) ?? `دوره #${formatCount(id)}`);
                const deptVisual = getDepartmentVisual(row.department_name);

                return (
                  <article
                    key={row.id}
                    className={cn(
                      "relative overflow-hidden rounded-[var(--primitive-radius-lg)]",
                      "border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)]/95",
                      "shadow-[var(--primitive-elevation-1)] transition-all duration-[var(--primitive-motion-duration-base)]",
                      "hover:-translate-y-0.5 hover:shadow-[var(--primitive-elevation-2)]",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute inset-x-0 top-0 h-0.5",
                        BRAND_CARD.headerLineClassName,
                      )}
                      aria-hidden
                    />
                    <button
                      type="button"
                      onClick={() => openEditDialog(row)}
                      className="flex h-full w-full flex-col p-[var(--semantic-space-cardPadding)] text-right"
                    >
                      <div className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)]/70 bg-[color-mix(in_srgb,var(--semantic-color-surface-subtle)_75%,white)] px-[var(--primitive-space-3)] py-[var(--primitive-space-3)]">
                        <div className="flex items-start justify-between gap-[var(--primitive-space-3)]">
                          <div className="flex min-w-0 items-center gap-[var(--primitive-space-3)]">
                            <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--primitive-radius-lg)] bg-[var(--semantic-color-surface-card)] shadow-[var(--primitive-elevation-1)] ring-1 ring-[var(--semantic-color-surface-border)]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={deptVisual.imageSrc}
                                alt={deptVisual.imageAlt}
                                width={64}
                                height={64}
                                className="size-full object-contain p-1"
                                loading="lazy"
                                decoding="async"
                              />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                                {row.title}
                              </p>
                              <p className="mt-1 truncate text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                                {row.department_name}
                              </p>
                            </div>
                          </div>
                          <ActiveBadge isActive={row.is_active} />
                        </div>
                      </div>

                      <div
                        className={cn(
                          "mt-[var(--primitive-space-3)] flex items-center justify-between gap-[var(--primitive-space-3)] rounded-[var(--primitive-radius-md)] border px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
                          BRAND_CARD.priceBarClassName,
                        )}
                      >
                        <div className="inline-flex items-center gap-[var(--primitive-space-2)] text-[var(--primitive-color-brand-700)]">
                          <Coins className="size-4" aria-hidden />
                          <span className="text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)]">
                            شهریه
                          </span>
                        </div>
                        <p className="text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-semibold)] text-[var(--primitive-color-brand-700)]">
                          {formatToman(row.current_price)}
                        </p>
                      </div>

                      <div className="mt-[var(--primitive-space-3)] grid grid-cols-2 gap-[var(--primitive-space-2)]">
                        <CourseMiniMetric
                          icon={CalendarDays}
                          value={
                            row.duration_sessions != null
                              ? formatCount(row.duration_sessions)
                              : "—"
                          }
                          label="جلسه"
                        />
                        <CourseMiniMetric
                          icon={CalendarClock}
                          value={
                            row.sessions_per_week != null
                              ? formatCount(row.sessions_per_week)
                              : "—"
                          }
                          label="در هفته"
                        />
                        <CourseMiniMetric
                          icon={Timer}
                          value={
                            row.total_hours != null ? formatCount(row.total_hours) : "—"
                          }
                          label="ساعت کل"
                        />
                        <CourseMiniMetric
                          icon={Timer}
                          value={
                            row.session_duration != null
                              ? formatNumber(row.session_duration)
                              : "—"
                          }
                          label="هر جلسه"
                        />
                      </div>

                      <div
                        className={cn(
                          "mt-[var(--primitive-space-3)] rounded-[var(--primitive-radius-md)] border px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
                          BRAND_CARD.prerequisiteBoxClassName,
                        )}
                      >
                        <p
                          className={cn(
                            "mb-[var(--primitive-space-1)] inline-flex items-center gap-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)]",
                            BRAND_CARD.prerequisiteLabelClassName,
                          )}
                        >
                          <ArrowUpLeft className="size-3.5" aria-hidden />
                          پیش‌نیاز مسیر
                        </p>
                        {prerequisiteNames.length > 0 ? (
                          <div className="flex flex-wrap gap-[var(--primitive-space-2)]">
                            {prerequisiteNames.map((name) => (
                              <span
                                key={name}
                                className={cn(
                                  "rounded-[var(--primitive-radius-full)] border bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-2)] py-0.5 text-[length:var(--primitive-font-size-xs)]",
                                  BRAND_CARD.prerequisiteChipClassName,
                                )}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                            این دوره شروع مسیر است و پیش‌نیاز ندارد.
                          </p>
                        )}
                      </div>
                    </button>
                  </article>
                );
              })}
            </CardListState>
          </div>
        }
      />

      <CourseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogMode === "create" ? "افزودن دوره" : "ویرایش دوره"}
        submitLabel={dialogMode === "create" ? "ثبت" : "ذخیره"}
        onSubmit={() => void handleSubmit()}
        submitLoading={submitting}
        submitDisabled={!isCourseFormValid(formState)}
        departments={departments}
        courses={coursesPage.items}
        currentCourseId={editingCourseId}
        state={formState}
        onChange={(patch) =>
          setFormState((prev) => ({ ...prev, ...patch }))
        }
        fieldError={fieldError}
        formError={formError}
      />
    </>
  );
}
