"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

import type { CourseRead } from "@/lib/api/types";
import { formatCount, formatToman } from "@/lib/locale";
import { cn } from "@/lib/utils";

import {
  buildRoadmapLayout,
  ROADMAP_NODE_WIDTH,
} from "./roadmap-graph-layout";

export type RoadmapGraphProps = {
  courses: CourseRead[];
  completedCourseIds?: number[];
  enrolledCourseIds?: number[];
  style?: React.CSSProperties;
  className?: string;
};

type CourseNodeData = {
  course: CourseRead;
  completed: boolean;
  enrolled: boolean;
};

function CourseNode({ data }: NodeProps<CourseNodeData>) {
  const { course, completed, enrolled } = data;
  const prereqCount = course.prerequisite_ids?.length ?? 0;
  const isRoot = prereqCount === 0;

  let background = "#EEF2FF";
  let border = "2px solid #4F46E5";
  let badge: React.ReactNode = null;

  if (completed) {
    background = "#F0FDF4";
    border = "2px solid #16A34A";
    badge = (
      <span className="rounded-[var(--primitive-radius-full)] bg-[#16A34A] px-1.5 py-0.5 text-[7px] text-white">
        ✓ تکمیل شده
      </span>
    );
  } else if (enrolled) {
    background = "#FFF3E0";
    border = "2px solid #E87722";
    badge = (
      <span className="rounded-[var(--primitive-radius-full)] bg-[#E87722] px-1.5 py-0.5 text-[7px] text-white">
        در حال یادگیری
      </span>
    );
  } else if (isRoot) {
    background = "#E8F5E9";
    border = "2px solid #2E7D32";
    badge = (
      <span className="rounded-[var(--primitive-radius-full)] bg-[#2E7D32] px-1.5 py-0.5 text-[7px] text-white">
        🚀 شروع
      </span>
    );
  }

  return (
    <>
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div
        style={{
          width: ROADMAP_NODE_WIDTH,
          borderRadius: 12,
          padding: 12,
          background,
          border,
        }}
        className="flex flex-col gap-1"
      >
        {badge}
        <p
          className="line-clamp-2 text-[11px] font-bold text-[#1A1A1A]"
          title={course.title}
        >
          {course.title}
        </p>
        {course.total_hours != null ? (
          <p className="text-[9px] text-[#64748B]">
            {formatCount(course.total_hours)} ساعت
          </p>
        ) : null}
        <p className="text-[9px] text-[#E87722]">
          {formatToman(course.current_price)} تومان
        </p>
        {prereqCount > 0 ? (
          <span className="mt-0.5 inline-flex w-fit rounded-[var(--primitive-radius-full)] bg-[#F1F5F9] px-1.5 py-0.5 text-[7px] text-[#64748B]">
            {formatCount(prereqCount)} پیش‌نیاز
          </span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </>
  );
}

const nodeTypes = { courseNode: CourseNode };

function RoadmapGraph({
  courses,
  completedCourseIds = [],
  enrolledCourseIds = [],
  style,
  className,
}: RoadmapGraphProps) {
  const completedSet = React.useMemo(
    () => new Set(completedCourseIds),
    [completedCourseIds],
  );
  const enrolledSet = React.useMemo(
    () => new Set(enrolledCourseIds),
    [enrolledCourseIds],
  );

  const { nodes, edges } = React.useMemo(() => {
    const layout = buildRoadmapLayout(courses);
    const flowNodes: Node<CourseNodeData>[] = layout.nodes.map((node) => ({
      id: node.id,
      type: "courseNode",
      position: { x: node.x, y: node.y },
      data: {
        course: node.course,
        completed: completedSet.has(node.course.id),
        enrolled: enrolledSet.has(node.course.id),
      },
      draggable: false,
      selectable: true,
    }));
    const flowEdges = layout.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep" as const,
      animated: false,
      style: { stroke: "#94A3B8", strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#94A3B8",
      },
    }));
    return { nodes: flowNodes, edges: flowEdges };
  }, [courses, completedSet, enrolledSet]);

  return (
    <div
      style={style}
      className={cn("h-full w-full", className)}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#E2E8F0" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export { RoadmapGraph };
