import type {
  CourseClassRead,
  CourseRead,
  EnrollmentRead,
  InstallmentRead,
  InvoiceRead,
  PersonRead,
  UserRead,
} from "@/lib/api/types";

export type InvoiceData = {
  invoice: InvoiceRead;
  installments: InstallmentRead[];
  enrollment: EnrollmentRead;
  person: PersonRead;
  courseClass: CourseClassRead;
  course: CourseRead;
  teacher: UserRead | null;
};
