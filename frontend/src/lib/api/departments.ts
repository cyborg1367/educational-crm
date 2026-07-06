import { fetchJson } from "@/lib/api/client";
import type {
  DepartmentCreate,
  DepartmentRead,
  PaginatedResponse,
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

export function listDepartments(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<DepartmentRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(`/departments${buildQuery({ limit, offset })}`);
}

export function getDepartment(id: number): Promise<DepartmentRead> {
  return fetchJson<DepartmentRead>(`/departments/${id}`);
}

export function createDepartment(
  body: DepartmentCreate,
): Promise<DepartmentRead> {
  return fetchJson<DepartmentRead>("/departments", { method: "POST", body });
}
