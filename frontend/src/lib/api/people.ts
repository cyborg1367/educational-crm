import { fetchJson } from "@/lib/api/client";
import type {
  PaginatedResponse,
  PersonCreate,
  PersonRead,
  PersonUpdate,
} from "@/lib/api/types";

const DEFAULT_LIMIT = 50;

export type ListPeopleParams = {
  limit?: number;
  offset?: number;
};

export function listPeople(
  params: ListPeopleParams = {},
): Promise<PaginatedResponse<PersonRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson<PaginatedResponse<PersonRead>>(
    `/people?limit=${limit}&offset=${offset}`,
  );
}

export function getPerson(id: number): Promise<PersonRead> {
  return fetchJson<PersonRead>(`/people/${id}`);
}

export function createPerson(body: PersonCreate): Promise<PersonRead> {
  return fetchJson<PersonRead>("/people", { method: "POST", body });
}

export function updatePerson(
  id: number,
  body: PersonUpdate,
): Promise<PersonRead> {
  return fetchJson<PersonRead>(`/people/${id}`, { method: "PATCH", body });
}

export function listJourneys(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<import("@/lib/api/types").JourneyRead>> {
  const limit = params.limit ?? 200;
  const offset = params.offset ?? 0;
  return fetchJson(`/journeys?limit=${limit}&offset=${offset}`);
}

export function listEnrollments(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<import("@/lib/api/types").EnrollmentRead>> {
  const limit = params.limit ?? 200;
  const offset = params.offset ?? 0;
  return fetchJson(`/enrollments?limit=${limit}&offset=${offset}`);
}

export function listTasks(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<import("@/lib/api/types").TaskRead>> {
  const limit = params.limit ?? 200;
  const offset = params.offset ?? 0;
  return fetchJson(`/tasks?limit=${limit}&offset=${offset}`);
}

export function listClasses(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<import("@/lib/api/types").CourseClassRead>> {
  const limit = params.limit ?? 200;
  const offset = params.offset ?? 0;
  return fetchJson(`/classes?limit=${limit}&offset=${offset}`);
}

export function listDepartments(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<import("@/lib/api/types").DepartmentRead>> {
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;
  return fetchJson(`/departments?limit=${limit}&offset=${offset}`);
}

export function listActivities(
  params: { person_id?: number; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<import("@/lib/api/types").ActivityRead>> {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 200));
  search.set("offset", String(params.offset ?? 0));
  if (params.person_id != null) {
    search.set("person_id", String(params.person_id));
  }
  return fetchJson(`/activities?${search.toString()}`);
}

export function listCommunications(
  params: { person_id?: number; limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<import("@/lib/api/types").CommunicationRead>> {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 200));
  search.set("offset", String(params.offset ?? 0));
  if (params.person_id != null) {
    search.set("person_id", String(params.person_id));
  }
  return fetchJson(`/communications?${search.toString()}`);
}
