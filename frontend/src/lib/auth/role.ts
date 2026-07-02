import type { UserRole } from "@/lib/nav/types";

const DEV_ROLE = (process.env.NEXT_PUBLIC_DEV_USER_ROLE ?? "admin") as UserRole;

export function getDevUserRole(): UserRole {
  return DEV_ROLE;
}

/** Admission and admin may mutate enrollments/invoices; others are read-only on those screens. */
export function canManageEnrollments(role: UserRole = getDevUserRole()): boolean {
  return role === "admin" || role === "admission";
}

/** Finance and admin may record payments and refunds. */
export function canManageFinance(role: UserRole = getDevUserRole()): boolean {
  return role === "admin" || role === "finance";
}
