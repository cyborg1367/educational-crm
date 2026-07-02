"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  AppShell,
  CommandPalette,
  useCommandPaletteShortcut,
} from "@/components/layout";
import { getAccessToken } from "@/lib/api/auth-token";
import { getCommandPaletteItemsForRole, getNavTreeForRole } from "@/lib/nav/role-nav-config";
import type { UserRole } from "@/lib/nav/types";
import { cn } from "@/lib/utils";

const DEV_ROLE = (process.env.NEXT_PUBLIC_DEV_USER_ROLE ?? "admin") as UserRole;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [authChecked, setAuthChecked] = React.useState(false);
  const navTree = React.useMemo(() => getNavTreeForRole(DEV_ROLE), []);
  const paletteItems = React.useMemo(
    () => getCommandPaletteItemsForRole(DEV_ROLE),
    [],
  );

  React.useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
      return;
    }
    setAuthChecked(true);
  }, [pathname, router]);

  useCommandPaletteShortcut(() => setPaletteOpen(true));

  if (!authChecked) {
    return null;
  }

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
