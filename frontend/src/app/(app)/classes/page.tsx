"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DataTable, EntitySummaryCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { StatusBadge } from "@/components/domain";
import { ErrorState } from "@/components/feedback";
import { FilterBar, type FilterValues } from "@/components/layout";
import { ListPageSkeleton } from "@/components/skeletons";
import { toApiError } from "@/lib/api/errors";
import type { ApiError } from "@/lib/api/error";
import { getCourse, listClasses } from "@/lib/api/finance";
import { listUsers } from "@/lib/api/users";
import type { CourseClassRead, CourseRead, ClassStatus, UserRead } from "@/lib/api/types";
import { formatDateDisplay } from "@/lib/locale";
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

export default function ClassesListPage() {
  const router = useRouter();

  const [filterValues, setFilterValues] = React.useState<FilterValues>({});
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [classesPage, setClassesPage] =
    React.useState<PaginatedResponse<CourseClassRead>>(emptyPage);
  const [coursesById, setCoursesById] = React.useState<Map<number, CourseRead>>(
    new Map(),
  );
  const [usersById, setUsersById] = React.useState<Map<number, UserRead>>(
    new Map(),
  );

  const statusFilter =
    typeof filterValues.status === "string" ? filterValues.status : undefined;

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [classRes, usersRes] = await Promise.all([
        listClasses({
          limit: PAGE_LIMIT,
          offset,
          status: statusFilter as ClassStatus | undefined,
        }),
        listUsers({ limit: 500 }),
      ]);
      setClassesPage(classRes);
      setUsersById(new Map(usersRes.items.map((user) => [user.id, user])));

      const courseIds = [...new Set(classRes.items.map((cls) => cls.course_id))];
      const courses = await Promise.all(
        courseIds.map((id) => getCourse(id).catch(() => null)),
      );
      const courseMap = new Map<number, CourseRead>();
      for (const course of courses) {
        if (course) {
          courseMap.set(course.id, course);
        }
      }
      setCoursesById(courseMap);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری کلاس‌ها"));
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

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

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <ListPageSkeleton
      title="کلاس‌ها"
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
  );
}
