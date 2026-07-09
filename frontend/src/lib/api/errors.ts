import type { ApiError, ApiFieldError } from "@/lib/api/error";
import { ApiRequestError } from "@/lib/api/client";

export function toApiError(err: unknown, fallbackDetail = "خطای ناشناخته"): ApiError {
  if (err instanceof ApiRequestError && err.body) {
    return err.body;
  }
  return {
    detail: err instanceof Error ? err.message : fallbackDetail,
    error_code: "NOT_FOUND",
    timestamp: new Date().toISOString(),
  };
}

export function fieldErrorFromApi(err: unknown): ApiFieldError | null {
  if (err instanceof ApiRequestError && err.body?.error_code === "VALIDATION_ERROR") {
    return err.body as ApiFieldError;
  }
  return null;
}
