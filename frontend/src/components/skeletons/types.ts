import type * as React from "react";

export type PageZoneName =
  | "Header"
  | "Primary"
  | "Secondary"
  | "Action-bar"
  | "Filter-bar";

export type DashboardWidget = {
  colSpan: number;
  content: React.ReactNode;
};

export type SettingsNavLink = {
  href: string;
  label: string;
  active?: boolean;
};

export type CalendarViewMode = "month" | "agenda";
