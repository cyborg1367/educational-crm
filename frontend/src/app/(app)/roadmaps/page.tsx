"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DataTable, EntitySummaryCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { RoadmapFormDialog } from "@/components/domain/roadmap-form-dialog";
import {
  emptyRoadmapFormState,
  isRoadmapFormValid,
  roadmapFormStateToCreateBody,
  type RoadmapFormState,
} from "@/components/domain/roadmap-form-fields";
import { ErrorState, useToast } from "@/components/feedback";
import { ListPageSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { listDepartments } from "@/lib/api/departments";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import { createRoadmap, listRoadmapItems, listRoadmaps } from "@/lib/api/roadmaps";
import type { DepartmentRead, RoadmapRead } from "@/lib/api/types";
import { formatCount } from "@/lib/locale";

const PAGE_LIMIT = 50;

const emptyPage = <T,>(): PaginatedResponse<T> => ({
  items: [],
  total_count: 0,
  limit: PAGE_LIMIT,
  offset: 0,
  has_more: false,
});

type RoadmapRow = RoadmapRead & { item_count: number };

export default function RoadmapsListPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [roadmapsPage, setRoadmapsPage] =
    React.useState<PaginatedResponse<RoadmapRead>>(emptyPage);
  const [departments, setDepartments] = React.useState<DepartmentRead[]>([]);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formState, setFormState] = React.useState<RoadmapFormState>(
    emptyRoadmapFormState(),
  );
  const [formError, setFormError] = React.useState<ApiError | null>(null);
  const [fieldError, setFieldError] = React.useState<ApiFieldError | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roadmaps, deptRes] = await Promise.all([
        listRoadmaps({ limit: PAGE_LIMIT, offset }),
        listDepartments({ limit: 100 }),
      ]);
      setRoadmapsPage(roadmaps);
      setDepartments(deptRes.items);
    } catch (err) {
      setError(toApiError(err, "خطا در بارگذاری نقشه‌های راه"));
    } finally {
      setLoading(false);
    }
  }, [offset]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const [itemCounts, setItemCounts] = React.useState<Map<number, number>>(
    new Map(),
  );

  React.useEffect(() => {
    if (roadmapsPage.items.length === 0) {
      setItemCounts(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        roadmapsPage.items.map(async (roadmap) => {
          try {
            const items = await listRoadmapItems(roadmap.id, { limit: 1 });
            return [roadmap.id, items.total_count] as const;
          } catch {
            return [roadmap.id, 0] as const;
          }
        }),
      );
      if (!cancelled) {
        setItemCounts(new Map(entries));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roadmapsPage.items]);

  const departmentById = React.useMemo(
    () => new Map(departments.map((department) => [department.id, department.name])),
    [departments],
  );

  const rows: RoadmapRow[] = React.useMemo(
    () =>
      roadmapsPage.items.map((roadmap) => ({
        ...roadmap,
        item_count: itemCounts.get(roadmap.id) ?? 0,
      })),
    [roadmapsPage.items, itemCounts],
  );

  const tableData: PaginatedResponse<RoadmapRow> = {
    ...roadmapsPage,
    items: rows,
  };

  const activeDepartments = React.useMemo(
    () => departments.filter((department) => department.is_active),
    [departments],
  );

  const resetForm = () => {
    setFormState(emptyRoadmapFormState(activeDepartments));
    setFormError(null);
    setFieldError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!isRoadmapFormValid(formState)) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFieldError(null);
    try {
      const created = await createRoadmap(roadmapFormStateToCreateBody(formState));
      toast({
        variant: "success",
        title: "نقشه راه ثبت شد",
        description: "مسیر از دوره‌های فعال دپارتمان همگام می‌شود.",
      });
      setDialogOpen(false);
      resetForm();
      router.push(`/roadmaps/${created.id}?new=1`);
    } catch (err) {
      const validation = fieldErrorFromApi(err);
      if (validation) {
        setFieldError(validation);
      } else {
        setFormError(toApiError(err, "خطا در ثبت نقشه راه"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !loading && roadmapsPage.items.length === 0) {
    return <ErrorState error={error} />;
  }

  return (
    <>
      <ListPageSkeleton
        title="نقشه‌های راه"
        headerAction={
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={activeDepartments.length === 0}
            onClick={openCreateDialog}
          >
            افزودن نقشه راه
          </Button>
        }
        filterBar={<div />}
        table={
          <DataTable
            columns={[
              { key: "name", header: "نام" },
              {
                key: "department_id",
                header: "دپارتمان",
                cell: (row) => departmentById.get(row.department_id) ?? "—",
              },
              {
                key: "item_count",
                header: "تعداد آیتم",
                align: "end",
                cell: (row) => formatCount(row.item_count),
              },
            ]}
            data={tableData}
            loading={loading}
            onPageChange={setOffset}
            onRowClick={(row) => router.push(`/roadmaps/${row.id}`)}
            emptyMessage="نقشه راهی یافت نشد"
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
                نقشه راهی یافت نشد
              </p>
            ) : (
              rows.map((row) => (
                <EntitySummaryCard
                  key={row.id}
                  title={row.name}
                  meta={`${departmentById.get(row.department_id) ?? "—"} · ${formatCount(row.item_count)} آیتم`}
                  onClick={() => router.push(`/roadmaps/${row.id}`)}
                />
              ))
            )}
          </div>
        }
      />

      <RoadmapFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        state={formState}
        onChange={(patch) => setFormState((prev) => ({ ...prev, ...patch }))}
        onSubmit={() => void handleCreate()}
        submitLoading={submitting}
        submitDisabled={!isRoadmapFormValid(formState)}
        departments={departments}
        fieldError={fieldError}
        formError={formError}
      />
    </>
  );
}
