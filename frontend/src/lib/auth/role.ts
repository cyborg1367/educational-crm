import type { UserRole } from "@/lib/nav/types";

const ROLE_STORAGE_KEY = "crm_user_role";
const DEV_ROLE = (process.env.NEXT_PUBLIC_DEV_USER_ROLE ?? "admin") as UserRole;

const VALID_ROLES: readonly UserRole[] = [
  "admin",
  "admission",
  "finance",
  "teacher",
  "department_manager",
];

function isUserRole(value: string): value is UserRole {
  return (VALID_ROLES as readonly string[]).includes(value);
}

export function getCurrentRole(): UserRole {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (stored && isUserRole(stored)) {
      return stored;
    }
  }
  return "admin";
}

export function setCurrentRole(role: UserRole): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  }
}

export function clearCurrentRole(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ROLE_STORAGE_KEY);
  }
}

export function getDevUserRole(): UserRole {
  if (typeof window !== "undefined" && window.localStorage.getItem(ROLE_STORAGE_KEY)) {
    return getCurrentRole();
  }
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
