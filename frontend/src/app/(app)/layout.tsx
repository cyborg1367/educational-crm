"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import {
  AppShell,
  CommandPalette,
  useCommandPaletteShortcut,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { clearAccessToken, getAccessToken } from "@/lib/api/auth-token";
import { getCommandPaletteItemsForRole, getNavTreeForRole } from "@/lib/nav/role-nav-config";
import type { UserRole } from "@/lib/nav/types";
import { clearCurrentRole, getCurrentRole } from "@/lib/auth/role";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [authChecked, setAuthChecked] = React.useState(false);
  const [role, setRole] = React.useState<UserRole>("admin");

  const navTree = React.useMemo(() => getNavTreeForRole(role), [role]);
  const paletteItems = React.useMemo(
    () => getCommandPaletteItemsForRole(role),
    [role],
  );

  React.useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
      return;
    }
    setRole(getCurrentRole());
    setAuthChecked(true);
  }, [pathname, router]);

  useCommandPaletteShortcut(() => setPaletteOpen(true));

  const handleLogout = () => {
    clearAccessToken();
    clearCurrentRole();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("crm_profile_email");
    }
    router.replace("/login");
  };

  if (!authChecked) {
    return null;
  }

  const hideCommandPaletteButton =
    pathname === "/courses" || pathname?.startsWith("/courses/");

  return (
    <>
      <AppShell
        navTree={navTree}
        onOpenCommandPalette={
          hideCommandPaletteButton ? undefined : () => setPaletteOpen(true)
        }
        topbarEnd={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={cn("gap-[var(--primitive-space-2)]")}
          >
            <LogOut className="size-[var(--primitive-space-4)]" aria-hidden />
            خروج
          </Button>
        }
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
