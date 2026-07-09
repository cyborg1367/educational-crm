/** Backend error contract — docs/frontend/01 §5 */
export type ApiErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "PERMISSION_DENIED"
  | "AUTHENTICATION_ERROR";

export type ApiError = {
  detail: string;
  error_code: ApiErrorCode;
  timestamp: string;
  field?: string;
};

/** Field-level validation errors — use with FormField, not ErrorState */
export type ApiFieldError = ApiError & {
  error_code: "VALIDATION_ERROR";
};
