"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DataTable, EntitySummaryCard } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { AppDrawer, ErrorState, useToast } from "@/components/feedback";
import { FormField } from "@/components/form/form-field";
import { TextInput } from "@/components/form/text-input";
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

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formName, setFormName] = React.useState("");
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
      const counts = await Promise.all(
        roadmapsPage.items.map(async (roadmap) => {
          try {
            const res = await listRoadmapItems(roadmap.id, { limit: 1, offset: 0 });
            return [roadmap.id, res.total_count] as const;
          } catch {
            return [roadmap.id, 0] as const;
          }
        }),
      );
      if (!cancelled) {
        setItemCounts(new Map(counts));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roadmapsPage.items]);

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

  const resetForm = () => {
    setFormName("");
    setFormError(null);
    setFieldError(null);
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      return;
    }
    const defaultDepartment = departments.find((dept) => dept.is_active) ?? departments[0];
    if (!defaultDepartment) {
      setFormError({
        detail: "ابتدا یک دپارتمان ایجاد کنید",
        error_code: "VALIDATION_ERROR",
        timestamp: new Date().toISOString(),
      });
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setFieldError(null);
    try {
      const created = await createRoadmap({
        name: formName.trim(),
        department_id: defaultDepartment.id,
      });
      toast({ variant: "success", title: "نقشه راه جدید ثبت شد" });
      setDrawerOpen(false);
      resetForm();
      router.push(`/roadmaps/${created.id}`);
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
            onClick={() => {
              resetForm();
              setDrawerOpen(true);
            }}
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
                  meta={`${formatCount(row.item_count)} آیتم`}
                  onClick={() => router.push(`/roadmaps/${row.id}`)}
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
        title="افزودن نقشه راه"
        onSubmit={handleCreate}
        submitLabel="ثبت"
        submitLoading={submitting}
        submitDisabled={!formName.trim()}
      >
        {formError ? (
          <ErrorState error={formError} className="py-[var(--primitive-space-4)]" />
        ) : null}
        <FormField
          label="نام"
          required
          error={fieldError?.field === "name" ? fieldError : null}
        >
          <TextInput
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
        </FormField>
      </AppDrawer>
    </>
  );
}
