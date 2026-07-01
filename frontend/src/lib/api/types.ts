import type { PaginatedResponse } from "@/components/data-display/types";
import type { StorageDate } from "@/lib/locale/date";

export type { PaginatedResponse };

export type ActivityRead = {
  id: number;
  person_id: number;
  action: string;
  payload: Record<string, unknown> | null;
  actor_id: number | null;
  org_id: number;
  created_at: string;
};

export type CommunicationChannel =
  | "email"
  | "sms"
  | "phone"
  | "in_person"
  | "chat";

export type CommunicationDirection = "inbound" | "outbound";

export type CommunicationRead = {
  id: number;
  person_id: number;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  content: string;
  metadata: Record<string, unknown> | null;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type ClassStatus = "planned" | "active" | "completed" | "cancelled";

export type CourseClassRead = {
  id: number;
  course_id: number;
  teacher_id: number;
  name: string;
  start_date: StorageDate;
  end_date: StorageDate | null;
  status: ClassStatus;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type InstallmentStatus =
  | "pending"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type InstallmentRead = {
  id: number;
  invoice_id: number;
  sequence: number;
  amount: number;
  paid_amount: number;
  due_date: StorageDate;
  status: InstallmentStatus;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type TaskStatus = "open" | "done" | "cancelled";

export type TaskType =
  | "follow_up_registration"
  | "follow_up_payment"
  | "referral"
  | "post_course_review"
  | "dormant_follow_up"
  | "other";

export type TaskRead = {
  id: number;
  person_id: number;
  type: TaskType;
  title: string;
  description: string | null;
  due_date: StorageDate;
  assignee_id: number | null;
  status: TaskStatus;
  related_entity_type: string | null;
  related_entity_id: number | null;
  org_id: number;
  created_at: string;
  completed_at: string | null;
};

export type RevenueMonth = {
  month: string;
  amount: number;
};

export type RevenueCourse = {
  course_id: number;
  course_name: string;
  amount: number;
};

export type RevenueSummary = {
  total_revenue: number;
  by_month: RevenueMonth[];
  by_course: RevenueCourse[];
};

export type EnrollmentMonth = {
  month: string;
  count: number;
};

export type EnrollmentCourse = {
  course_id: number;
  course_name: string;
  count: number;
};

export type EnrollmentTrends = {
  total_enrollments: number;
  by_month: EnrollmentMonth[];
  by_course: EnrollmentCourse[];
};

export type CollectionRate = {
  total_invoiced: number;
  total_paid: number;
  collection_rate_percent: number;
  pending_amount: number;
};
