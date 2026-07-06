import type { DepartmentRead, PersonInterest } from "@/lib/api/types";

/** Canonical institute departments — fixed catalog. */
export const INSTITUTE_DEPARTMENT_NAMES = [
  "دپارتمان فناوری و اطلاعات",
  "دپارتمان هوش مصنوعی",
  "دپارتمان زبان کودکان",
  "دپارتمان زبان بزرگسال",
  "دپارتمان علوم مالی",
] as const;

export type InstituteDepartmentName = (typeof INSTITUTE_DEPARTMENT_NAMES)[number];

/** Map person interests to institute department names for referral pre-check. */
export const INTEREST_DEPARTMENT_NAMES: Record<
  PersonInterest,
  readonly InstituteDepartmentName[]
> = {
  programming: ["دپارتمان فناوری و اطلاعات"],
  ai: ["دپارتمان هوش مصنوعی"],
  accounting: ["دپارتمان علوم مالی"],
  english: ["دپارتمان زبان کودکان", "دپارتمان زبان بزرگسال"],
  graphic: ["دپارتمان فناوری و اطلاعات"],
  robotics: ["دپارتمان فناوری و اطلاعات", "دپارتمان هوش مصنوعی"],
};

export function instituteDepartmentNamesForInterests(
  interests: PersonInterest[] | null | undefined,
): Set<InstituteDepartmentName> {
  const names = new Set<InstituteDepartmentName>();
  if (!interests?.length) {
    return names;
  }
  for (const interest of interests) {
    for (const name of INTEREST_DEPARTMENT_NAMES[interest] ?? []) {
      names.add(name);
    }
  }
  return names;
}

export function availableInstituteDepartmentNames(
  existingNames: Iterable<string>,
): InstituteDepartmentName[] {
  const existing = new Set(existingNames);
  return INSTITUTE_DEPARTMENT_NAMES.filter((name) => !existing.has(name));
}

export function matchDepartmentsToInterests(
  departments: DepartmentRead[],
  interests: PersonInterest[] | null | undefined,
): Set<number> {
  const matched = new Set<number>();
  const targetNames = instituteDepartmentNamesForInterests(interests);
  if (targetNames.size === 0) {
    return matched;
  }
  for (const department of departments) {
    if (targetNames.has(department.name as InstituteDepartmentName)) {
      matched.add(department.id);
    }
  }
  return matched;
}

export function sortDepartmentsByInstituteCatalog(
  departments: DepartmentRead[],
): DepartmentRead[] {
  const order = new Map(
    INSTITUTE_DEPARTMENT_NAMES.map((name, index) => [name, index]),
  );
  return [...departments].sort((a, b) => {
    const aOrder = order.get(a.name as InstituteDepartmentName) ?? 999;
    const bOrder = order.get(b.name as InstituteDepartmentName) ?? 999;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return a.name.localeCompare(b.name, "fa");
  });
}
