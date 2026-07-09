"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DataTable, EntitySummaryCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { ErrorState } from "@/components/feedback";
import { ListPageSkeleton } from "@/components/skeletons";
import { getDepartmentRoadmap, listDepartments } from "@/lib/api/departments";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import type { DepartmentRead } from "@/lib/api/types";
import { sortDepartmentsByInstituteCatalog } from "@/lib/department/institute-departments";
import { formatCount } from "@/lib/locale";

const PAGE_LIMIT = 50;

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: PAGE_LIMIT,
  offset: 0,
  has_more: false,
});

type DepartmentRoadmapRow = DepartmentRead & { course_count: number };

export default function RoadmapsListPage() {
  const router = useRouter();

  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [departmentsPage, setDepartmentsPage] =
    React.useState<PaginatedResponse<DepartmentRead>>(emptyPage);
  const [courseCounts, setCourseCounts] = React.useState<Map<number, number>>(
    new Map(),
  );

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const departments = await listDepartments({ limit: PAGE_LIMIT, offset });
      setDepartmentsPage(departments);

      const counts = await Promise.all(
        departments.items.map(async (department) => {
          try {
            const roadmap = await getDepartmentRoadmap(department.id);
            return [department.id, roadmap.courses.length] as const;
          } catch {
            return [department.id, 0] as const;
          }
        }),
      );
      setCourseCounts(new Map(counts));
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری نقشه‌های راه"));
    } finally {
      setLoading(false);
    }
  }, [offset]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const rows: DepartmentRoadmapRow[] = React.useMemo(
    () =>
      sortDepartmentsByInstituteCatalog(departmentsPage.items).map(
        (department) => ({
          ...department,
          course_count: courseCounts.get(department.id) ?? 0,
        }),
      ),
    [departmentsPage.items, courseCounts],
  );

  const tableData: PaginatedResponse<DepartmentRoadmapRow> = {
    ...departmentsPage,
    items: rows,
  };

  if (error && !loading && departmentsPage.items.length === 0) {
    return <ErrorState error={error} />;
  }

  return (
    <ListPageSkeleton
      title="نقشه‌های راه"
      headerAction={null}
      filterBar={
        <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          نقشه راه هر دپارتمان به‌صورت خودکار از دوره‌ها و پیش‌نیازهایشان ساخته
          می‌شود. برای ویرایش، دوره‌ها را در بخش «دوره‌ها» مدیریت کنید.
        </p>
      }
      table={
        <DataTable
          columns={[
            { key: "name", header: "دپارتمان" },
            {
              key: "course_count",
              header: "تعداد دوره",
              align: "end",
              cell: (row) => formatCount(row.course_count),
            },
          ]}
          data={tableData}
          loading={loading}
          onPageChange={setOffset}
          onRowClick={(row) => router.push(`/departments/${row.id}`)}
          emptyMessage="دپارتمانی یافت نشد"
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
              دپارتمانی یافت نشد
            </p>
          ) : (
            rows.map((row) => (
              <EntitySummaryCard
                key={row.id}
                title={row.name}
                meta={`${formatCount(row.course_count)} دوره`}
                onClick={() => router.push(`/departments/${row.id}`)}
              />
            ))
          )}
        </div>
      }
    />
  );
}
