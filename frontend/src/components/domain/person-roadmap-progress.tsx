"use client";

import * as React from "react";
import { AlertTriangle, CircleDot, GitBranchPlus, Map as MapIcon } from "lucide-react";

import { FormDialog } from "@/components/domain/form-dialog";
import { ErrorState, useToast } from "@/components/feedback";
import { BlockSkeleton } from "@/components/feedback/skeleton";
import { FormField } from "@/components/form/form-field";
import { TextInput } from "@/components/form/text-input";
import { Button } from "@/components/ui/button";
import { listCourses } from "@/lib/api/courses";
import type { ApiError } from "@/lib/api/error";
import { toApiError } from "@/lib/api/errors";
import {
  createPersonJourneyWaiver,
  deletePersonJourneyWaiver,
  getPersonRoadmapProgress,
} from "@/lib/api/people";
import type {
  CourseRead,
  PersonJourneyProgress,
  PersonRoadmapProgressRead,
  RoadmapStepProgress,
} from "@/lib/api/types";
import {
  buildRoadmapPrerequisiteGraph,
  roadmapGraphNodeClassName,
  roadmapStepStatusClassName,
  roadmapStepStatusLabel,
} from "@/lib/roadmap/graph";
import { cn } from "@/lib/utils";

export type PersonRoadmapProgressProps = {
  personId: number;
  onProgressLoaded?: (progress: PersonRoadmapProgressRead | null) => void;
};

function StepStatusBadge({ step }: { step: RoadmapStepProgress }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--primitive-radius-full)] border px-[var(--primitive-space-2)] py-[var(--primitive-space-1)]",
        "text-[length:var(--primitive-font-size-xs)] font-[var(--primitive-font-weight-medium)]",
        roadmapStepStatusClassName(step.status),
      )}
    >
      {roadmapStepStatusLabel(step.status)}
    </span>
  );
}

