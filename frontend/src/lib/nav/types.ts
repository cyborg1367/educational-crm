import type { LucideIcon } from "lucide-react";

/** Backend `UserRole` values — single source for nav composition. */
export type UserRole =
  | "admin"
  | "admission"
  | "finance"
  | "teacher"
  | "department_manager";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  /** Optional keywords for CommandPalette structured search. */
  keywords?: string[];
};

export type NavGroup = {
  id: string;
  /** Omit for unlabeled primary sections (e.g. daily-driver items). */
  label?: string;
  items: NavItem[];
};

/** Role-composed sidebar structure consumed by AppShell. */
export type NavTree = NavGroup[];

export type CommandPaletteItem = {
  id: string;
  label: string;
  href: string;
  group?: string;
  keywords?: string[];
};
