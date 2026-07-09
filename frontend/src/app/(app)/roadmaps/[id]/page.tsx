"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CircleDot, GitBranchPlus, RefreshCw, Route } from "lucide-react";

import { DataTable } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { AppDrawer, ErrorState, useToast } from "@/components/feedback";
import { FormField } from "@/components/form/form-field";
import { TextInput } from "@/components/form/text-input";
import { T2DetailSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { getCourse, listCourses } from "@/lib/api/courses";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import {
  getRoadmap,
  listRoadmapItems,
  syncRoadmapItems,
  updateRoadmap,
} from "@/lib/api/roadmaps";
import type {
  CourseRead,
  RoadmapItemRead,
  RoadmapRead,
} from "@/lib/api/types";
import { formatCount } from "@/lib/locale";
import {
  buildRoadmapPrerequisiteGraph,
  roadmapGraphNodeClassName,
} from "@/lib/roadmap/graph";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 200;

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: PAGE_LIMIT,
  offset: 0,
  has_more: false,
});

type ItemRow = RoadmapItemRead & {
  course_name: string;
};

export default function RoadmapDetailPage() {
  return (
    <React.Suspense
      fallback={
        <T2DetailSkeleton title="…" headerAction={null}>
          <p className="text-[var(--semantic-color-text-secondary)]">
            در حال بارگذاری…
          </p>
        </T2DetailSkeleton>
      }
    >
      <RoadmapDetailContent />
    </React.Suspense>
  );
}

function RoadmapDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roadmapId = Number(params.id);
  const isNewlyCreated = searchParams.get("new") === "1";
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [roadmap, setRoadmap] = React.useState<RoadmapRead | null>(null);
  const [itemsPage, setItemsPage] =
    React.useState<PaginatedResponse<RoadmapItemRead>>(emptyPage);
  const [coursesById, setCoursesById] = React.useState<Map<number, CourseRead>>(
    new Map(),
  );

  const [editDrawerOpen, setEditDrawerOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editSubmitting, setEditSubmitting] = React.useState(false);
  const [editError, setEditError] = React.useState<ApiError | null>(null);
  const [syncing, setSyncing] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!Number.isFinite(roadmapId)) {
      setError({
        detail: "شناسه نقشه راه نامعتبر است",
        error_code: "NOT_FOUND",
        timestamp: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [roadmapRes, itemsRes, coursesRes] = await Promise.all([
        getRoadmap(roadmapId),
        listRoadmapItems(roadmapId, { limit: PAGE_LIMIT, offset: 0 }),
        listCourses({ limit: 500 }),
      ]);
      setRoadmap(roadmapRes);
      setEditName(roadmapRes.name);
      setItemsPage(itemsRes);

      const coursesMap = new Map(
        coursesRes.items.map((course) => [course.id, course]),
      );

      const missingCourseIds = [
        ...new Set(
          itemsRes.items
            .map((item) => item.course_id)
            .filter((id): id is number => id != null),
        ),
      ].filter((id) => !coursesMap.has(id));

      if (missingCourseIds.length > 0) {
        const fetched = await Promise.all(
          missingCourseIds.map((id) => getCourse(id).catch(() => null)),
        );
        for (const course of fetched) {
          if (course) {
            coursesMap.set(course.id, course);
          }
        }
      }
      setCoursesById(coursesMap);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری نقشه راه"));
    } finally {
      setLoading(false);
    }
  }, [roadmapId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const rows: ItemRow[] = React.useMemo(() => {
    return [...itemsPage.items]
      .sort((a, b) => a.sequence - b.sequence)
      .map((item) => ({
        ...item,
        course_name: item.course_id
          ? coursesById.get(item.course_id)?.title ?? "—"
          : "—",
      }));
  }, [itemsPage.items, coursesById]);

  const graph = React.useMemo(
    () => buildRoadmapPrerequisiteGraph(rows, coursesById),
    [rows, coursesById],
  );

  const tableData: PaginatedResponse<ItemRow> = {
    ...itemsPage,
    items: rows,
    total_count: rows.length,
  };

  const clearNewQuery = () => {
    if (isNewlyCreated) {
      router.replace(`/roadmaps/${roadmapId}`);
    }
  };

  const handleEditRoadmap = async () => {
    if (!roadmap || !editName.trim()) {
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      const updated = await updateRoadmap(roadmap.id, { name: editName.trim() });
      setRoadmap(updated);
      toast({ variant: "success", title: "نقشه راه به‌روزرسانی شد" });
      setEditDrawerOpen(false);
    } catch (err) {
      setEditError(toApiError(err, "خطا در ویرایش نقشه راه"));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncRoadmapItems(roadmapId);
      toast({
        variant: "success",
        title: "همگام‌سازی انجام شد",
        description: "مراحل از دوره‌های فعال دپارتمان بازسازی شد.",
      });
      clearNewQuery();
      await loadData();
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در همگام‌سازی نقشه راه").detail,
      });
    } finally {
      setSyncing(false);
    }
  };

  if (error && !loading) {
    return <ErrorState error={error} />;
  }

  const hasItems = !loading && itemsPage.total_count > 0;

  return (
    <>
      <T2DetailSkeleton
        title={loading ? "…" : (roadmap?.name ?? "نقشه راه")}
        headerAction={
          <div className="flex flex-wrap items-center gap-[var(--primitive-space-2)]">
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={loading || !roadmap || syncing}
              onClick={() => void handleSync()}
            >
              <RefreshCw
                className={cn("size-4", syncing && "animate-spin")}
                aria-hidden
              />
              همگام‌سازی از دوره‌ها
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={loading || !roadmap}
              onClick={() => {
                setEditName(roadmap?.name ?? "");
                setEditError(null);
                setEditDrawerOpen(true);
              }}
            >
              ویرایش نام
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-[var(--primitive-space-4)]">
          {!loading && itemsPage.total_count === 0 ? (
            <section className="rounded-[var(--primitive-radius-lg)] border border-dashed border-[var(--primitive-color-brand-200)] bg-[color-mix(in_srgb,var(--primitive-color-brand-50)_45%,white)] px-[var(--primitive-space-5)] py-[var(--primitive-space-5)]">
              <div className="flex flex-col gap-[var(--primitive-space-4)] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-[var(--primitive-space-3)]">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--primitive-radius-full)] border border-[var(--primitive-color-brand-200)] bg-[var(--semantic-color-surface-card)] text-[var(--primitive-color-brand-700)]">
                    <Route className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                      {isNewlyCreated
                        ? "نقشه‌راه ساخته شد — دوره‌های دپارتمان به‌صورت خودکار مسیر را می‌سازند"
                        : "هنوز مرحله‌ای همگام نشده"}
                    </h3>
                    <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                      {isNewlyCreated
                        ? "اگر مسیر خالی است، «همگام‌سازی از دوره‌ها» را بزنید تا مراحل از دوره‌های فعال دپارتمان و پیش‌نیازها ساخته شود."
                        : "مراحل از دوره‌های فعال دپارتمان و روابط پیش‌نیاز ساخته می‌شوند. برای بازسازی مسیر، همگام‌سازی کنید."}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={syncing}
                  onClick={() => void handleSync()}
                >
                  <RefreshCw
                    className={cn("size-4", syncing && "animate-spin")}
                    aria-hidden
                  />
                  همگام‌سازی از دوره‌ها
                </Button>
              </div>
            </section>
          ) : null}

          {hasItems || loading ? (
            <DataTable
              className="[&_td]:py-[var(--primitive-space-2)] [&_th]:py-[var(--primitive-space-2)]"
              columns={[
                {
                  key: "sequence",
                  header: "ترتیب",
                  align: "end",
                  cell: (row) => formatCount(row.sequence),
                },
                { key: "course_name", header: "دوره" },
                {
                  key: "title",
                  header: "یادداشت",
                  cell: (row) => row.title,
                },
              ]}
              data={tableData}
              loading={loading}
              emptyMessage="آیتمی ثبت نشده"
            />
          ) : null}

          <section className="rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-4)] shadow-[var(--primitive-elevation-1)]">
            <div className="mb-[var(--primitive-space-3)] flex flex-wrap items-center justify-between gap-[var(--primitive-space-2)] text-[var(--semantic-color-text-primary)]">
              <div className="flex items-center gap-[var(--primitive-space-2)]">
                <GitBranchPlus className="size-4 text-[var(--primitive-color-brand-600)]" />
                <h3 className="text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-semibold)]">
                  گراف مسیر
                </h3>
              </div>
              {graph.nodes.length > 0 ? (
                <span className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                  {formatCount(graph.rootCount)} ریشه
                </span>
              ) : null}
            </div>
            {graph.nodes.length === 0 ? (
              <p className="text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                هنوز آیتمی برای نمایش گراف ثبت نشده است.
              </p>
            ) : (
              <div className="overflow-x-auto pb-[var(--primitive-space-2)]">
                {graph.externalPrerequisiteCount > 0 ? (
                  <p className="mb-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                    {formatCount(graph.externalPrerequisiteCount)} پیش‌نیاز خارج از
                    آیتم‌های فعلی نقشه‌راه در گراف نمایش داده نشده است.
                  </p>
                ) : null}
                <div
                  className="relative"
                  style={{ width: graph.width, height: graph.height }}
                >
                  <svg
                    className="absolute inset-0 h-full w-full"
                    viewBox={`0 0 ${graph.width} ${graph.height}`}
                    aria-hidden
                  >
                    <defs>
                      <marker
                        id="roadmap-arrow"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path
                          d="M 0 0 L 10 5 L 0 10 z"
                          fill="var(--primitive-color-brand-500)"
                        />
                      </marker>
                    </defs>
                    {graph.edges.map((edge) => {
                      const from = graph.nodes.find((node) => node.id === edge.fromId);
                      const to = graph.nodes.find((node) => node.id === edge.toId);
                      if (!from || !to) {
                        return null;
                      }
                      const midX = (from.x + to.x) / 2;
                      return (
                        <path
                          key={`${edge.fromId}-${edge.toId}`}
                          d={`M ${from.x + 90} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - 90} ${to.y}`}
                          stroke="var(--primitive-color-brand-400)"
                          strokeWidth="2.5"
                          fill="none"
                          strokeLinecap="round"
                          markerEnd="url(#roadmap-arrow)"
                        />
                      );
                    })}
                  </svg>
                  {graph.nodes.map((node) => (
                    <div
                      key={node.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: node.x, top: node.y }}
                    >
                      <div
                        className={cn(
                          "w-[180px] rounded-[var(--primitive-radius-md)] border px-[var(--primitive-space-3)] py-[var(--primitive-space-2)] shadow-[var(--primitive-elevation-1)]",
                          roadmapGraphNodeClassName(node),
                        )}
                      >
                        <div className="mb-[var(--primitive-space-1)] flex items-center justify-between gap-[var(--primitive-space-2)]">
                          <span className="inline-flex items-center gap-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--primitive-color-brand-700)]">
                            <CircleDot className="size-3.5" />
                            مرحله {formatCount(node.sequence)}
                          </span>
                          {node.isRoot ? (
                            <span className="rounded-[var(--primitive-radius-full)] border border-[var(--primitive-color-brand-200)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-2)] py-px text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)] text-[var(--primitive-color-brand-700)]">
                              ریشه
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                          {node.courseName}
                        </p>
                        <p className="mt-[var(--primitive-space-1)] truncate text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                          {node.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </T2DetailSkeleton>

      <AppDrawer
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        mode="form"
        title="ویرایش نقشه راه"
        onSubmit={handleEditRoadmap}
        submitLabel="ذخیره"
        submitLoading={editSubmitting}
        submitDisabled={!editName.trim()}
      >
        {editError ? (
          <ErrorState error={editError} className="py-[var(--primitive-space-4)]" />
        ) : null}
        <FormField label="نام" required>
          <TextInput
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </FormField>
      </AppDrawer>
    </>
  );
}
