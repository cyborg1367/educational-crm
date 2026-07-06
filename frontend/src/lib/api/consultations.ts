import { fetchJson } from "@/lib/api/client";
import type {
  ConsultationCreate,
  ConsultationOutcomeUpdate,
  ConsultationRead,
  ConsultationUpdate,
  PaginatedResponse,
} from "@/lib/api/types";

const DEFAULT_LIMIT = 200;

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

export type ListConsultationsParams = {
  limit?: number;
  offset?: number;
  consultant_id?: number;
  department_id?: number;
  pending?: boolean;
};

export function listConsultations(
  params: ListConsultationsParams = {},
): Promise<PaginatedResponse<ConsultationRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(
    `/consultations${buildQuery({
      limit,
      offset,
      consultant_id: params.consultant_id,
      department_id: params.department_id,
      pending: params.pending,
    })}`,
  );
}

export function createConsultation(
  body: ConsultationCreate,
): Promise<ConsultationRead> {
  return fetchJson<ConsultationRead>("/consultations", {
    method: "POST",
    body,
  });
}

export function getConsultation(id: number): Promise<ConsultationRead> {
  return fetchJson<ConsultationRead>(`/consultations/${id}`);
}

export function updateConsultation(
  id: number,
  body: ConsultationUpdate,
): Promise<ConsultationRead> {
  return fetchJson<ConsultationRead>(`/consultations/${id}`, {
    method: "PATCH",
    body,
  });
}

export function setConsultationOutcome(
  id: number,
  body: ConsultationOutcomeUpdate,
): Promise<ConsultationRead> {
  return fetchJson<ConsultationRead>(`/consultations/${id}/outcome`, {
    method: "PATCH",
    body,
  });
}
