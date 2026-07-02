"use client";

import * as React from "react";
import { useParams } from "next/navigation";

import { DataTable } from "@/components/data-display";
import type { PaginatedResponse } from "@/components/data-display/types";
import { AppDrawer, ErrorState, useToast } from "@/components/feedback";
import { FormField } from "@/components/form/form-field";
import { Select } from "@/components/form/select";
import { TextInput } from "@/components/form/text-input";
import { T2DetailSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { getCourse, listCourses } from "@/lib/api/courses";
import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { fieldErrorFromApi, toApiError } from "@/lib/api/errors";
import {
  createRoadmapItem,
  getRoadmap,
  listRoadmapItems,
  updateRoadmap,
  updateRoadmapItem,
} from "@/lib/api/roadmaps";
import type {
  CourseRead,
  RoadmapItemRead,
  RoadmapRead,
} from "@/lib/api/types";

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
  sequenceDraft: string;
};

export default function RoadmapDetailPage() {
  const params = useParams();
  const roadmapId = Number(params.id);
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [roadmap, setRoadmap] = React.useState<RoadmapRead | null>(null);
  const [itemsPage, setItemsPage] =
    React.useState<PaginatedResponse<RoadmapItemRead>>(emptyPage);
  const [coursesById, setCoursesById] = React.useState<Map<number, CourseRead>>(
    new Map(),
  );
  const [allCourses, setAllCourses] = React.useState<CourseRead[]>([]);

  const [editDrawerOpen, setEditDrawerOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editSubmitting, setEditSubmitting] = React.useState(false);
  const [editError, setEditError] = React.useState<ApiError | null>(null);

  const [itemDrawerOpen, setItemDrawerOpen] = React.useState(false);
  const [itemSubmitting, setItemSubmitting] = React.useState(false);
  const [itemFormTitle, setItemFormTitle] = React.useState("");
  const [itemFormCourseId, setItemFormCourseId] = React.useState("");
  const [itemFormSequence, setItemFormSequence] = React.useState("");
  const [itemFormError, setItemFormError] = React.useState<ApiError | null>(null);
  const [itemFieldError, setItemFieldError] =
    React.useState<ApiFieldError | null>(null);

  const [sequenceDrafts, setSequenceDrafts] = React.useState<
    Record<number, string>
  >({});
  const [savingSequenceId, setSavingSequenceId] = React.useState<number | null>(
    null,
  );

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
      setAllCourses(coursesRes.items);
      setCoursesById(new Map(coursesRes.items.map((course) => [course.id, course])));

      const missingCourseIds = [
        ...new Set(
          itemsRes.items
            .map((item) => item.course_id)
            .filter((id): id is number => id != null),
        ),
      ].filter((id) => !coursesRes.items.some((course) => course.id === id));

      if (missingCourseIds.length > 0) {
        const fetched = await Promise.all(
          missingCourseIds.map((id) => getCourse(id).catch(() => null)),
        );
        const merged = new Map(coursesRes.items.map((course) => [course.id, course]));
        for (const course of fetched) {
          if (course) {
            merged.set(course.id, course);
          }
        }
        setCoursesById(merged);
      }
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
        sequenceDraft:
          sequenceDrafts[item.id] ?? String(item.sequence),
      }));
  }, [itemsPage.items, coursesById, sequenceDrafts]);

  const tableData: PaginatedResponse<ItemRow> = {
    ...itemsPage,
    items: rows,
    total_count: rows.length,
  };

  const resetItemForm = () => {
    const nextSequence =
      rows.length > 0 ? Math.max(...rows.map((row) => row.sequence)) + 1 : 0;
    setItemFormTitle("");
    setItemFormCourseId("");
    setItemFormSequence(String(nextSequence));
    setItemFormError(null);
    setItemFieldError(null);
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

  const handleCreateItem = async () => {
    if (!itemFormTitle.trim()) {
      return;
    }
    setItemSubmitting(true);
    setItemFormError(null);
    setItemFieldError(null);
    try {
      await createRoadmapItem(roadmapId, {
        title: itemFormTitle.trim(),
        sequence: itemFormSequence ? Number(itemFormSequence) : rows.length,
        course_id: itemFormCourseId ? Number(itemFormCourseId) : null,
      });
      toast({ variant: "success", title: "آیتم اضافه شد" });
      setItemDrawerOpen(false);
      resetItemForm();
      void loadData();
    } catch (err) {
      const validation = fieldErrorFromApi(err);
      if (validation) {
        setItemFieldError(validation);
      } else {
        setItemFormError(toApiError(err, "خطا در افزودن آیتم"));
      }
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleSequenceBlur = async (item: ItemRow) => {
    const draft = sequenceDrafts[item.id] ?? String(item.sequence);
    const nextSequence = Number(draft);
    if (!Number.isFinite(nextSequence) || nextSequence < 0) {
      setSequenceDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }
    if (nextSequence === item.sequence) {
      setSequenceDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }
    setSavingSequenceId(item.id);
    try {
      await updateRoadmapItem(roadmapId, item.id, { sequence: nextSequence });
      toast({ variant: "success", title: "ترتیب ذخیره شد" });
      setSequenceDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      void loadData();
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در ذخیره ترتیب").detail,
      });
    } finally {
      setSavingSequenceId(null);
    }
  };

  if (error && !loading) {
    return <ErrorState error={error} />;
  }

  return (
    <>
      <T2DetailSkeleton
        title={loading ? "…" : (roadmap?.name ?? "نقشه راه")}
        headerAction={
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
            ویرایش
          </Button>
        }
      >
        <div className="flex flex-col gap-[var(--primitive-space-4)]">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={loading}
              onClick={() => {
                resetItemForm();
                setItemDrawerOpen(true);
              }}
            >
              افزودن آیتم
            </Button>
          </div>
          <DataTable
            className="[&_td]:py-[var(--primitive-space-2)] [&_th]:py-[var(--primitive-space-2)]"
            columns={[
              {
                key: "sequence",
                header: "ترتیب",
                align: "end",
                cell: (row) => (
                  <TextInput
                    type="number"
                    min={0}
                    value={row.sequenceDraft}
                    disabled={savingSequenceId === row.id}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      setSequenceDrafts((prev) => ({
                        ...prev,
                        [row.id]: event.target.value,
                      }));
                    }}
                    onBlur={() => {
                      void handleSequenceBlur(row);
                    }}
                    className="max-w-[5rem]"
                  />
                ),
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

      <AppDrawer
        open={itemDrawerOpen}
        onOpenChange={setItemDrawerOpen}
        mode="form"
        title="افزودن آیتم"
        onSubmit={handleCreateItem}
        submitLabel="ثبت"
        submitLoading={itemSubmitting}
        submitDisabled={!itemFormTitle.trim()}
      >
        {itemFormError ? (
          <ErrorState
            error={itemFormError}
            className="py-[var(--primitive-space-4)]"
          />
        ) : null}
        <div className="flex flex-col gap-[var(--primitive-space-4)]">
          <FormField
            label="یادداشت"
            required
            error={itemFieldError?.field === "title" ? itemFieldError : null}
          >
            <TextInput
              value={itemFormTitle}
              onChange={(e) => setItemFormTitle(e.target.value)}
            />
          </FormField>
          <FormField
            label="دوره"
            error={itemFieldError?.field === "course_id" ? itemFieldError : null}
          >
            <Select
              options={allCourses.map((course) => ({
                value: String(course.id),
                label: course.title,
              }))}
              value={itemFormCourseId}
              onChange={setItemFormCourseId}
              placeholder="بدون دوره"
            />
          </FormField>
          <FormField
            label="ترتیب"
            error={itemFieldError?.field === "sequence" ? itemFieldError : null}
          >
            <TextInput
              type="number"
              min={0}
              value={itemFormSequence}
              onChange={(e) => setItemFormSequence(e.target.value)}
            />
          </FormField>
        </div>
      </AppDrawer>
    </>
  );
}
