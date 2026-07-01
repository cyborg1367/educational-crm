/**
 * When true (default), API client returns mock data instead of hitting the backend.
 * Set NEXT_PUBLIC_USE_MOCK_API=false to enable real endpoint wiring (F09+).
 */
export function shouldUseMockApi(override?: boolean): boolean {
  if (override !== undefined) {
    return override;
  }
  return process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";
