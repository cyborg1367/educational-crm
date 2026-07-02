import { fetchJson } from "@/lib/api/client";
import type { PaginatedResponse, UserRead } from "@/lib/api/types";

const DEFAULT_LIMIT = 200;

export function listUsers(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<UserRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson<PaginatedResponse<UserRead>>(
    `/users?limit=${limit}&offset=${offset}`,
  );
}
