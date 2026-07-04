"use client";

import * as React from "react";

import { DataTable, EntitySummaryCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { AppDrawer, ErrorState, useToast } from "@/components/feedback";
import { Checkbox } from "@/components/form/selection-control";
import { FormField } from "@/components/form/form-field";
import { MoneyInput } from "@/components/form/money-input";
import { Select } from "@/components/form/select";
import { Textarea } from "@/components/form/textarea";
import { TextInput } from "@/components/form/text-input";
import { FilterBar, type FilterValues } from "@/components/layout";
import { Badge } from "@/components/primitives/badge";
import { ListPageSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { createCourse, listCourses } from "@/lib/api/courses";
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

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formTitle, setFormTitle] = React.useState("");
  const [formDepartmentId, setFormDepartmentId] = React.useState("");
  const [formPrice, setFormPrice] = React.useState<number | null>(null);
  const [formDuration, setFormDuration] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formIsActive, setFormIsActive] = React.useState(true);
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

  const resetForm = () => {
    setFormTitle("");
    setFormDepartmentId(
      departments[0] ? String(departments[0].id) : "",
    );
    setFormPrice(null);
    setFormDuration("");
    setFormDescription("");
    setFormIsActive(true);
    setFormError(null);
    setFieldError(null);
  };

  const handleCreate = async () => {
    if (!formTitle.trim() || !formDepartmentId || formPrice == null || formPrice <= 0) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFieldError(null);
    try {
      await createCourse({
        title: formTitle.trim(),
        department_id: Number(formDepartmentId),
        current_price: formPrice,
        duration_sessions: formDuration ? Number(formDuration) : null,
        description: formDescription.trim() || null,
        is_active: formIsActive,
      });
      toast({ variant: "success", title: "دوره جدید ثبت شد" });
      setDrawerOpen(false);
      resetForm();
      void loadData();
    } catch (err) {
      const validation = fieldErrorFromApi(err);
      if (validation) {
        setFieldError(validation);
      } else {
        setFormError(toApiError(err, "خطا در ثبت دوره"));
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
            onClick={() => {
              resetForm();
              setDrawerOpen(true);
            }}
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
                />
              ))
            )}
          </div>
        }
      />

      <AppDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="form"
        title="افزودن دوره"
        onSubmit={handleCreate}
        submitLabel="ثبت"
        submitLoading={submitting}
        submitDisabled={
          !formTitle.trim() ||
          !formDepartmentId ||
          formPrice == null ||
          formPrice <= 0
        }
      >
        {formError ? (
          <ErrorState error={formError} className="py-[var(--primitive-space-4)]" />
        ) : null}
        <div className="flex flex-col gap-[var(--primitive-space-4)]">
          <FormField
            label="عنوان"
            required
            error={fieldError?.field === "title" ? fieldError : null}
          >
            <TextInput
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </FormField>
          <FormField
            label="دپارتمان"
            required
            error={fieldError?.field === "department_id" ? fieldError : null}
          >
            <Select
              options={departments.map((dept) => ({
                value: String(dept.id),
                label: dept.name,
              }))}
              value={formDepartmentId}
              onChange={setFormDepartmentId}
              placeholder="انتخاب دپارتمان"
            />
          </FormField>
          <FormField
            label="قیمت"
            required
            error={fieldError?.field === "current_price" ? fieldError : null}
          >
            <MoneyInput value={formPrice} onValueChange={setFormPrice} />
          </FormField>
          <FormField
            label="تعداد جلسات"
            error={fieldError?.field === "duration_sessions" ? fieldError : null}
          >
            <TextInput
              type="number"
              min={1}
              value={formDuration}
              onChange={(e) => setFormDuration(e.target.value)}
            />
          </FormField>
          <FormField
            label="توضیحات"
            error={fieldError?.field === "description" ? fieldError : null}
          >
            <Textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
            />
          </FormField>
          <Checkbox
            label="فعال"
            checked={formIsActive}
            onChange={(e) => setFormIsActive(e.target.checked)}
          />
        </div>
      </AppDrawer>
    </>
  );
}
