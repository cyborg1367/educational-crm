import { fetchJson } from "@/lib/api/client";
import type {
  ConsultationOutcomeUpdate,
  ConsultationRead,
  ConsultationUpdate,
  PaginatedResponse,
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

export function listConsultations(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<ConsultationRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(
    `/consultations${buildQuery({ limit, offset })}`,
  );
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
