"use client";

import * as React from "react";

import { Select } from "@/components/form/select";
import {
  AppShell,
  CommandPalette,
  useCommandPaletteShortcut,
} from "@/components/layout";
import {
  getCommandPaletteItemsForRole,
  getNavTreeForRole,
  type UserRole,
} from "@/lib/nav";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "مدیر (Admin)" },
  { value: "admission", label: "پذیرش (Admission)" },
  { value: "finance", label: "مالی (Finance)" },
  { value: "teacher", label: "مدرس (Teacher)" },
  { value: "department_manager", label: "مدیر دپارتمان (Department Manager)" },
];

export type SkeletonDemoShellProps = {
  title: string;
  description: string;
  zones?: string;
  children: React.ReactNode;
  showRoleSwitcher?: boolean;
};

function SkeletonDemoShell({
  title,
  description,
  zones,
  children,
  showRoleSwitcher = true,
}: SkeletonDemoShellProps) {
  const [role, setRole] = React.useState<UserRole>("admin");
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  const navTree = getNavTreeForRole(role);
  const paletteItems = getCommandPaletteItemsForRole(role);

  useCommandPaletteShortcut(() => setPaletteOpen(true));

  return (
    <AppShell
      navTree={navTree}
      onOpenCommandPalette={() => setPaletteOpen(true)}
      brand={
        <span className="text-[length:var(--primitive-font-size-base)] font-[var(--primitive-font-weight-semibold)]">
          F08 — اسکلت صفحات
        </span>
      }
      topbarEnd={
        showRoleSwitcher ? (
          <div className="w-44">
            <Select
              aria-label="نقش کاربر"
              options={ROLE_OPTIONS}
              value={role}
              onChange={(value) => setRole(value as UserRole)}
            />
          </div>
        ) : null
      }
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-[var(--semantic-space-sectionGap)] p-[var(--semantic-space-pageMargin)]">
        <header>
          <h1 className="text-[length:var(--primitive-font-size-2xl)] font-[var(--primitive-font-weight-semibold)] text-[var(--semantic-color-text-primary)]">
            {title}
          </h1>
          <p className="mt-[var(--primitive-space-2)] text-[length:var(--primitive-font-size-sm)] text-[var(--semantic-color-text-secondary)]">
            {description}
          </p>
          {zones ? (
            <p className="mt-[var(--primitive-space-1)] text-[length:var(--primitive-font-size-xs)] text-[var(--semantic-color-text-disabled)]">
              مناطق: {zones}
            </p>
          ) : null}
        </header>

        {children}
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={paletteItems}
      />
    </AppShell>
  );
}

export { SkeletonDemoShell, ROLE_OPTIONS };
