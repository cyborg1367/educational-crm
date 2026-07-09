import type { CourseRead, RoadmapStepStatus } from "@/lib/api/types";

export type RoadmapGraphItem = {
  id: number;
  sequence: number;
  title: string;
  course_id: number | null;
  course_name: string;
};

export type RoadmapGraphNode = {
  id: number;
  x: number;
  y: number;
  sequence: number;
  title: string;
  courseName: string;
  courseId: number | null;
  status?: RoadmapStepStatus;
  isCurrent?: boolean;
  isRoot?: boolean;
};

export type RoadmapGraphEdge = {
  fromId: number;
  toId: number;
};

export type RoadmapGraph = {
  nodes: RoadmapGraphNode[];
  edges: RoadmapGraphEdge[];
  width: number;
  height: number;
  externalPrerequisiteCount: number;
  rootCount: number;
};

export function buildRoadmapPrerequisiteGraph(
  rows: RoadmapGraphItem[],
  coursesById: Map<number, CourseRead>,
  options?: {
    stepStatusByItemId?: Map<number, RoadmapStepStatus>;
    currentItemId?: number | null;
    currentItemIds?: number[] | null;
  },
): RoadmapGraph {
  const currentIds = new Set(
    options?.currentItemIds?.length
      ? options.currentItemIds
      : options?.currentItemId != null
        ? [options.currentItemId]
        : [],
  );
  const rowByCourseId = new Map<number, RoadmapGraphItem>();
  for (const row of rows) {
    if (row.course_id != null && !rowByCourseId.has(row.course_id)) {
      rowByCourseId.set(row.course_id, row);
    }
  }

  const edges: RoadmapGraphEdge[] = [];
  const edgeKeys = new Set<string>();
  let externalPrerequisiteCount = 0;

  for (const row of rows) {
    if (row.course_id == null) {
      continue;
    }
    const course = coursesById.get(row.course_id);
    if (!course) {
      continue;
    }
    for (const prerequisiteCourseId of course.prerequisite_course_ids) {
      const prerequisiteRow = rowByCourseId.get(prerequisiteCourseId);
      if (!prerequisiteRow) {
        externalPrerequisiteCount += 1;
        continue;
      }
      const key = `${prerequisiteRow.id}-${row.id}`;
      if (edgeKeys.has(key) || prerequisiteRow.id === row.id) {
        continue;
      }
      edgeKeys.add(key);
      edges.push({ fromId: prerequisiteRow.id, toId: row.id });
    }
  }

  const incomingCount = new Map<number, number>();
  const outgoing = new Map<number, number[]>();
  const levelById = new Map<number, number>();
  for (const row of rows) {
    incomingCount.set(row.id, 0);
    outgoing.set(row.id, []);
    levelById.set(row.id, 0);
  }
  for (const edge of edges) {
    incomingCount.set(edge.toId, (incomingCount.get(edge.toId) ?? 0) + 1);
    outgoing.get(edge.fromId)?.push(edge.toId);
  }

  const queue = rows
    .filter((row) => (incomingCount.get(row.id) ?? 0) === 0)
    .sort((a, b) => a.sequence - b.sequence)
    .map((row) => row.id);
  const rootIds = new Set(queue);
  const visited = new Set<number>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    visited.add(currentId);
    const currentLevel = levelById.get(currentId) ?? 0;
    for (const nextId of outgoing.get(currentId) ?? []) {
      levelById.set(nextId, Math.max(levelById.get(nextId) ?? 0, currentLevel + 1));
      incomingCount.set(nextId, (incomingCount.get(nextId) ?? 0) - 1);
      if ((incomingCount.get(nextId) ?? 0) === 0) {
        queue.push(nextId);
      }
    }
  }

  if (visited.size < rows.length) {
    const unresolved = rows
      .filter((row) => !visited.has(row.id))
      .sort((a, b) => a.sequence - b.sequence);
    unresolved.forEach((row, index) => {
      levelById.set(row.id, index);
    });
  }

  const rowsByLevel = new Map<number, RoadmapGraphItem[]>();
  for (const row of rows) {
    const level = levelById.get(row.id) ?? 0;
    const list = rowsByLevel.get(level) ?? [];
    list.push(row);
    rowsByLevel.set(level, list);
  }
  for (const list of rowsByLevel.values()) {
    list.sort((a, b) => a.sequence - b.sequence);
  }

  const maxLevel = Math.max(0, ...rowsByLevel.keys());
  const maxRowsInLevel = Math.max(
    1,
    ...[...rowsByLevel.values()].map((list) => list.length),
  );

  const width = Math.max(860, (maxLevel + 1) * 240 + 220);
  const height = Math.max(320, maxRowsInLevel * 120 + 120);

  const nodeById = new Map<number, RoadmapGraphNode>();
  for (const [level, list] of [...rowsByLevel.entries()].sort((a, b) => a[0] - b[0])) {
    // Vertically center narrower levels (common when multiple roots fan into one join).
    const levelOffsetY = ((maxRowsInLevel - list.length) * 120) / 2;
    list.forEach((row, index) => {
      const node: RoadmapGraphNode = {
        id: row.id,
        x: 120 + level * 240,
        y: 90 + levelOffsetY + index * 120,
        sequence: row.sequence,
        title: row.title,
        courseName: row.course_name,
        courseId: row.course_id,
        status: options?.stepStatusByItemId?.get(row.id),
        isCurrent: currentIds.has(row.id),
        isRoot: rootIds.has(row.id),
      };
      nodeById.set(row.id, node);
    });
  }

  const nodes = rows
    .map((row) => nodeById.get(row.id)!)
    .filter(Boolean)
    .sort((a, b) => a.sequence - b.sequence);

  return {
    nodes,
    edges,
    width,
    height,
    externalPrerequisiteCount,
    rootCount: rootIds.size,
  };
}