function PersonRoadmapProgress({
  personId,
  onProgressLoaded,
}: PersonRoadmapProgressProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [progress, setProgress] = React.useState<PersonRoadmapProgressRead | null>(
    null,
  );
  const [selectedJourneyId, setSelectedJourneyId] = React.useState<number | null>(
    null,
  );
  const [coursesById, setCoursesById] = React.useState(
    () => new Map<number, CourseRead>(),
  );
  const [waiveItemId, setWaiveItemId] = React.useState<number | null>(null);
  const [waiveReason, setWaiveReason] = React.useState("");
  const [waiveSubmitting, setWaiveSubmitting] = React.useState(false);
  const [waiveError, setWaiveError] = React.useState<ApiError | null>(null);
  const [actionItemId, setActionItemId] = React.useState<number | null>(null);

  const loadProgress = React.useCallback(
    async (journeyId?: number | null) => {
      setLoading(true);
      setError(null);
      try {
        const [progressRes, coursesRes] = await Promise.all([
          getPersonRoadmapProgress(personId, {
            journeyId: journeyId ?? undefined,
          }),
          listCourses({ limit: 500 }),
        ]);
        setProgress(progressRes);
        setCoursesById(
          new Map(coursesRes.items.map((course) => [course.id, course])),
        );
        setSelectedJourneyId(
          journeyId ?? progressRes.selected_journey_id ?? null,
        );
        onProgressLoaded?.(progressRes);
      } catch (err) {
        const apiError = toApiError(err, "خطا در بارگذاری نقشه راه");
        setError(apiError);
        onProgressLoaded?.(null);
      } finally {
        setLoading(false);
      }
    },
    [personId, onProgressLoaded],
  );

  React.useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const selectedJourney = React.useMemo((): PersonJourneyProgress | null => {
    if (!progress || progress.journeys.length === 0) {
      return null;
    }
    if (selectedJourneyId != null) {
      return (
        progress.journeys.find((journey) => journey.journey_id === selectedJourneyId) ??
        progress.journeys[0]!
      );
    }
    return progress.journeys[0]!;
  }, [progress, selectedJourneyId]);

  const graph = React.useMemo(() => {
    if (!selectedJourney) {
      return null;
    }
    const graphRows = selectedJourney.steps.map((step) => ({
      id: step.item_id,
      sequence: step.sequence,
      title: step.title,
      course_id: step.course_id,
      course_name: step.course_title ?? "—",
    }));
    const stepStatusByItemId = new Map(
      selectedJourney.steps.map((step) => [step.item_id, step.status]),
    );
    return buildRoadmapPrerequisiteGraph(graphRows, coursesById, {
      stepStatusByItemId,
      currentItemId: selectedJourney.current_item_id,
      currentItemIds: selectedJourney.current_item_ids,
    });
  }, [selectedJourney, coursesById]);

  const currentItemIds = React.useMemo(
    () =>
      selectedJourney?.current_item_ids?.length
        ? selectedJourney.current_item_ids
        : selectedJourney?.current_item_id != null
          ? [selectedJourney.current_item_id]
          : [],
    [selectedJourney],
  );
  const currentItemIdSet = React.useMemo(
    () => new Set(currentItemIds),
    [currentItemIds],
  );

  const currentSteps = React.useMemo(() => {
    if (!selectedJourney || currentItemIds.length === 0) {
      return [];
    }
    return selectedJourney.steps.filter((step) =>
      currentItemIdSet.has(step.item_id),
    );
  }, [selectedJourney, currentItemIds, currentItemIdSet]);

  const currentStep = currentSteps[0] ?? null;

  const waiveTargetStep = React.useMemo(() => {
    if (!selectedJourney || waiveItemId == null) {
      return null;
    }
    return (
      selectedJourney.steps.find((step) => step.item_id === waiveItemId) ?? null
    );
  }, [selectedJourney, waiveItemId]);

  const gapItemSet = React.useMemo(
    () => new Set(selectedJourney?.gap_item_ids ?? []),
    [selectedJourney],
  );

  const handleCreateWaiver = async () => {
    if (!selectedJourney || waiveItemId == null || waiveReason.trim().length < 3) {
      return;
    }
    setWaiveSubmitting(true);
    setWaiveError(null);
    try {
      await createPersonJourneyWaiver(personId, selectedJourney.journey_id, {
        roadmap_item_id: waiveItemId,
        reason: waiveReason.trim(),
      });
      toast({ variant: "success", title: "مرحله معاف شد" });
      setWaiveItemId(null);
      setWaiveReason("");
      await loadProgress(selectedJourney.journey_id);
    } catch (err) {
      setWaiveError(toApiError(err, "خطا در معاف‌سازی مرحله"));
    } finally {
      setWaiveSubmitting(false);
    }
  };

  const handleRemoveWaiver = async (step: RoadmapStepProgress) => {
    if (!selectedJourney || step.waiver_id == null) {
      return;
    }
    setActionItemId(step.item_id);
    try {
      await deletePersonJourneyWaiver(
        personId,
        selectedJourney.journey_id,
        step.waiver_id,
      );
      toast({ variant: "success", title: "معافیت لغو شد" });
      await loadProgress(selectedJourney.journey_id);
    } catch (err) {
      toast({
        variant: "error",
        title: toApiError(err, "خطا در لغو معافیت").detail,
      });
    } finally {
      setActionItemId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-[var(--primitive-space-4)]">
        <BlockSkeleton height="88px" width="100%" />
        <BlockSkeleton height="240px" width="100%" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!progress || progress.journeys.length === 0) {
    return (
      <div className="rounded-[var(--primitive-radius-lg)] border border-dashed border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-6)] text-center">
        <MapIcon className="mx-auto mb-[var(--primitive-space-3)] size-8 text-[var(--semantic-color-text-disabled)]" />
        <p className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
          نقشه راهی برای این فرد ثبت نشده است
        </p>
        <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
          پس از ایجاد سفر و اتصال به نقشه راه دپارتمان، مسیر یادگیری اینجا نمایش داده می‌شود.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--primitive-space-4)]">
      {progress.journeys.length > 1 ? (
        <div className="flex flex-wrap gap-[var(--primitive-space-2)]">
          {progress.journeys.map((journey) => (
            <Button
              key={journey.journey_id}
              type="button"
              size="sm"
              variant={
                selectedJourney?.journey_id === journey.journey_id
                  ? "primary"
                  : "secondary"
              }
              onClick={() => {
                setSelectedJourneyId(journey.journey_id);
                void loadProgress(journey.journey_id);
              }}
            >
              {journey.department_name}
            </Button>
          ))}
        </div>
      ) : null}

      {selectedJourney ? (
        <>
          {selectedJourney.has_path_gap ? (
            <div className="flex gap-[var(--primitive-space-3)] rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-status-warning)]/35 bg-[var(--semantic-color-status-warning)]/8 px-[var(--primitive-space-4)] py-[var(--primitive-space-3)]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--semantic-color-status-warning)]" />
              <div className="min-w-0">
                <p className="text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                  این فرد از وسط مسیر وارد شده است
                </p>
                <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                  {selectedJourney.gap_item_ids.length} مرحله قبل از ثبت‌نام فعلی نه
                  تکمیل‌شده‌اند و نه معاف. برای تمیز شدن مسیر، مراحل شکاف را معاف کنید یا
                  تاریخچه واقعی enrollment ثبت کنید.
                </p>
              </div>
            </div>
          ) : null}

          <section className="rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)] bg-gradient-to-l from-[var(--primitive-color-brand-50)]/60 to-[var(--semantic-color-surface-card)] p-[var(--primitive-space-4)] shadow-[var(--primitive-elevation-1)]">
            <div className="flex flex-wrap items-start justify-between gap-[var(--primitive-space-3)]">
              <div>
                <p className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                  {selectedJourney.roadmap_name}
                </p>
                <h3 className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-lg)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
                  {currentSteps.length > 1
                    ? `${currentSteps.length} مرحله جاری`
                    : (currentStep?.course_title ??
                      currentStep?.title ??
                      "مرحله بعدی مشخص نیست")}
                </h3>
                <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
                  اعتبار: {selectedJourney.credited_count} از {selectedJourney.total_count}
                  {" · "}
                  تکمیل {selectedJourney.completed_count} / معاف {selectedJourney.waived_count}
                  {currentSteps.length === 1 && currentStep
                    ? ` · ${roadmapStepStatusLabel(currentStep.status)}`
                    : null}
                  {currentSteps.length > 1
                    ? ` · ${currentSteps
                        .map((step) => step.course_title ?? step.title)
                        .join("، ")}`
                    : null}
                </p>
              </div>
              <div className="rounded-[var(--primitive-radius-md)] border border-[var(--primitive-color-brand-200)] bg-[var(--semantic-color-surface-card)] px-[var(--primitive-space-3)] py-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-semibold)] text-[var(--primitive-color-brand-700)]">
                {selectedJourney.credited_count} / {selectedJourney.total_count}
              </div>
            </div>
          </section>

          <section className="rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-4)] shadow-[var(--primitive-elevation-1)]">
            <h3 className="mb-[var(--primitive-space-3)] text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
              مراحل مسیر
            </h3>
            <div className="flex flex-col gap-[var(--primitive-space-2)]">
              {selectedJourney.steps.map((step) => {
                const isGap = gapItemSet.has(step.item_id);
                return (
                  <div
                    key={step.item_id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-[var(--primitive-space-3)] rounded-[var(--primitive-radius-md)] border px-[var(--primitive-space-3)] py-[var(--primitive-space-2)]",
                      currentItemIdSet.has(step.item_id)
                        ? "border-[var(--primitive-color-brand-400)] bg-[var(--primitive-color-brand-50)]/60"
                        : isGap
                          ? "border-[var(--semantic-color-status-warning)]/35 bg-[var(--semantic-color-status-warning)]/6"
                          : "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-page)]",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                        مرحله {step.sequence}
                        {currentItemIdSet.has(step.item_id) ? " · جاری" : null}
                        {isGap ? " · شکاف مسیر" : null}
                      </p>
                      <p className="truncate text-[length:var(--primitive-font-size-sm)] font-[var(--primitive-font-weight-medium)] text-[var(--semantic-color-text-primary)]">
                        {step.course_title ?? step.title}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-[var(--primitive-space-2)]">
                      <StepStatusBadge step={step} />
                      {isGap ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setWaiveItemId(step.item_id);
                            setWaiveReason("");
                            setWaiveError(null);
                          }}
                        >
                          معاف‌سازی
                        </Button>
                      ) : null}
                      {step.status === "waived" && step.waiver_id != null ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={actionItemId === step.item_id}
                          onClick={() => void handleRemoveWaiver(step)}
                        >
                          لغو معافیت
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {graph && graph.nodes.length > 0 ? (
            <section className="rounded-[var(--primitive-radius-lg)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-card)] p-[var(--primitive-space-4)] shadow-[var(--primitive-elevation-1)]">
              <div className="mb-[var(--primitive-space-3)] flex flex-wrap items-center gap-[var(--primitive-space-2)] text-[var(--semantic-color-text-primary)]">
                <GitBranchPlus className="size-4 text-[var(--primitive-color-brand-600)]" />
                <h3 className="text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-semibold)]">
                  نمای گراف
                </h3>
                {graph.rootCount > 0 ? (
                  <span className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                    {graph.rootCount} ریشه
                  </span>
                ) : null}
              </div>
              {graph.externalPrerequisiteCount > 0 ? (
                <p className="mb-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                  {graph.externalPrerequisiteCount} پیش‌نیاز خارج از این نقشه‌راه در گراف
                  نمایش داده نشده است.
                </p>
              ) : null}
              <div className="overflow-x-auto pb-[var(--primitive-space-2)]">
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
                        id="person-roadmap-arrow"
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
                          markerEnd="url(#person-roadmap-arrow)"
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
                            مرحله {node.sequence}
                          </span>
                          <span className="inline-flex items-center gap-[var(--primitive-space-1)]">
                            {node.isRoot ? (
                              <span className="rounded-full bg-[var(--primitive-color-brand-100)] px-[var(--primitive-space-2)] py-0.5 text-[length:var(--primitive-font-size-xs)] text-[var(--primitive-color-brand-800)]">
                                ریشه
                              </span>
                            ) : null}
                            {node.status ? (
                              <span className="text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-secondary)]">
                                {roadmapStepStatusLabel(node.status)}
                              </span>
                            ) : null}
                          </span>
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
            </section>
          ) : null}
        </>
      ) : null}

      <FormDialog
        open={waiveItemId != null}
        onOpenChange={(open) => {
          if (!open) {
            setWaiveItemId(null);
            setWaiveReason("");
            setWaiveError(null);
          }
        }}
        title="معاف‌سازی مرحله"
        description="این مرحله به‌عنوان جایابی/دانش قبلی ثبت می‌شود و پیش‌نیازهای بعدی را باز می‌کند."
        onSubmit={() => void handleCreateWaiver()}
        submitLabel="ثبت معافیت"
        submitLoading={waiveSubmitting}
        submitDisabled={waiveReason.trim().length < 3}
        formError={waiveError}
      >
        <div className="flex flex-col gap-[var(--primitive-space-4)]">
          <p className="rounded-[var(--primitive-radius-md)] border border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)] px-[var(--primitive-space-3)] py-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            {waiveTargetStep
              ? `مرحله ${waiveTargetStep.sequence}: ${waiveTargetStep.course_title ?? waiveTargetStep.title}`
              : "مرحله انتخاب نشده"}
          </p>
          <FormField label="دلیل معاف‌سازی" required>
            <TextInput
              value={waiveReason}
              onChange={(event) => setWaiveReason(event.target.value)}
              placeholder="مثلاً: دانش قبلی در مصاحبه تأیید شد"
            />
          </FormField>
        </div>
      </FormDialog>
    </div>
  );
}

export { PersonRoadmapProgress };

export function getPersonRoadmapSidebarSummary(
  progress: PersonRoadmapProgressRead | null,
): { title: string; subtitle: string } | null {
  if (!progress || progress.journeys.length === 0) {
    return null;
  }
  const journey =
    progress.journeys.find(
      (item) => item.journey_id === progress.selected_journey_id,
    ) ?? progress.journeys[0]!;
  const currentIds =
    journey.current_item_ids?.length
      ? journey.current_item_ids
      : journey.current_item_id != null
        ? [journey.current_item_id]
        : [];
  const currentSteps = journey.steps.filter((step) =>
    currentIds.includes(step.item_id),
  );
  if (journey.has_path_gap) {
    return {
      title: journey.roadmap_name,
      subtitle: `شکاف مسیر · ${journey.gap_item_ids.length} مرحله بدون اعتبار`,
    };
  }
  if (currentSteps.length > 1) {
    return {
      title: journey.roadmap_name,
      subtitle: `${currentSteps.length} مرحله جاری · اعتبار ${journey.credited_count}/${journey.total_count}`,
    };
  }
  const currentStep = currentSteps[0] ?? null;
  return {
    title: journey.roadmap_name,
    subtitle: currentStep
      ? `${currentStep.course_title ?? currentStep.title} · ${roadmapStepStatusLabel(currentStep.status)}`
      : `اعتبار ${journey.credited_count} از ${journey.total_count}`,
  };
}
