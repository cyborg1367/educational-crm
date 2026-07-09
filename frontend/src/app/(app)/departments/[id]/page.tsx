"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Map } from "lucide-react";

import { DataTable } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { ErrorState } from "@/components/feedback";
import { EmptyState } from "@/components/feedback/empty-state";
import { EntityTabs } from "@/components/layout";
import { RoadmapGraph } from "@/components/roadmap";
import { Badge } from "@/components/primitives/badge";
import { T2DetailSkeleton } from "@/components/skeletons";
import { listCourses } from "@/lib/api/courses";
import { getDepartment, getDepartmentRoadmap } from "@/lib/api/departments";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import { listUsers } from "@/lib/api/users";
import type { CourseRead, DepartmentRead, UserRead } from "@/lib/api/types";
import { formatCount, formatToman } from "@/lib/locale";
import { cn } from "@/lib/utils";

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: 50,
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

export default function DepartmentDetailPage() {
  const params = useParams();
  const departmentId = Number(params.id);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [department, setDepartment] = React.useState<DepartmentRead | null>(null);
  const [managerName, setManagerName] = React.useState("—");
  const [roadmapCourses, setRoadmapCourses] = React.useState<CourseRead[]>([]);
  const [courses, setCourses] = React.useState<CourseRead[]>([]);

  const loadData = React.useCallback(async () => {
    if (!Number.isFinite(departmentId)) {
      setError({
        detail: "شناسه دپارتمان نامعتبر است",
        error_code: "NOT_FOUND",
        timestamp: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [departmentRes, roadmapRes, coursesRes, usersRes] = await Promise.all([
        getDepartment(departmentId),
        getDepartmentRoadmap(departmentId),
        listCourses({ department_id: departmentId, limit: 500 }),
        listUsers({ limit: 500 }).catch(
          (): PaginatedResponse<UserRead> => emptyPage(),
        ),
      ]);
      setDepartment(departmentRes);
      setRoadmapCourses(roadmapRes.courses);
      setCourses(coursesRes.items);
      const manager = usersRes.items.find(
        (user) => user.id === departmentRes.manager_id,
      );
      setManagerName(manager?.name ?? "—");
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری دپارتمان"));
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  if (error && !loading) {
    return <ErrorState error={error} />;
  }

  return (
    <T2DetailSkeleton
      title={loading ? "…" : (department?.name ?? "دپارتمان")}
      subtitle={
        loading ? undefined : (
          <span className="inline-flex flex-wrap items-center gap-[var(--primitive-space-2)]">
            <span>مدیر: {managerName}</span>
            {department ? <ActiveBadge isActive={department.is_active} /> : null}
          </span>
        )
      }
    >
      <EntityTabs
        tabs={[
          {
            id: "roadmap",
            label: "نقشه راه آموزشی",
            content: loading ? (
              <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                در حال بارگذاری…
              </p>
            ) : roadmapCourses.length === 0 ? (
              <EmptyState icon={Map} message="هنوز دوره‌ای تعریف نشده است" />
            ) : (
              <div className="flex flex-col gap-[var(--primitive-space-3)]">
                <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                  این نقشه راه به‌صورت خودکار از دوره‌های فعال و پیش‌نیازهایشان
                  ساخته می‌شود.
                </p>
                <div
                  style={{
                    height: 450,
                    border: "1px solid #EBEBEB",
                    borderRadius: 12,
                  }}
                >
                  <RoadmapGraph courses={roadmapCourses} />
                </div>
              </div>
            ),
          },
          {
            id: "courses",
            label: "دوره‌ها",
            content: (
              <DataTable
                columns={[
                  { key: "title", header: "عنوان" },
                  {
                    key: "current_price",
                    header: "قیمت",
                    align: "end",
                    cell: (row) => formatToman(row.current_price),
                  },
                  {
                    key: "total_hours",
                    header: "ساعت",
                    align: "end",
                    cell: (row) =>
                      row.total_hours != null
                        ? formatCount(row.total_hours)
                        : "—",
                  },
                  {
                    key: "is_active",
                    header: "وضعیت",
                    cell: (row) => <ActiveBadge isActive={row.is_active} />,
                  },
                ]}
                data={{
                  ...emptyPage<CourseRead>(),
                  items: courses,
                  total_count: courses.length,
                }}
                loading={loading}
                emptyMessage="دوره‌ای یافت نشد"
              />
            ),
          },
        ]}
      />
    </T2DetailSkeleton>
  );
}
