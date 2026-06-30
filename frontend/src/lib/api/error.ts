/** Backend field-level error contract — docs/frontend/01 §5 */
export type ApiFieldError = {
  detail: string;
  error_code: string;
  field?: string;
  timestamp?: string;
};
