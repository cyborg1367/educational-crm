import { fetchJson } from "@/lib/api/client";
import type {
  AttendanceCreate,
  AttendanceRead,
  AttendanceUpdate,
  CourseClassRead,
  CourseClassCreate,
  CourseClassUpdate,
  CourseRead,
  EnrollmentCreate,
  EnrollmentDrop,
  EnrollmentRead,
  InstallmentRead,
  InvoiceCreate,
  InvoiceDetailRead,
  InvoiceRead,
  PaginatedResponse,
  PaymentCreate,
  PaymentRead,
  PersonRead,
  RefundCreate,
  RefundRead,
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

export function getEnrollment(id: number): Promise<EnrollmentRead> {
  return fetchJson<EnrollmentRead>(`/enrollments/${id}`);
}

export function listEnrollments(
  params: {
    status?: EnrollmentRead["status"];
    class_id?: number;
    limit?: number;
    offset?: number;
  } = {},
): Promise<PaginatedResponse<EnrollmentRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(
    `/enrollments${buildQuery({
      limit,
      offset,
      status: params.status,
      class_id: params.class_id,
    })}`,
  );
}

export function createEnrollment(body: EnrollmentCreate): Promise<EnrollmentRead> {
  return fetchJson<EnrollmentRead>("/enrollments", { method: "POST", body });
}

export function dropEnrollment(
  id: number,
  body: EnrollmentDrop,
): Promise<EnrollmentRead> {
  return fetchJson<EnrollmentRead>(`/enrollments/${id}/drop`, {
    method: "PATCH",
    body,
  });
}

export function getPerson(id: number): Promise<PersonRead> {
  return fetchJson<PersonRead>(`/people/${id}`);
}

export function getClass(id: number): Promise<CourseClassRead> {
  return fetchJson<CourseClassRead>(`/classes/${id}`);
}

export function listClasses(
  params: {
    status?: CourseClassRead["status"];
    limit?: number;
    offset?: number;
  } = {},
): Promise<PaginatedResponse<CourseClassRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(
    `/classes${buildQuery({ limit, offset, status: params.status })}`,
  );
}

export function createClass(body: CourseClassCreate): Promise<CourseClassRead> {
  return fetchJson<CourseClassRead>("/classes", { method: "POST", body });
}

export function updateClass(
  id: number,
  body: CourseClassUpdate,
): Promise<CourseClassRead> {
  return fetchJson<CourseClassRead>(`/classes/${id}`, { method: "PATCH", body });
}

export function deleteClass(id: number): Promise<void> {
  return fetchJson<void>(`/classes/${id}`, { method: "DELETE" });
}

export function getCourse(id: number): Promise<CourseRead> {
  return fetchJson<CourseRead>(`/courses/${id}`);
}

export function listInvoices(
  params: { limit?: number; offset?: number; enrollment_id?: number } = {},
): Promise<PaginatedResponse<InvoiceRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(
    `/invoices${buildQuery({
      limit,
      offset,
      enrollment_id: params.enrollment_id,
    })}`,
  );
}

export function getInvoice(id: number): Promise<InvoiceDetailRead> {
  return fetchJson<InvoiceDetailRead>(`/invoices/${id}`);
}

export function createInvoice(body: InvoiceCreate): Promise<InvoiceDetailRead> {
  return fetchJson<InvoiceDetailRead>("/invoices", { method: "POST", body });
}

export function listInstallments(
  invoiceId: number,
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<InstallmentRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(
    `/invoices/${invoiceId}/installments${buildQuery({ limit, offset })}`,
  );
}

export function listAllInstallments(
  params: {
    due_from?: string;
    due_to?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<PaginatedResponse<InstallmentRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(
    `/invoices/installments${buildQuery({
      limit,
      offset,
      due_from: params.due_from,
      due_to: params.due_to,
    })}`,
  );
}

export function listPayments(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<PaymentRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(`/payments${buildQuery({ limit, offset })}`);
}

export function createPayment(body: PaymentCreate): Promise<PaymentRead> {
  return fetchJson<PaymentRead>("/payments", { method: "POST", body });
}

export function listRefunds(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<RefundRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(`/refunds${buildQuery({ limit, offset })}`);
}

export function createRefund(body: RefundCreate): Promise<RefundRead> {
  return fetchJson<RefundRead>("/refunds", { method: "POST", body });
}

export function listAttendances(
  params: {
    enrollment_id?: number;
    limit?: number;
    offset?: number;
  } = {},
): Promise<PaginatedResponse<AttendanceRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(
    `/attendances${buildQuery({
      limit,
      offset,
      enrollment_id: params.enrollment_id,
    })}`,
  );
}

export function createAttendance(body: AttendanceCreate): Promise<AttendanceRead> {
  return fetchJson<AttendanceRead>("/attendances", { method: "POST", body });
}

export function updateAttendance(
  id: number,
  body: AttendanceUpdate,
): Promise<AttendanceRead> {
  return fetchJson<AttendanceRead>(`/attendances/${id}`, {
    method: "PATCH",
    body,
  });
}

export function listTasks(
  params: { limit?: number; offset?: number } = {},
): Promise<PaginatedResponse<import("@/lib/api/types").TaskRead>> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  return fetchJson(`/tasks${buildQuery({ limit, offset })}`);
}
