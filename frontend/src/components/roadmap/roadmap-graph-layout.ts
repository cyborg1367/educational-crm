import type { CourseRead } from "@/lib/api/types";

const NODE_WIDTH = 170;
const HORIZONTAL_GAP = 200;
const VERTICAL_GAP = 120;

export type LayoutEdge = {
  id: string;
  source: string;
  target: string;
};

export type LayoutNode = {
  id: string;
  x: number;
  y: number;
  course: CourseRead;
  depth: number;
};

export function buildRoadmapLayout(courses: CourseRead[]): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
} {
  if (courses.length === 0) {
    return { nodes: [], edges: [] };
  }

  const courseIds = new Set(courses.map((course) => course.id));
  const courseById = new Map(courses.map((course) => [course.id, course]));

  const edges: LayoutEdge[] = [];
  const inDegree = new Map<number, number>();
  const adjacency = new Map<number, number[]>();

  for (const course of courses) {
    inDegree.set(course.id, 0);
    adjacency.set(course.id, []);
  }

  for (const course of courses) {
    for (const prereqId of course.prerequisite_ids ?? []) {
      if (!courseIds.has(prereqId)) {
        continue;
      }
      edges.push({
        id: `${prereqId}-${course.id}`,
        source: String(prereqId),
        target: String(course.id),
      });
      adjacency.get(prereqId)?.push(course.id);
      inDegree.set(course.id, (inDegree.get(course.id) ?? 0) + 1);
    }
  }

  const roots = courses
    .filter((course) => (inDegree.get(course.id) ?? 0) === 0)
    .map((course) => course.id);

  const depthById = new Map<number, number>();
  const queue = [...roots];
  for (const rootId of roots) {
    depthById.set(rootId, 0);
  }

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentDepth = depthById.get(currentId) ?? 0;
    for (const childId of adjacency.get(currentId) ?? []) {
      const nextDepth = currentDepth + 1;
      const existing = depthById.get(childId);
      if (existing == null || nextDepth > existing) {
        depthById.set(childId, nextDepth);
      }
      queue.push(childId);
    }
  }

  for (const course of courses) {
    if (!depthById.has(course.id)) {
      depthById.set(course.id, 0);
    }
  }

  const levels = new Map<number, number[]>();
  for (const [courseId, depth] of depthById.entries()) {
    const bucket = levels.get(depth) ?? [];
    bucket.push(courseId);
    levels.set(depth, bucket);
  }

  const sortedLevels = [...levels.entries()].sort((a, b) => a[0] - b[0]);
  const maxRowWidth = Math.max(
    ...sortedLevels.map(([, ids]) => ids.length * HORIZONTAL_GAP),
    HORIZONTAL_GAP,
  );

  const nodes: LayoutNode[] = [];
  for (const [depth, ids] of sortedLevels) {
    const sortedIds = [...ids].sort((a, b) => {
      const titleA = courseById.get(a)?.title ?? "";
      const titleB = courseById.get(b)?.title ?? "";
      return titleA.localeCompare(titleB, "fa");
    });
    const rowWidth = sortedIds.length * HORIZONTAL_GAP;
    const offset = (maxRowWidth - rowWidth) / 2;
    sortedIds.forEach((courseId, index) => {
      const course = courseById.get(courseId);
      if (!course) return;
      nodes.push({
        id: String(courseId),
        x: offset + index * HORIZONTAL_GAP,
        y: depth * VERTICAL_GAP,
        course,
        depth,
      });
    });
  }

  return { nodes, edges };
}

export const ROADMAP_NODE_WIDTH = NODE_WIDTH;
