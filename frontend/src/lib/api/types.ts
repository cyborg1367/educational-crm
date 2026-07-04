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
  | "pre_enroll_unpaid"
  | "post_course_consultation"
  | "dormant_followup"
  | "installment_overdue"
  | "referral"
  | "custom";

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

export type PersonStatus =
  | "prospect"
  | "lead"
  | "student"
  | "dormant"
  | "alumni";

export type PersonRead = {
  id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  status: PersonStatus;
  source: string | null;
  notes: string | null;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type PersonCreate = {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  notes?: string | null;
};

export type PersonUpdate = {
  full_name?: string;
  phone?: string | null;
  email?: string | null;
  status?: PersonStatus;
  source?: string | null;
  notes?: string | null;
};

export type JourneyStatus = "active" | "on_hold" | "completed" | "dropped";

export type JourneyRead = {
  id: number;
  person_id: number;
  department_id: number;
  owner_id: number | null;
  roadmap_id: number | null;
  status: JourneyStatus;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type EnrollmentStatus = "pre_enroll" | "active" | "completed" | "dropped";

export type EnrollmentRead = {
  id: number;
  person_id: number;
  class_id: number;
  consultation_id: number | null;
  journey_id: number | null;
  status: EnrollmentStatus;
  price_snapshot: number;
  discount_snapshot: number;
  final_amount: number;
  start_date: StorageDate | null;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type DepartmentRead = {
  id: number;
  name: string;
  manager_id: number | null;
  is_active: boolean;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type OrganizationRead = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export type CourseRead = {
  id: number;
  department_id: number;
  title: string;
  description: string | null;
  level: string | null;
  current_price: number;
  duration_sessions: number | null;
  is_active: boolean;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type CourseCreate = {
  department_id: number;
  title: string;
  description?: string | null;
  level?: string | null;
  current_price: number;
  duration_sessions?: number | null;
  is_active?: boolean;
};

export type RoadmapRead = {
  id: number;
  department_id: number;
  name: string;
  is_active: boolean;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type RoadmapCreate = {
  department_id: number;
  name: string;
  is_active?: boolean;
};

export type RoadmapUpdate = {
  department_id?: number | null;
  name?: string | null;
  is_active?: boolean | null;
};

export type RoadmapItemRead = {
  id: number;
  roadmap_id: number;
  title: string;
  sequence: number;
  course_id: number | null;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type RoadmapItemCreate = {
  title: string;
  sequence: number;
  course_id?: number | null;
};

export type RoadmapItemUpdate = {
  title?: string | null;
  sequence?: number | null;
  course_id?: number | null;
};

export type DepartmentCreate = {
  name: string;
  manager_id?: number | null;
  is_active?: boolean;
};

export type UserRole =
  | "admin"
  | "admission"
  | "finance"
  | "teacher"
  | "department_manager";

export type UserCreate = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department_id?: number | null;
  is_active?: boolean;
};

export type InvoiceStatus = "open" | "partially_paid" | "paid" | "void";

export type InvoiceRead = {
  id: number;
  enrollment_id: number;
  total_amount: number;
  status: InvoiceStatus;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type InvoiceDetailRead = InvoiceRead & {
  installments: InstallmentRead[];
};

export type InstallmentPlanItem = {
  sequence: number;
  amount: number;
  due_date: StorageDate;
};

export type InvoiceCreate = {
  enrollment_id: number;
  installments: InstallmentPlanItem[];
};

export type PaymentRead = {
  id: number;
  installment_id: number;
  amount: number;
  recorded_by: number;
  payment_date: StorageDate;
  notes: string | null;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type PaymentCreate = {
  installment_id: number;
  amount: number;
  payment_date?: StorageDate | null;
  notes?: string | null;
};

export type RefundRead = {
  id: number;
  payment_id: number;
  amount: number;
  reason: string;
  refunded_by: number;
  refund_date: StorageDate;
  notes: string | null;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type RefundCreate = {
  payment_id: number;
  amount: number;
  reason: string;
  notes?: string | null;
};

export type AttendanceRead = {
  id: number;
  enrollment_id: number;
  session_date: StorageDate;
  present: boolean;
  notes: string | null;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type AttendanceCreate = {
  enrollment_id: number;
  session_date: StorageDate;
  present: boolean;
  notes?: string | null;
};

export type AttendanceUpdate = {
  present?: boolean;
  notes?: string | null;
};

export type ConsultationOutcome =
  | "pre_enroll"
  | "follow_up"
  | "refer_other_dept"
  | "not_suitable"
  | "closed";

export type ConsultationRead = {
  id: number;
  person_id: number;
  department_id: number;
  consultant_id: number;
  journey_id: number | null;
  current_level: string | null;
  need: string | null;
  goal: string | null;
  decision: string | null;
  recommended_course_id: number | null;
  outcome: ConsultationOutcome | null;
  refer_to_department_id: number | null;
  next_action: string | null;
  next_action_date: StorageDate | null;
  notes: string | null;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type ConsultationUpdate = {
  refer_to_department_id?: number | null;
  notes?: string | null;
};

export type ConsultationOutcomeUpdate = {
  outcome: ConsultationOutcome;
  class_id?: number | null;
};

export type UserRead = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department_id: number | null;
  is_active: boolean;
  org_id: number;
  created_at: string;
  updated_at: string;
};

export type EnrollmentCreate = {
  person_id: number;
  class_id: number;
  consultation_id?: number | null;
  journey_id?: number | null;
  discount_snapshot?: number;
  start_date?: StorageDate | null;
  status?: EnrollmentStatus;
};

export type EnrollmentDrop = {
  reason: string;
  notes?: string | null;
};
