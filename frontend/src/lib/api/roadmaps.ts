import { fetchJson } from "@/lib/api/client";
import type {
  PaginatedResponse,
  RoadmapCreate,
  RoadmapItemCreate,
  RoadmapItemRead,
  RoadmapItemUpdate,
  RoadmapRead,
  RoadmapUpdate,
} from "@/lib/api/types";

const DEFAULT_LIMIT = 50;

function buildQuery(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listRoadmaps(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<RoadmapRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(`/roadmaps${buildQuery({ limit, offset })}`);
}

export function getRoadmap(id: number): Promise<RoadmapRead> {
  return fetchJson<RoadmapRead>(`/roadmaps/${id}`);
}

export function createRoadmap(body: RoadmapCreate): Promise<RoadmapRead> {
  return fetchJson<RoadmapRead>("/roadmaps", { method: "POST", body });
}

export function updateRoadmap(
  id: number,
  body: RoadmapUpdate,
): Promise<RoadmapRead> {
  return fetchJson<RoadmapRead>(`/roadmaps/${id}`, { method: "PATCH", body });
}

export function listRoadmapItems(
  roadmapId: number,
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<RoadmapItemRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(
    `/roadmaps/${roadmapId}/items${buildQuery({ limit, offset })}`,
  );
}

export function createRoadmapItem(
  roadmapId: number,
  body: RoadmapItemCreate,
): Promise<RoadmapItemRead> {
  return fetchJson<RoadmapItemRead>(`/roadmaps/${roadmapId}/items`, {
    method: "POST",
    body,
  });
}

export function updateRoadmapItem(
  roadmapId: number,
  itemId: number,
  body: RoadmapItemUpdate,
): Promise<RoadmapItemRead> {
  return fetchJson<RoadmapItemRead>(
    `/roadmaps/${roadmapId}/items/${itemId}`,
    { method: "PATCH", body },
  );
}
