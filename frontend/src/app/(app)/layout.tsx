"use client";

import * as React from "react";

import {
  AppShell,
  CommandPalette,
  useCommandPaletteShortcut,
} from "@/components/layout";
import { getCommandPaletteItemsForRole, getNavTreeForRole } from "@/lib/nav/role-nav-config";
import type { UserRole } from "@/lib/nav/types";
import { cn } from "@/lib/utils";

const DEV_ROLE = (process.env.NEXT_PUBLIC_DEV_USER_ROLE ?? "admin") as UserRole;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const navTree = React.useMemo(() => getNavTreeForRole(DEV_ROLE), []);
  const paletteItems = React.useMemo(
    () => getCommandPaletteItemsForRole(DEV_ROLE),
    [],
  );

  useCommandPaletteShortcut(() => setPaletteOpen(true));

  return (
    <>
      <AppShell
        navTree={navTree}
        onOpenCommandPalette={() => setPaletteOpen(true)}
      >
        <div
          className={cn(
            "p-[var(--semantic-space-pageMargin)]",
          )}
        >
          {children}
        </div>
      </AppShell>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={paletteItems}
      />
    </>
  );
}
