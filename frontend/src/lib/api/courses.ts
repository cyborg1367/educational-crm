import { fetchJson } from "@/lib/api/client";
import type {
  CourseCreate,
  CourseRead,
  PaginatedResponse,
} from "@/lib/api/types";

const DEFAULT_LIMIT = 50;

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
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

export function listCourses(
  params: { is_active?: boolean; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<CourseRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(
    `/courses${buildQuery({
      limit,
      offset,
      is_active: params.is_active,
    })}`,
  );
}

export function getCourse(id: number): Promise<CourseRead> {
  return fetchJson<CourseRead>(`/courses/${id}`);
}

export function createCourse(body: CourseCreate): Promise<CourseRead> {
  return fetchJson<CourseRead>("/courses", { method: "POST", body });
}
