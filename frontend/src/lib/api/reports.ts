import { fetchJson } from "@/lib/api/client";
import type { CollectionRate, EnrollmentTrends, RevenueSummary } from "@/lib/api/types";

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getRevenueReport(year: number): Promise<RevenueSummary> {
  return fetchJson<RevenueSummary>(`/reports/revenue${buildQuery({ year })}`);
}

export function getEnrollmentReport(year: number): Promise<EnrollmentTrends> {
  return fetchJson<EnrollmentTrends>(`/reports/enrollments${buildQuery({ year })}`);
}

export function getCollectionReport(): Promise<CollectionRate> {
  return fetchJson<CollectionRate>("/reports/collection");
}
