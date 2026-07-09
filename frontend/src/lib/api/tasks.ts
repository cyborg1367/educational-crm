import { fetchJson } from "@/lib/api/client";
import type { PaginatedResponse, TaskRead, TaskStatus, TaskType } from "@/lib/api/types";

const DEFAULT_LIMIT = 200;

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

export type ListTasksParams = {
  limit?: number;
  offset?: number;
  status?: TaskStatus;
  assignee_id?: number;
  type?: TaskType;
};

export function listTasks(
  params: ListTasksParams = {},
): Promise<PaginatedResponse<TaskRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson<PaginatedResponse<TaskRead>>(
    `/tasks${buildQuery({
      limit,
      offset,
      status: params.status,
      assignee_id: params.assignee_id,
      type: params.type,
    })}`,
  );
}

export function updateTask(
  id: number,
  body: { status?: TaskStatus },
): Promise<TaskRead> {
  return fetchJson<TaskRead>(`/tasks/${id}`, { method: "PATCH", body });
}
