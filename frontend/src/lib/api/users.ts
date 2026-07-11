import { fetchFormData, fetchJson } from "@/lib/api/client";
import type {
  PaginatedResponse,
  UserCreate,
  UserRead,
} from "@/lib/api/types";

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

export function listUsers(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<UserRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson<PaginatedResponse<UserRead>>(
    `/users${buildQuery({ limit, offset })}`,
  );
}

export function getUser(id: number): Promise<UserRead> {
  return fetchJson<UserRead>(`/users/${id}`);
}

export function getMe(): Promise<UserRead> {
  return fetchJson<UserRead>("/auth/me");
}

export function createUser(body: UserCreate): Promise<UserRead> {
  return fetchJson<UserRead>("/users", { method: "POST", body });
}

export function uploadUserSignature(
  userId: number,
  file: File,
): Promise<UserRead> {
  const formData = new FormData();
  formData.set("file", file);
  return fetchFormData<UserRead>(`/users/${userId}/signature`, formData);
}

export function deleteUserSignature(userId: number): Promise<UserRead> {
  return fetchJson<UserRead>(`/users/${userId}/signature`, {
    method: "DELETE",
  });
}