export function roadmapStepStatusLabel(status: RoadmapStepStatus): string {
  switch (status) {
    case "completed":
      return "تکمیل‌شده";
    case "waived":
      return "معاف‌شده";
    case "active":
      return "در حال یادگیری";
    case "pre_enroll":
      return "ثبت‌نام اولیه";
    case "locked":
      return "قفل";
    case "upcoming":
      return "آینده";
    default:
      return status;
  }
}

export function roadmapStepStatusClassName(status: RoadmapStepStatus): string {
  switch (status) {
    case "completed":
      return "border-[var(--semantic-color-status-success)]/40 bg-[var(--semantic-color-status-success)]/8 text-[var(--semantic-color-status-success)]";
    case "waived":
      return "border-[var(--primitive-color-royal-blue,#4169E1)]/35 bg-[color-mix(in_srgb,var(--primitive-color-brand-50)_55%,#eef2ff)] text-[var(--primitive-color-brand-800)]";
    case "active":
    case "pre_enroll":
      return "border-[var(--primitive-color-brand-400)] bg-[var(--primitive-color-brand-50)] text-[var(--primitive-color-brand-700)]";
    case "locked":
      return "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)] text-[var(--semantic-color-text-disabled)]";
    case "upcoming":
      return "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-page)] text-[var(--semantic-color-text-secondary)]";
    default:
      return "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-page)]";
  }
}

export function roadmapGraphNodeClassName(node: RoadmapGraphNode): string {
  if (node.isCurrent) {
    return "border-[var(--primitive-color-brand-500)] bg-[var(--primitive-color-brand-50)] ring-2 ring-[var(--primitive-color-brand-200)]";
  }
  if (node.isRoot) {
    return "border-[var(--primitive-color-brand-300)] bg-[color-mix(in_srgb,var(--primitive-color-brand-50)_70%,white)]";
  }
  if (node.status) {
    switch (node.status) {
      case "completed":
        return "border-[var(--semantic-color-status-success)]/40 bg-[var(--semantic-color-status-success)]/8";
      case "waived":
        return "border-[color-mix(in_srgb,#4169E1_45%,var(--semantic-color-surface-border))] bg-[color-mix(in_srgb,#eef2ff_70%,var(--semantic-color-surface-card))]";
      case "active":
      case "pre_enroll":
        return "border-[var(--primitive-color-brand-400)] bg-[var(--primitive-color-brand-50)]";
      case "locked":
        return "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-subtle)] opacity-70";
      case "upcoming":
        return "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-page)]";
      default:
        break;
    }
  }
  return "border-[var(--semantic-color-surface-border)] bg-[var(--semantic-color-surface-page)]";
}

export function wouldEnrollmentCreatePathGap(
  progress: {
    journeys: Array<{
      steps: Array<{
        course_id: number | null;
        sequence: number;
        status: RoadmapStepStatus;
      }>;
    }>;
  } | null,
  courseId: number,
): boolean {
  if (!progress) {
    return false;
  }
  for (const journey of progress.journeys) {
    const selectedStep = journey.steps.find((step) => step.course_id === courseId);
    if (!selectedStep) {
      continue;
    }
    return journey.steps.some(
      (step) =>
        step.course_id != null &&
        step.sequence < selectedStep.sequence &&
        step.status !== "completed" &&
        step.status !== "waived",
    );
  }
  return false;
}
